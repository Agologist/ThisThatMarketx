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

// Configure X (formerly Twitter) provider with API credentials
const xProvider = new TwitterAuthProvider();

// Add X credentials from environment variables if they exist
if (import.meta.env.VITE_TWITTER_API_KEY && import.meta.env.VITE_TWITTER_API_SECRET) {
  xProvider.setCustomParameters({
    'api_key': import.meta.env.VITE_TWITTER_API_KEY,
    'api_secret_key': import.meta.env.VITE_TWITTER_API_SECRET
  });
}

// Google sign-in function
export const signInWithGoogle = async (): Promise<UserCredential> => {
  return signInWithPopup(auth, googleProvider);
};

/**
 * X (formerly Twitter) authentication strategy that improves user experience:
 * 1. First tries to check for any existing auth state (users already logged in)
 * 2. If already logged in with X, returns the auth data immediately
 * 3. If not logged in, tries popup authentication which is more user-friendly
 * 4. If popup fails or is blocked, falls back to redirect authentication
 */
export const signInWithX = async (): Promise<UserCredential> => {
  // Create a fresh provider each time to avoid caching issues
  const xProvider = new TwitterAuthProvider();
  
  // First check if we already have a user logged in with X (Twitter)
  const currentUser = auth.currentUser;
  if (currentUser) {
    // Check if this user is logged in with X (Twitter)
    const xProviderInfo = currentUser.providerData.find(
      provider => provider.providerId === 'twitter.com'
    );
    
    if (xProviderInfo) {
      console.log("User already authenticated with X");
      
      // Return a promise that resolves with the current user credential
      // We need to format this to match UserCredential structure
      return {
        user: currentUser,
        providerId: 'twitter.com',
        operationType: 'signIn'
      } as UserCredential;
    }
  }
  
  // Configure X provider with parameters for better experience
  xProvider.setCustomParameters({
    // Don't force login prompt
    'force_login': 'false',
    // Include callback URL for better redirect handling
    'oauth_callback': window.location.origin,
    // Add cache-busting parameter
    'state': `auth_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`
  });
  
  // Create a flag to prevent double auth attempts
  let authInProgress = false;
  
  try {
    // First, try popup auth for better user experience
    authInProgress = true;
    return await signInWithPopup(auth, xProvider);
  } catch (error: any) {
    console.log("Popup auth error:", error.code);
    
    // If popup is blocked or closed, try redirect instead
    if (!authInProgress || error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      // Track that we're doing a redirect auth
      localStorage.setItem('auth_redirect_in_progress', 'x');
      
      // Perform redirect auth
      await signInWithRedirect(auth, xProvider);
      
      // This line will not execute as the page will redirect
      return new Promise(() => {});
    }
    
    // If it's another error, throw it
    throw error;
  }
};

// For backward compatibility
export const signInWithTwitter = signInWithX;

// Function to handle authentication redirect result
export const handleRedirectResult = async (): Promise<UserCredential | null> => {
  try {
    // Check if we were in the middle of a redirect authentication
    const redirectProvider = localStorage.getItem('auth_redirect_in_progress');
    
    // Get the redirect result
    const result = await getRedirectResult(auth);
    
    // If we have a result, clear the "in progress" flag
    if (result) {
      localStorage.removeItem('auth_redirect_in_progress');
      console.log("Redirect authentication successful", result.user.providerData[0]?.providerId);
      return result;
    } 
    
    // If we were in the middle of a redirect but didn't get a result,
    // and we're already logged in, construct a result
    else if (redirectProvider && auth.currentUser) {
      // Clear the "in progress" flag
      localStorage.removeItem('auth_redirect_in_progress');
      
      // Handle X provider specially
      let providerIdToCheck = '';
      if (redirectProvider === 'x') {
        // X (formerly Twitter) still uses twitter.com as the provider ID in Firebase
        providerIdToCheck = 'twitter.com';
      } else {
        providerIdToCheck = `${redirectProvider}.com`;
      }
      
      // Check if the current user has the provider we were redirecting for
      const hasProvider = auth.currentUser.providerData.some(
        provider => provider.providerId === providerIdToCheck
      );
      
      if (hasProvider) {
        console.log("User already authenticated after redirect");
        
        // Return a synthetic credential that matches the shape expected
        return {
          user: auth.currentUser,
          providerId: providerIdToCheck,
          operationType: 'signIn'
        } as UserCredential;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Redirect result error:", error);
    // Clear the "in progress" flag on error
    localStorage.removeItem('auth_redirect_in_progress');
    throw error;
  }
};

// Sign out function
export const signOut = async (): Promise<void> => {
  return auth.signOut();
};

export { auth };