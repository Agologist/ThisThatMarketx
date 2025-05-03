import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PollCreator from "@/components/poll/PollCreator";
import ActivePolls from "@/components/poll/ActivePolls";
import { useQuery } from "@tanstack/react-query";
import { Loader2, InfoIcon } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Poll, RaceRecord, UserAchievement, Achievement } from "@shared/schema";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user, isGuest, exitGuestMode } = useAuth();
  
  // Force refresh when component mounts to get the latest polls
  useEffect(() => {
    // Invalidate and refetch all polls data when the component mounts
    queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/polls"] });
  }, []);
  
  const { data: polls = [], isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    // Guest users can still see polls
    enabled: true,
    // Force refetch on mount
    refetchOnMount: true,
    staleTime: 0
  });
  
  // Only fetch user-specific data if not in guest mode
  const { data: userAchievements = [], isLoading: achievementsLoading } = useQuery<(UserAchievement & Achievement)[]>({
    queryKey: ["/api/user/achievements"],
    enabled: !isGuest && !!user
  });
  
  const { data: races = [], isLoading: racesLoading } = useQuery<RaceRecord[]>({
    queryKey: ["/api/user/races"],
    enabled: !isGuest && !!user
  });

  const isLoading = pollsLoading || 
    (!isGuest && (achievementsLoading || racesLoading));
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const welcomeTitle = isGuest 
    ? "Welcome, Guest" 
    : `Welcome back, ${user?.displayName || user?.username}`;
  
  const welcomeSubtitle = isGuest
    ? "Browse challenges and see what others are voting on"
    : "Your creative data dashboard";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {isGuest && (
        <Alert className="max-w-4xl mx-auto mt-4 border-primary/30 bg-primary/5">
          <InfoIcon className="h-4 w-4 text-primary" />
          <AlertTitle>You're browsing as a guest</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Sign in to create challenges, vote, and participate in races.</span>
            <Button 
              variant="outline" 
              className="ml-4 border-primary text-primary"
              onClick={exitGuestMode}
            >
              Sign in or Register
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between mb-8">
            <div>
              <h2 className="font-montserrat font-bold text-3xl">
                {welcomeTitle}
              </h2>
              <p className="text-muted-foreground mt-2">{welcomeSubtitle}</p>
            </div>
            {!isGuest && (
              <div className="mt-4 md:mt-0">
                <button 
                  onClick={() => {
                    // Scroll to the ChallengeCreator section
                    const challengeCreatorElement = document.getElementById("challenge-creator");
                    if (challengeCreatorElement) {
                      challengeCreatorElement.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="btn-gold py-2 px-6 rounded-md flex items-center"
                >
                  <i className="mr-2">+</i>
                  Create Challenge
                </button>
              </div>
            )}
          </div>
          
          {/* Stats cards section removed */}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {!isGuest && <div id="challenge-creator"><PollCreator /></div>}
            <div className={isGuest ? "lg:col-span-2" : ""}>
              <ActivePolls polls={polls} />
            </div>
          </div>
          
          {/* Votes and Wars Race section removed */}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
