import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StatCards from "@/components/dashboard/StatCards";
import PollCreator from "@/components/poll/PollCreator";
import ActivePolls from "@/components/poll/ActivePolls";
import RaceGame from "@/components/game/RaceGame";
import Achievements from "@/components/game/Achievements";
import { useQuery } from "@tanstack/react-query";
import { Loader2, InfoIcon } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, isGuest } = useAuth();
  
  const { data: polls, isLoading: pollsLoading } = useQuery({
    queryKey: ["/api/polls"],
    // Guest users can still see polls
    enabled: true
  });
  
  // Only fetch user-specific data if not in guest mode
  const { data: userAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["/api/user/achievements"],
    enabled: !isGuest && !!user
  });
  
  const { data: races, isLoading: racesLoading } = useQuery({
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
    ? "Browse polls and see what others are voting on"
    : "Your creative data dashboard";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {isGuest && (
        <Alert className="max-w-4xl mx-auto mt-4 border-primary/30 bg-primary/5">
          <InfoIcon className="h-4 w-4 text-primary" />
          <AlertTitle>You're browsing as a guest</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Sign in to create polls, vote, and participate in races.</span>
            <Button asChild variant="outline" className="ml-4 border-primary text-primary">
              <Link href="/auth">Sign in or Register</Link>
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
                  onClick={() => window.location.href = "/polls/new"} 
                  className="btn-gold py-2 px-6 rounded-md flex items-center"
                >
                  <i className="mr-2">+</i>
                  New Poll
                </button>
              </div>
            )}
          </div>
          
          {!isGuest && (
            <StatCards 
              pollCount={polls?.length || 0} 
              raceWins={races?.filter(race => race.won).length || 0}
              achievements={userAchievements?.length || 0}
            />
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {!isGuest && <PollCreator />}
            <div className={isGuest ? "lg:col-span-2" : ""}>
              <ActivePolls polls={polls || []} />
            </div>
          </div>
          
          {!isGuest && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <RaceGame races={races || []} pollId={1} />
              </div>
              <Achievements achievements={userAchievements || []} />
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
