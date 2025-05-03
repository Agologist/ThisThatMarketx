import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, InfoIcon } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ActivePolls from "@/components/poll/ActivePolls";
import PollCreator from "@/components/poll/PollCreator";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Poll } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function ChallengesPage() {
  const { user, isGuest, exitGuestMode } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "my" | "trending">("all");
  
  // Force refresh when component mounts to get the latest polls
  useEffect(() => {
    // Invalidate and refetch all polls data when the component mounts
    queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/polls"] });
  }, []);
  
  // Fetch all polls
  const { data: polls = [], isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    enabled: true,
    // Force refetch on mount
    refetchOnMount: true,
    staleTime: 0
  });
  
  // Fetch user polls (only if authenticated)
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
                  onClick={() => {
                    const createSection = document.getElementById('create-challenge-section');
                    if (createSection) {
                      createSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }} 
                  className="btn-gold py-2 px-6 rounded-md flex items-center"
                >
                  <i className="mr-2">+</i>
                  New Challenge
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left side - Challenge creation and filters */}
            <div className="lg:col-span-1">
              <Card className="bg-card border-primary/30">
                <CardHeader>
                  <CardTitle className="text-xl font-montserrat font-bold">Filter Challenges</CardTitle>
                  <CardDescription>
                    Find challenges that interest you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">All Challenges</TabsTrigger>
                      <TabsTrigger value="my" disabled={isGuest}>My Challenges</TabsTrigger>
                      <TabsTrigger value="trending">Trending</TabsTrigger>
                    </TabsList>
                  
                    <TabsContent value="all" className="mt-0">
                      <ActivePolls polls={polls} />
                    </TabsContent>
                    
                    <TabsContent value="my" className="mt-0">
                      {!isGuest ? (
                        <ActivePolls polls={userPolls} />
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
                      <ActivePolls polls={polls.slice(0, 3)} />
                    </TabsContent>
                  </Tabs>
                  
                  {!isGuest && (
                    <div id="create-challenge-section" className="mt-8">
                      <h3 className="font-medium mb-4">Create New Challenge</h3>
                      <PollCreator />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right side - Challenge listings */}
            <div className="lg:col-span-3">
              {/* Challenge content is now displayed from the Tabs component in the left sidebar */}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}