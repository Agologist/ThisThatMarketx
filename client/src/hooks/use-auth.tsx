import React, { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isGuest: boolean;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
  continueAsGuest: () => void;
  exitGuestMode: () => void;
};

type LoginData = {
  email: string;
  password: string;
};

const registerSchema = insertUserSchema.pick({
  email: true,
  username: true,
  password: true,
  displayName: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isGuest, setIsGuest] = React.useState<boolean>(false);
  
  // Check if URL contains guest parameter
  React.useEffect(() => {
    if (location.includes('?guest=true')) {
      setIsGuest(true);
    }
  }, [location]);
  
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Function to continue as guest
  const continueAsGuest = React.useCallback(() => {
    setIsGuest(true);
    toast({
      title: "Guest Mode Activated",
      description: "You're browsing as a guest. To save your votes and participate in races, please sign up.",
    });
    // Navigate to home with guest parameter
    setLocation("/?guest=true");
  }, [toast, setLocation]);
  
  // Function to exit guest mode and go to auth page
  const exitGuestMode = React.useCallback(() => {
    setIsGuest(false);
    setLocation("/auth");
  }, [setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      setIsGuest(false); // Clear guest mode when logging in
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.displayName || user.username}!`,
      });
      setLocation("/"); // Redirect to home page after login
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      // Remove confirmPassword as it's not part of the backend schema
      const { confirmPassword, ...credentials } = data;
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      setIsGuest(false); // Clear guest mode when registering
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to ThisThat.Market, ${user.displayName || user.username}!`,
      });
      setLocation("/"); // Redirect to home page after registration
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      setIsGuest(false); // Clear guest mode when logging out
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setLocation("/auth"); // Redirect to auth page after logout
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refetch user data when auth state changes
  useEffect(() => {
    if (!isLoading) {
      refetch();
    }
  }, [isGuest, refetch, isLoading]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isGuest,
        continueAsGuest,
        exitGuestMode,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { registerSchema };
