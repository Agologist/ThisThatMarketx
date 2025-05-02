import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, TwitterAuthProvider, signInWithPopup, UserCredential } from "firebase/auth";

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

// Twitter sign-in function
export const signInWithTwitter = async (): Promise<UserCredential> => {
  // Add additional parameters specific to Twitter authentication
  twitterProvider.setCustomParameters({
    // Force re-authentication to avoid token issues
    'force_login': 'true',
    // Pass the callback URL if available in environment
    'oauth_callback': window.location.origin
  });
  
  return signInWithPopup(auth, twitterProvider);
};

// Sign out function
export const signOut = async (): Promise<void> => {
  return auth.signOut();
};

export { auth };