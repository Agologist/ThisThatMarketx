import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requireAuth = true,
}: {
  path: string;
  component: () => React.JSX.Element;
  requireAuth?: boolean;
}) {
  const { user, isLoading, isGuest } = useAuth();
  const [location] = useLocation();
  
  // Also check for guest mode in query parameter for backwards compatibility
  const urlHasGuestParam = location.includes('?guest=true');

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Allow access if logged in or in guest mode
  if (!user && !isGuest && !urlHasGuestParam && requireAuth) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
