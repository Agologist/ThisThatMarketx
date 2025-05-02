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

// Twitter sign-in function with popup
export const signInWithTwitter = async (): Promise<UserCredential> => {
  // Add additional parameters specific to Twitter authentication
  twitterProvider.setCustomParameters({
    // Don't force login if already logged in to Twitter
    'force_login': 'false',
    // Pass the callback URL if available in environment
    'oauth_callback': window.location.origin
  });
  
  try {
    // Try with popup first
    return await signInWithPopup(auth, twitterProvider);
  } catch (error: any) {
    console.log("Popup authentication failed, trying redirect...", error.code);
    // Fallback to redirect for more seamless auth if popup fails
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      signInWithRedirect(auth, twitterProvider);
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