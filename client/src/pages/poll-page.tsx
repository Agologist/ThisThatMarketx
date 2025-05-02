import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, ChevronLeft, CheckIcon, XIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Poll } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function PollPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  
  const { data: poll, isLoading } = useQuery<Poll>({
    queryKey: [`/api/polls/${id}`],
  });
  
  const { data: userVote } = useQuery({
    queryKey: [`/api/polls/${id}/vote`],
    enabled: !!user && !!id,
  });
  
  const hasVoted = !!userVote;
  
  // Calculate poll percentages for display
  const totalVotes = (poll?.optionAVotes || 0) + (poll?.optionBVotes || 0);
  const optionAPercentage = totalVotes ? Math.round((poll?.optionAVotes || 0) / totalVotes * 100) : 0;
  const optionBPercentage = totalVotes ? Math.round((poll?.optionBVotes || 0) / totalVotes * 100) : 0;
  
  // Calculate remaining time
  const getRemainingTime = () => {
    if (!poll?.endTime) return { hours: 0, minutes: 0 };
    
    const now = new Date();
    const end = new Date(poll.endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return { hours: 0, minutes: 0 };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };
  
  const { hours, minutes } = getRemainingTime();
  const isPollActive = hours > 0 || minutes > 0;
  
  const handleVote = async () => {
    if (!selectedOption || !isPollActive || hasVoted) return;
    
    setIsVoting(true);
    
    try {
      await apiRequest("POST", `/api/polls/${id}/vote`, { option: selectedOption });
      
      // Invalidate poll data to refresh
      queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}/vote`] });
      
      toast({
        title: "Vote recorded!",
        description: `You voted for Option ${selectedOption}`,
      });
    } catch (error) {
      toast({
        title: "Vote failed",
        description: "There was an error recording your vote",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  const sharePoll = () => {
    if (navigator.share) {
      navigator.share({
        title: poll?.question || "Check out this poll",
        text: `Vote on "${poll?.question}"`,
        url: window.location.href,
      }).catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Poll link copied to clipboard",
      });
    }
  };
  
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
  
  if (!poll) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="flex mb-4 gap-2">
                <XIcon className="h-8 w-8 text-destructive" />
                <h1 className="text-2xl font-bold">Poll Not Found</h1>
              </div>
              
              <p className="mt-4 text-sm text-muted-foreground">
                The poll you're looking for doesn't exist or has been removed.
              </p>
              
              <Button 
                className="mt-6" 
                variant="outline" 
                onClick={() => navigate("/")}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-8 px-4">
        <div className="container max-w-4xl mx-auto">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Card className="mb-8 border-primary/30">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">{poll.question}</CardTitle>
                  <CardDescription className="mt-2">
                    {isPollActive ? (
                      <span className="flex items-center text-sm">
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2"></circle>
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="16" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            className="poll-timer" 
                            style={{ 
                              strokeDashoffset: 283 * (1 - (hours * 60 + minutes) / (24 * 60))
                            }}
                          ></circle>
                        </svg>
                        <span>
                          {hours > 0 && `${hours}h `}{minutes}m remaining
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-destructive">This poll has ended</span>
                    )}
                  </CardDescription>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={sharePoll}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  className={`border rounded-md overflow-hidden transition-all ${selectedOption === "A" ? "ring-2 ring-primary" : ""} ${!isPollActive || hasVoted ? "pointer-events-none" : "cursor-pointer"}`}
                  onClick={() => isPollActive && !hasVoted && setSelectedOption("A")}
                >
                  {poll.optionAImage ? (
                    <div className="h-48 bg-muted">
                      <img 
                        src={poll.optionAImage} 
                        alt={poll.optionAText} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-muted flex items-center justify-center">
                      <span className="text-4xl text-primary font-racing">A</span>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-montserrat font-bold text-lg">{poll.optionAText}</h3>
                      {hasVoted && userVote?.option === "A" && (
                        <span className="bg-primary/20 text-primary text-xs rounded-full px-2 py-1 font-medium flex items-center">
                          <CheckIcon className="w-3 h-3 mr-1" /> Your vote
                        </span>
                      )}
                    </div>
                    
                    {hasVoted && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{poll.optionAVotes} votes</span>
                          <span className="text-sm font-medium">{optionAPercentage}%</span>
                        </div>
                        <Progress value={optionAPercentage} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div 
                  className={`border rounded-md overflow-hidden transition-all ${selectedOption === "B" ? "ring-2 ring-primary" : ""} ${!isPollActive || hasVoted ? "pointer-events-none" : "cursor-pointer"}`}
                  onClick={() => isPollActive && !hasVoted && setSelectedOption("B")}
                >
                  {poll.optionBImage ? (
                    <div className="h-48 bg-muted">
                      <img 
                        src={poll.optionBImage} 
                        alt={poll.optionBText} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-muted flex items-center justify-center">
                      <span className="text-4xl text-primary font-racing">B</span>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-montserrat font-bold text-lg">{poll.optionBText}</h3>
                      {hasVoted && userVote?.option === "B" && (
                        <span className="bg-primary/20 text-primary text-xs rounded-full px-2 py-1 font-medium flex items-center">
                          <CheckIcon className="w-3 h-3 mr-1" /> Your vote
                        </span>
                      )}
                    </div>
                    
                    {hasVoted && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{poll.optionBVotes} votes</span>
                          <span className="text-sm font-medium">{optionBPercentage}%</span>
                        </div>
                        <Progress value={optionBPercentage} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {isPollActive && !hasVoted && (
                <div className="mt-6 flex justify-center">
                  <Button 
                    className="btn-gold w-full max-w-md" 
                    size="lg"
                    disabled={!selectedOption || isVoting}
                    onClick={handleVote}
                  >
                    {isVoting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recording vote...
                      </>
                    ) : (
                      `Vote for Option ${selectedOption || ""}`
                    )}
                  </Button>
                </div>
              )}
              
              {hasVoted && (
                <div className="mt-6">
                  <Separator className="my-4" />
                  <div className="text-center">
                    <h3 className="font-medium text-xl mb-2">Total Votes: {totalVotes}</h3>
                    <p className="text-muted-foreground">
                      {optionAPercentage > optionBPercentage 
                        ? `Option A is winning by ${optionAPercentage - optionBPercentage}%` 
                        : optionBPercentage > optionAPercentage
                          ? `Option B is winning by ${optionBPercentage - optionAPercentage}%`
                          : "It's a tie!"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="border-t pt-4 flex justify-between">
              <span className="text-sm text-muted-foreground">
                Created {new Date(poll.createdAt).toLocaleDateString()}
              </span>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={sharePoll}
              >
                <Share2 className="mr-1 h-4 w-4" />
                Share
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
