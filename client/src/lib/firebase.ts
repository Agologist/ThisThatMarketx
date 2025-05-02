import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  TwitterAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  UserCredential 
} from "firebase/auth";

// Firebase configuration with environment variables provided as secrets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configure Twitter provider with API credentials
const twitterProvider = new TwitterAuthProvider();

// Add Twitter credentials from environment variables if they exist
if (import.meta.env.VITE_TWITTER_API_KEY && import.meta.env.VITE_TWITTER_API_SECRET) {
  twitterProvider.setCustomParameters({
    'api_key': import.meta.env.VITE_TWITTER_API_KEY,
    'api_secret_key': import.meta.env.VITE_TWITTER_API_SECRET
  });
}

// Google sign-in function
export const signInWithGoogle = async (): Promise<UserCredential> => {
  return signInWithPopup(auth, googleProvider);
};

// Check for an existing Twitter session
const hasTwitterSession = (): boolean => {
  try {
    // Check if we have a cookie indicating active Twitter auth
    return document.cookie.includes('twitter_auth_session=true');
  } catch (e) {
    return false;
  }
};

// Set a Twitter session cookie
const setTwitterSession = () => {
  try {
    // Set a cookie that expires in 1 day
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);
    document.cookie = `twitter_auth_session=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  } catch (e) {
    console.error("Could not set Twitter session cookie", e);
  }
};

// Twitter sign-in function with popup
export const signInWithTwitter = async (): Promise<UserCredential> => {
  // For Twitter, we'll need to modify the provider approach
  // Create a fresh provider each time to avoid caching issues
  const freshTwitterProvider = new TwitterAuthProvider();
  
  // Twitter has special requirements for session persistence
  // Setting specific parameters to prevent re-auth prompts
  freshTwitterProvider.setCustomParameters({
    // Only force login if we don't have an active session
    'force_login': hasTwitterSession() ? 'false' : 'true',
    // Use 'true' to skip email collection which can cause session issues
    'skip_status': 'true',
    // Include the callback URL
    'oauth_callback': window.location.origin,
    // Add a unique value to prevent caching issues
    'state': `twitter_auth_${Date.now()}`,
  });
  
  try {
    // Try with popup first which is more user-friendly
    const result = await signInWithPopup(auth, freshTwitterProvider);
    
    // If successful, remember this Twitter session
    setTwitterSession();
    
    return result;
  } catch (error: any) {
    console.log("Popup authentication failed, trying redirect...", error.code);
    // Fallback to redirect for more seamless auth if popup fails
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      signInWithRedirect(auth, freshTwitterProvider);
      // This will redirect, so we won't return directly
      // The redirect result will be handled elsewhere
      return new Promise(() => {}); // This won't resolve as page will redirect
    }
    throw error; // Re-throw if not a popup issue
  }
};

// Function to handle authentication redirect result
export const handleRedirectResult = async (): Promise<UserCredential | null> => {
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error("Redirect result error:", error);
    throw error;
  }
};

// Sign out function
export const signOut = async (): Promise<void> => {
  return auth.signOut();
};

export { auth };