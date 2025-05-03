import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

interface UseReplitAuthResponse {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

export function useReplitAuth(): UseReplitAuthResponse {
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false, // Prevent frequent refetches
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    error: error as Error | null,
  };
}

export function loginWithReplit() {
  window.location.href = "/api/auth/replit";
}

export function logoutFromReplit() {
  window.location.href = "/api/auth/logout";
}