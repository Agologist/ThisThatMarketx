import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlagIcon, CheckIcon, TerminalIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { signInWithGoogle, signInWithX, handleRedirectResult } from "@/lib/firebase";
import { loginWithReplit } from "@/hooks/use-replit-auth";
import { useToast } from "@/hooks/use-toast";
import { toast as toastInstance } from "@/hooks/use-toast";
import { FirebaseError } from "firebase/app";

export default function AuthPage() {
  const { user, continueAsGuest, isGuest } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Redirect if already logged in or in guest mode
  useEffect(() => {
    if (user || isGuest) {
      navigate("/");
    }
  }, [user, isGuest, navigate]);
  
  // Handle redirect result when the page loads (for Twitter/Google auth)
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        // Check if we were in a redirect flow
        const wasRedirecting = localStorage.getItem('auth_redirect_in_progress');
        
        if (wasRedirecting) {
          // Show loading message
          toast({
            title: "Completing authentication...",
            description: "Please wait while we complete your sign-in.",
            duration: 3000
          });
        }
        
        // Get the redirect result
        const result = await handleRedirectResult();
        
        // If we have a result from redirect, process it
        if (result && result.user) {
          console.log("Processing redirect result for:", result.user.providerData[0]?.providerId);
          
          // Determine provider - extract root name without '.com'
          const providerId = result.user.providerData[0]?.providerId || '';
          const provider = providerId.includes('twitter') 
            ? 'twitter' 
            : providerId.includes('google')
              ? 'google'
              : 'unknown';
          
          // Call your server to register or login the Firebase user
          const res = await fetch('/api/auth/firebase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: result.user.uid,
              email: result.user.email, // This might be null from Twitter
              displayName: result.user.displayName || result.user.providerData[0]?.displayName || 'Auth User',
              photoURL: result.user.photoURL,
              provider
            }),
          });
          
          if (res.ok) {
            // Success toast
            toast({
              title: "Authentication successful",
              description: `Signed in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
              variant: "default"
            });
            
            // Small delay for the toast to be visible
            setTimeout(() => {
              window.location.href = '/';
            }, 1000);
          } else {
            toast({
              title: "Authentication failed",
              description: "Failed to complete authentication after redirect",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
        // Only show error toast if we were explicitly in a redirect flow
        if (localStorage.getItem('auth_redirect_in_progress')) {
          localStorage.removeItem('auth_redirect_in_progress');
          toast({
            title: "Authentication error",
            description: "There was an error completing your sign-in. Please try again.",
            variant: "destructive"
          });
        }
      }
    };
    
    checkRedirectResult();
  }, [toast, navigate]);
  
  const handleGuestAccess = () => {
    continueAsGuest();
  };

  // Function to handle Google sign-in
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      
      // Call your server to register or login the Firebase user
      const res = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.providerData[0]?.displayName || 'Google User',
          photoURL: result.user.photoURL,
          provider: 'google'
        }),
      });
      
      if (res.ok) {
        window.location.href = '/';
      } else {
        // Try to get detailed error message
        try {
          const errorData = await res.json();
          toast({
            title: "Authentication failed",
            description: errorData.message || "Failed to authenticate with Google",
            variant: "destructive"
          });
        } catch {
          toast({
            title: "Authentication failed",
            description: "Failed to authenticate with Google",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      
      // Check if this is a Firebase error
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/unauthorized-domain') {
          toast({
            title: "Domain not authorized",
            description: "You need to add this domain to your Firebase authorized domains list in the Firebase Console: Authentication > Settings > Authorized domains",
            variant: "destructive",
            duration: 10000
          });
        } else if (error.code === 'auth/popup-closed-by-user') {
          // This is a common error when the user closes the popup, no need for a destructive toast
          toast({
            title: "Authentication cancelled",
            description: "You closed the Google login window",
            variant: "default"
          });
        } else if (error.code === 'auth/operation-not-allowed') {
          toast({
            title: "Google login not enabled",
            description: "Google authentication is not enabled in Firebase. Please enable it in the Firebase console: Authentication > Sign-in method > Google",
            variant: "destructive",
            duration: 10000
          });
        } else {
          toast({
            title: "Authentication failed",
            description: `Failed to authenticate with Google: ${error.message || error.code || 'Unknown error'}`,
            variant: "destructive"
          });
        }
      } else {
        // Handle generic errors
        toast({
          title: "Authentication failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });
      }
    }
  };
  
  // Function to handle X (formerly Twitter) sign-in
  const handleXSignIn = async () => {
    // Show visual loading indicator instead of a toast
    const loadingIndicator = document.getElementById('x-loading');
    try {
      // Show loading state
      if (loadingIndicator) {
        loadingIndicator.style.display = 'inline-flex';
      }
      
      const result = await signInWithX();
      
      // Success - hide loading indicator
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
      
      // Call your server to register or login the Firebase user
      const res = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: result.user.uid,
          email: result.user.email, // This might be null from Twitter
          displayName: result.user.displayName || result.user.providerData[0]?.displayName || 'X User',
          photoURL: result.user.photoURL,
          provider: 'x'
        }),
      });
      
      if (res.ok) {
        window.location.href = '/';
      } else {
        // Try to get detailed error message
        try {
          const errorData = await res.json();
          toast({
            title: "Authentication failed",
            description: errorData.message || "Failed to authenticate with X",
            variant: "destructive"
          });
        } catch {
          toast({
            title: "Authentication failed",
            description: "Failed to authenticate with X",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      // Hide loading indicator
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
      console.error("X sign-in error:", error);
      
      // Check if this is a Firebase error
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/unauthorized-domain') {
          toast({
            title: "Domain not authorized",
            description: "You need to add this domain to your Firebase authorized domains list in the Firebase Console: Authentication > Settings > Authorized domains",
            variant: "destructive",
            duration: 10000
          });
        } else if (error.code === 'auth/popup-closed-by-user') {
          // This is a common error when the user closes the popup, no need for a destructive toast
          toast({
            title: "Authentication cancelled",
            description: "You closed the X login window",
            variant: "default"
          });
        } else if (error.code === 'auth/operation-not-allowed') {
          toast({
            title: "X login not enabled",
            description: "X authentication is not enabled in Firebase. Please enable it in the Firebase console: Authentication > Sign-in method > X (Twitter)",
            variant: "destructive",
            duration: 10000
          });
        } else if (error.code === 'auth/missing-oauth-client-secret' || error.message?.includes('request token')) {
          toast({
            title: "X configuration issue",
            description: "There's an issue with the X API credentials or callback URL configuration. Make sure you've properly configured your X app in both X Developer Portal and Firebase console.",
            variant: "destructive",
            duration: 10000
          });
        } else {
          toast({
            title: "Authentication failed",
            description: `Failed to authenticate with X: ${error.message || error.code || 'Unknown error'}`,
            variant: "destructive"
          });
        }
      } else {
        // Handle generic errors
        toast({
          title: "Authentication failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left side - Auth forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card border-primary/30">
          <CardContent className="pt-6 pb-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-4">
                <FlagIcon className="w-8 h-8" />
              </div>
              <h2 className="font-racing text-primary text-3xl">Votes and Wars</h2>
              <p className="text-muted-foreground mt-2">Your creative poll and battle platform</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <h3 className="text-xl font-bold text-center">Sign In / Sign Up</h3>
              <p className="text-center text-muted-foreground">
                Use your social accounts to sign in quickly and easily
              </p>
            </div>
                
            <Button 
              variant="outline" 
              className="w-full mb-4 h-12 flex items-center justify-center gap-3"
              onClick={handleGoogleSignIn}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#EA4335" d="M5.26 11c0-.67.12-1.31.34-1.9L1.55 6.6C.72 7.97.24 9.57.05 11.26a13 13 0 0 0 0 1.48c.19 1.69.67 3.29 1.5 4.66l4.05-2.5c-.22-.59-.34-1.23-.34-1.9"></path>
                <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.41-3.41A11.75 11.75 0 0 0 12 .07a12.11 12.11 0 0 0-10.45 6.03l4.05 2.5C6.68 6.46 9.07 5.38 12 5.38"></path>
                <path fill="#FBBC05" d="M12 18.62c-2.93 0-5.32-1.08-7.4-3.22l-4.05 2.5a12.11 12.11 0 0 0 10.45 6.03c2.76 0 5.38-.71 7.66-2.06l-3.81-2.93c-1.07.48-2.43.68-3.85.68"></path>
                <path fill="#34A853" d="M23.5 12c0-.57-.05-1.19-.15-1.82H12v3.88h6.47c-.29 1.52-1.16 2.8-2.48 3.67l3.81 2.93c2.24-2.09 3.55-5.17 3.7-8.66"></path>
              </svg>
              Continue with Google
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full mb-4 h-12 flex items-center justify-center gap-3"
              onClick={handleXSignIn}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="fill-current text-black">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="flex items-center">
                Continue with X
                <span id="x-loading" className="ml-2 animate-spin hidden" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                </span>
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full mb-6 h-12 flex items-center justify-center gap-3"
              onClick={() => loginWithReplit()}
            >
              <TerminalIcon className="h-5 w-5 text-[#F26207]" />
              Continue with Replit
            </Button>
                
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative px-4 bg-card text-muted-foreground text-sm">
                or
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full mt-4 text-muted-foreground"
              onClick={handleGuestAccess}
            >
              Continue as Guest
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div className="w-full md:w-1/2 bg-black p-6 md:p-12 flex items-center">
        <div className="max-w-lg mx-auto">
          <h1 className="font-racing text-5xl text-primary mb-6">Votes and Wars</h1>
          <h2 className="text-3xl font-bold mb-6">Creative "This or That" Polls with a Battle Twist</h2>
          
          <div className="space-y-6 text-lg">
            <div className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <p>Create engaging "This or That" polls with automatic image suggestions</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <p>Share your polls via social media and collect votes</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <p>Battle cars in our interactive 2D war game</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <p>Earn achievements and climb the leaderboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}