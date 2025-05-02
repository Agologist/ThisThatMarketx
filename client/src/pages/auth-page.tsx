import { useAuth, registerSchema } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlagIcon, CheckIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  // Login form
  const loginForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Registration form
  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const onLoginSubmit = (data: { email: string; password: string }) => {
    loginMutation.mutate(data);
  };
  
  const onRegisterSubmit = (data: any) => {
    registerMutation.mutate(data);
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left side - Auth forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card border-primary/30">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-2">
                <FlagIcon className="w-6 h-6" />
              </div>
              <h2 className="font-racing text-primary text-2xl">Votes and Wars</h2>
              <p className="text-muted-foreground mt-2">Your creative poll and race platform</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full btn-gold" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
                
                <div className="relative flex items-center justify-center mt-6 mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative px-4 bg-card text-muted-foreground text-sm">
                    Or continue with
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mb-4 flex items-center justify-center gap-2"
                  onClick={() => window.location.href = "/api/auth/google"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#EA4335" d="M5.26 11c0-.67.12-1.31.34-1.9L1.55 6.6C.72 7.97.24 9.57.05 11.26a13 13 0 0 0 0 1.48c.19 1.69.67 3.29 1.5 4.66l4.05-2.5c-.22-.59-.34-1.23-.34-1.9"></path>
                    <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.41-3.41A11.75 11.75 0 0 0 12 .07a12.11 12.11 0 0 0-10.45 6.03l4.05 2.5C6.68 6.46 9.07 5.38 12 5.38"></path>
                    <path fill="#FBBC05" d="M12 18.62c-2.93 0-5.32-1.08-7.4-3.22l-4.05 2.5a12.11 12.11 0 0 0 10.45 6.03c2.76 0 5.38-.71 7.66-2.06l-3.81-2.93c-1.07.48-2.43.68-3.85.68"></path>
                    <path fill="#34A853" d="M23.5 12c0-.57-.05-1.19-.15-1.82H12v3.88h6.47c-.29 1.52-1.16 2.8-2.48 3.67l3.81 2.93c2.24-2.09 3.55-5.17 3.7-8.66"></path>
                  </svg>
                  Sign in with Google
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full mt-4 text-muted-foreground"
                  onClick={() => navigate("/?guest=true")}
                >
                  Continue as Guest
                </Button>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="How you'll be shown to others" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full btn-gold" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? "Creating account..." : "Sign Up"}
                    </Button>
                  </form>
                </Form>
                
                <div className="relative flex items-center justify-center mt-6 mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative px-4 bg-card text-muted-foreground text-sm">
                    Or continue with
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full mb-4 flex items-center justify-center gap-2"
                  onClick={() => window.location.href = "/api/auth/google"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#EA4335" d="M5.26 11c0-.67.12-1.31.34-1.9L1.55 6.6C.72 7.97.24 9.57.05 11.26a13 13 0 0 0 0 1.48c.19 1.69.67 3.29 1.5 4.66l4.05-2.5c-.22-.59-.34-1.23-.34-1.9"></path>
                    <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.41-3.41A11.75 11.75 0 0 0 12 .07a12.11 12.11 0 0 0-10.45 6.03l4.05 2.5C6.68 6.46 9.07 5.38 12 5.38"></path>
                    <path fill="#FBBC05" d="M12 18.62c-2.93 0-5.32-1.08-7.4-3.22l-4.05 2.5a12.11 12.11 0 0 0 10.45 6.03c2.76 0 5.38-.71 7.66-2.06l-3.81-2.93c-1.07.48-2.43.68-3.85.68"></path>
                    <path fill="#34A853" d="M23.5 12c0-.57-.05-1.19-.15-1.82H12v3.88h6.47c-.29 1.52-1.16 2.8-2.48 3.67l3.81 2.93c2.24-2.09 3.55-5.17 3.7-8.66"></path>
                  </svg>
                  Sign up with Google
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Right side - Hero section */}
      <div className="w-full md:w-1/2 bg-black p-6 md:p-12 flex items-center">
        <div className="max-w-lg mx-auto">
          <h1 className="font-racing text-5xl text-primary mb-6">Votes and Wars</h1>
          <h2 className="text-3xl font-bold mb-6">Creative "This or That" Polls with a Racing Twist</h2>
          
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
              <p>Race against time in our interactive 2D racing game</p>
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
