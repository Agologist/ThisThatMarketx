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

// Firebase handles Twitter/X API credentials automatically and securely on the backend
// We should not manually set API keys for X in the frontend code
// Instead, they should be configured in the Firebase console
// Passing these as custom parameters causes the auth/internal-error

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
  
  // Don't set any custom parameters - using stock configuration
  // Custom parameters can sometimes cause issues with X authentication
  console.log("Using default X provider configuration without custom parameters");
  
  // Create a flag to prevent double auth attempts
  let authInProgress = false;
  
  try {
    // First, try popup auth for better user experience
    authInProgress = true;
    
    // Enhanced error logging to track potential issues
    console.log("Beginning X authentication with provider:", xProvider);
    
    // This is where we'll catch most Twitter/X auth errors
    const result = await signInWithPopup(auth, xProvider);
    console.log("X authentication successful with popup");
    return result;
  } catch (error: any) {
    // Log the full error object for better debugging
    console.log("X authentication error:", { code: error.code, message: error.message, fullError: error });
    
    // Check for internal error first (this is often X configuration issues)
    if (error.code === 'auth/internal-error') {
      console.error("X auth internal error - this typically means missing or invalid API credentials in Firebase");
      throw new Error(`X authentication failed due to a configuration issue. Please ensure X is properly configured in the Firebase console. (Error: ${error.message})`);
    }
    
    // If popup is blocked or closed, try redirect instead
    if (!authInProgress || error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.log("Popup was blocked or closed, trying redirect flow");
      // Track that we're doing a redirect auth
      localStorage.setItem('auth_redirect_in_progress', 'x');
      
      try {
        // Perform redirect auth - this will navigate away from the current page
        await signInWithRedirect(auth, xProvider);
        
        // This line will not execute as the page will redirect
        return new Promise(() => {});
      } catch (redirectError: any) {
        console.error("Error during redirect auth:", redirectError);
        throw redirectError;
      }
    }
    
    // If it's another error, throw it with additional context
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`This domain is not authorized for Firebase auth. Add ${window.location.origin} to authorized domains in the Firebase Console.`);
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error("X sign-in is not enabled in Firebase. Enable it in the Firebase Console under Authentication > Sign-in methods.");
    }
    
    // Generic error handling
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