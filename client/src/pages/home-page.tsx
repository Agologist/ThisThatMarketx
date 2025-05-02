import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StatCards from "@/components/dashboard/StatCards";
import PollCreator from "@/components/poll/PollCreator";
import ActivePolls from "@/components/poll/ActivePolls";
import RaceGame from "@/components/game/RaceGame";
import Achievements from "@/components/game/Achievements";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  
  const { data: polls, isLoading: pollsLoading } = useQuery({
    queryKey: ["/api/polls"],
  });
  
  const { data: userAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["/api/user/achievements"],
  });
  
  const { data: races, isLoading: racesLoading } = useQuery({
    queryKey: ["/api/user/races"],
  });

  if (pollsLoading || achievementsLoading || racesLoading) {
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between mb-8">
            <div>
              <h2 className="font-montserrat font-bold text-3xl">
                Welcome back, <span className="text-primary">{user?.displayName || user?.username}</span>
              </h2>
              <p className="text-muted-foreground mt-2">Your creative data dashboard</p>
            </div>
            <div className="mt-4 md:mt-0">
              <button 
                onClick={() => window.location.href = "/polls/new"} 
                className="btn-gold py-2 px-6 rounded-md flex items-center"
              >
                <i className="mr-2">+</i>
                New Poll
              </button>
            </div>
          </div>
          
          <StatCards 
            pollCount={polls?.length || 0} 
            raceWins={races?.filter(race => race.won).length || 0}
            achievements={userAchievements?.length || 0}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <PollCreator />
            <ActivePolls polls={polls || []} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <RaceGame races={races || []} />
            </div>
            <Achievements achievements={userAchievements || []} />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
