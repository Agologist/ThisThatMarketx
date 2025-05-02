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
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Poll } from "@shared/schema";

export default function PollsPage() {
  const { user, isGuest, exitGuestMode } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "my" | "trending">("all");
  
  // Fetch all polls
  const { data: polls = [], isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    enabled: true
  });
  
  // Fetch user polls (only if authenticated)
  const { data: userPolls = [], isLoading: userPollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/user/polls"],
    enabled: !isGuest && !!user
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
            <span>Sign in to create polls, vote, and participate in races.</span>
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
                Poll Collection
              </h2>
              <p className="text-muted-foreground mt-2">Browse, vote, and create fun "This or That" polls</p>
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
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left side - Poll creation and filters */}
            <div className="lg:col-span-1">
              <Card className="bg-card border-primary/30">
                <CardHeader>
                  <CardTitle className="text-xl font-montserrat font-bold">Filter Polls</CardTitle>
                  <CardDescription>
                    Find polls that interest you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">All Polls</TabsTrigger>
                      <TabsTrigger value="my" disabled={isGuest}>My Polls</TabsTrigger>
                      <TabsTrigger value="trending">Trending</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {!isGuest && (
                    <div className="mt-8">
                      <h3 className="font-medium mb-4">Create New Poll</h3>
                      <PollCreator />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right side - Poll listings */}
            <div className="lg:col-span-3">
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
                        <p className="text-muted-foreground mb-4">You need to sign in to see your polls</p>
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
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}