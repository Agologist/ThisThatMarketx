import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, InfoIcon } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ActiveChallenges from "@/components/challenge/ActiveChallenges";
import ChallengeCreator from "@/components/challenge/ChallengeCreator";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Poll } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function ChallengesPage() {
  const { user, isGuest, exitGuestMode } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "my" | "trending">("all");
  
  // Force refresh when component mounts to get the latest challenges
  useEffect(() => {
    // Invalidate and refetch all challenges data when the component mounts
    queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/polls"] });
  }, []);
  
  // Fetch all challenges
  const { data: polls = [], isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    enabled: true,
    // Force refetch on mount
    refetchOnMount: true,
    staleTime: 0
  });
  
  // Fetch user challenges (only if authenticated)
  const { data: userPolls = [], isLoading: userPollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/user/polls"],
    enabled: !isGuest && !!user,
    // Force refetch on mount
    refetchOnMount: true,
    staleTime: 0
  });
  
  // Calculate which loading state to use based on active tab
  const isLoading = activeTab === "all" ? pollsLoading : 
                   activeTab === "my" ? (!isGuest && userPollsLoading) : 
                   pollsLoading;

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
          <div className="flex justify-end mb-8">
            {!isGuest && (
              <div>
                <button 
                  onClick={() => window.location.href = "/challenges/new"} 
                  className="bg-[#FFD700] hover:bg-[#E6C200] text-black font-medium py-2 px-4 rounded-md flex items-center"
                >
                  <span className="mr-2 font-bold">+</span>
                  New Challenge
                </button>
              </div>
            )}
          </div>
          
          <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
              <TabsTrigger value="all">All Challenges</TabsTrigger>
              <TabsTrigger value="my" disabled={isGuest}>My Challenges</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <ActiveChallenges polls={polls} />
            </TabsContent>
            
            <TabsContent value="my" className="mt-0">
              {!isGuest ? (
                <ActiveChallenges polls={userPolls} />
              ) : (
                <Card className="bg-card border-primary/30">
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">You need to sign in to see your challenges</p>
                      <Button 
                        variant="outline" 
                        className="border-primary text-primary"
                        onClick={exitGuestMode}
                      >
                        Sign in
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="trending" className="mt-0">
              <ActiveChallenges polls={polls.slice(0, 3)} />
            </TabsContent>
          </Tabs>
          
          {!isGuest && (
            <div className="mt-8">
              <h3 className="font-medium mb-4">Create New Challenge</h3>
              <ChallengeCreator />
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}