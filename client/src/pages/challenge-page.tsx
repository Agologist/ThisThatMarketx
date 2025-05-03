import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, ChevronLeft, CheckIcon, XIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Poll, RaceRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import RaceGame from "./race-game";

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [showWarGame, setShowWarGame] = useState(false);
  const warGameStartedRef = useRef(false);
  
  const { data: poll, isLoading, refetch: refetchPoll } = useQuery<Poll>({
    queryKey: [`/api/polls/${id}`, forceRefresh],
    staleTime: 0, // Don't use cache
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window is focused
  });
  
  const { data: userVoteData, refetch: refetchVoteData } = useQuery({
    queryKey: [`/api/polls/${id}/vote`, forceRefresh],
    enabled: !!user && !!id,
    staleTime: 0, // Don't use cache
    refetchOnMount: true, // Always refetch on mount
  });
  
  const { data: userRaces } = useQuery<RaceRecord[]>({
    queryKey: [`/api/races`, forceRefresh],
    enabled: !!user && !!poll?.isWar,
  });
  
  const hasVoted = userVoteData?.hasVoted || false;
  const userVoteOption = userVoteData?.option || null;
  
  // Calculate poll percentages for display
  const totalVotes = (poll?.optionAVotes || 0) + (poll?.optionBVotes || 0);
  const optionAPercentage = totalVotes ? Math.round((poll?.optionAVotes || 0) / totalVotes * 100) : 0;
  const optionBPercentage = totalVotes ? Math.round((poll?.optionBVotes || 0) / totalVotes * 100) : 0;
  
  // Calculate remaining time
  const getRemainingTime = () => {
    if (!poll?.endTime) {
      return { hours: 0, minutes: 0, seconds: 0, status: "unknown" };
    }
    
    const now = new Date();
    const end = new Date(poll.endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, status: "ended" };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds, status: "active" };
  };
  
  // Initialize with zeros first and then update when poll data is available
  const [timeState, setTimeState] = useState({ hours: 0, minutes: 0, seconds: 0, status: "unknown" });
  
  // Update time state when poll data is available
  useEffect(() => {
    if (poll?.endTime) {
      setTimeState(getRemainingTime());
    }
  }, [poll?.endTime]);
  
  const { hours, minutes, seconds, status } = timeState;
  const isChallengeActive = status === "active";
  
  // Add a timer update effect
  useEffect(() => {
    if (!isChallengeActive) return;
    
    const intervalId = setInterval(() => {
      const newTime = getRemainingTime();
      setTimeState(newTime);
      
      if (newTime.status === "ended") {
        // Challenge has ended, refresh the challenge data
        queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}`] });
        clearInterval(intervalId);
        
        // If this is a WAR challenge, show the WAR game
        if (poll?.isWar && !warGameStartedRef.current) {
          warGameStartedRef.current = true;
          // Show war game 3 seconds after the challenge ends
          console.log("⚔️ Challenge ended! Starting War game in 3 seconds...");
          setTimeout(() => {
            setShowWarGame(true);
          }, 3000);
        }
      }
    }, 1000); // Update every second
    
    return () => clearInterval(intervalId);
  }, [isChallengeActive, id, poll?.isWar]);
  
  // Show War game for already expired challenges with war mode
  useEffect(() => {
    if (poll?.isWar && status === "ended" && !warGameStartedRef.current) {
      warGameStartedRef.current = true;
      setShowWarGame(true);
    }
  }, [poll?.isWar, status]);
  
  const handleVote = async () => {
    if (!selectedOption || !isChallengeActive) return;
    
    setIsVoting(true);
    
    try {
      // Send the vote request
      const response = await apiRequest("POST", `/api/polls/${id}/vote`, { option: selectedOption });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to record vote");
      }
      
      const result = await response.json();
      
      // Immediately update the local poll data for instant feedback
      if (result.poll) {
        queryClient.setQueryData([`/api/polls/${id}`], result.poll);
      }
      
      // Also update the vote status
      if (result.vote) {
        queryClient.setQueryData([`/api/polls/${id}/vote`], {
          hasVoted: true,
          poll: result.poll,
          userId: user?.id,
          pollId: parseInt(id),
          option: result.vote.option
        });
      }
      
      // Let's force the query client to actually refresh with the new data
      queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}/vote`] });
      
      // Use our force refresh state to trigger a brand new fetch
      setForceRefresh(prev => prev + 1);
      
      // Manually refetch the data to ensure it's updated properly
      setTimeout(async () => {
        try {
          const [voteResult, pollResult] = await Promise.all([
            refetchVoteData(),
            refetchPoll()
          ]);
          // Set force refresh again to make absolutely sure we get fresh data
          setForceRefresh(prev => prev + 1);
        } catch (fetchError) {
          console.error("Error refetching data after vote:", fetchError);
        }
      }, 500);
      
      toast({
        title: "Vote recorded!",
        description: `You voted for ${selectedOption === "A" ? poll?.optionAText : poll?.optionBText}`,
      });
    } catch (error) {
      console.error("Voting error:", error);
      toast({
        title: "Vote failed",
        description: error instanceof Error ? error.message : "There was an error recording your vote",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  const shareChallenge = () => {
    if (navigator.share) {
      navigator.share({
        title: poll?.question || "Check out this challenge",
        text: `Vote on "${poll?.question}"`,
        url: window.location.href,
      }).catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Challenge link copied to clipboard",
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
                <h1 className="text-2xl font-bold">Challenge Not Found</h1>
              </div>
              
              <p className="mt-4 text-sm text-muted-foreground">
                The challenge you're looking for doesn't exist or has been removed.
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
                    {isChallengeActive ? (
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
                          {hours >= 24 
                            ? `${hours}h remaining` 
                            : hours > 0 
                              ? `${hours}h ${minutes}m ${seconds}s remaining`
                              : `${minutes}m ${seconds}s remaining`
                          }
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-destructive">This challenge has ended</span>
                    )}
                  </CardDescription>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={shareChallenge}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  className={`border rounded-md overflow-hidden transition-all 
                    ${selectedOption === "A" ? "ring-2 ring-primary" : ""} 
                    ${!isChallengeActive || hasVoted ? "pointer-events-none" : "cursor-pointer"}
                    ${hasVoted && userVoteOption === "A" ? "bg-primary/10" : ""}`}
                  onClick={() => isChallengeActive && !hasVoted && setSelectedOption("A")}
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
                      {hasVoted && userVoteOption === "A" && (
                        <span className="bg-primary/20 text-primary text-xs rounded-full px-2 py-1 font-medium flex items-center">
                          <CheckIcon className="w-3 h-3 mr-1" /> Your vote
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{poll.optionAVotes} votes</span>
                        <span className="text-sm font-medium">{optionAPercentage}%</span>
                      </div>
                      <Progress value={optionAPercentage} className="h-2" />
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`border rounded-md overflow-hidden transition-all 
                    ${selectedOption === "B" ? "ring-2 ring-primary" : ""} 
                    ${!isChallengeActive || hasVoted ? "pointer-events-none" : "cursor-pointer"}
                    ${hasVoted && userVoteOption === "B" ? "bg-primary/10" : ""}`}
                  onClick={() => isChallengeActive && !hasVoted && setSelectedOption("B")}
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
                      {hasVoted && userVoteOption === "B" && (
                        <span className="bg-primary/20 text-primary text-xs rounded-full px-2 py-1 font-medium flex items-center">
                          <CheckIcon className="w-3 h-3 mr-1" /> Your vote
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{poll.optionBVotes} votes</span>
                        <span className="text-sm font-medium">{optionBPercentage}%</span>
                      </div>
                      <Progress value={optionBPercentage} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Separator className="my-6" />
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Total votes: <span className="font-medium">{totalVotes}</span>
                  </div>
                  
                  {poll.isWar && (
                    <Badge 
                      variant="destructive"
                      className="font-racing uppercase"
                    >
                      War Mode
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={handleVote}
                disabled={!isChallengeActive || isVoting || !selectedOption || hasVoted}
                className="w-full"
              >
                {isVoting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Voting...
                  </>
                ) : hasVoted ? (
                  "Vote Recorded"
                ) : !isChallengeActive ? (
                  "Challenge Ended"
                ) : (
                  `Vote for ${selectedOption === "A" ? poll.optionAText : selectedOption === "B" ? poll.optionBText : "Selected Option"}`
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {/* War Game section - visible only for ended challenges with isWar enabled */}
          {showWarGame && poll.isWar && !isChallengeActive && (
            <Card id="war-game-section" className="mb-8 border-primary/30 relative overflow-hidden">
              <div className="absolute top-2 right-2 z-10">
                <Badge variant="destructive" className="font-racing uppercase">
                  War Mode
                </Badge>
              </div>
              
              {/* Handle no-votes scenarios */}
              {totalVotes === 0 ? (
                <div className="text-center p-8">
                  <div className="mb-4 text-primary text-6xl">⚠️</div>
                  <h3 className="text-2xl font-bold mb-2">
                    War Unavailable
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    This War challenge expired without any votes. No racing contest is available.
                  </p>
                  
                  {/* Static race track with idle cars */}
                  <div className="bg-black/80 p-4 rounded-lg mb-6 max-w-md mx-auto">
                    <div className="flex justify-between mb-2 text-sm font-medium">
                      <span className="text-primary">{poll.optionAText}</span>
                      <span className="text-primary">{poll.optionBText}</span>
                    </div>
                    
                    <div className="relative h-12 rounded-lg overflow-hidden bg-gradient-to-r from-neutral-800 to-neutral-900 flex items-center">
                      <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 w-[60%] h-full border-x-4 border-white/70 bg-black/40"></div>
                      <div className="absolute left-0 top-0 bottom-0 w-[20%] bg-gradient-to-r from-red-900/80 to-red-700/60"></div>
                      <div className="absolute right-0 top-0 bottom-0 w-[20%] bg-gradient-to-l from-red-900/80 to-red-700/60"></div>
                      
                      {/* Static cars in the center */}
                      <div className="absolute left-[40%] top-1/2 transform -translate-y-1/2 -translate-x-1/2">
                        <div className="h-8 w-8 flex items-center justify-center opacity-50">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                            <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                            <circle cx="8.5" cy="17.5" r="2.5"/>
                            <circle cx="15.5" cy="17.5" r="2.5"/>
                          </svg>
                        </div>
                      </div>
                      <div className="absolute right-[40%] top-1/2 transform -translate-y-1/2 -translate-x-1/2">
                        <div className="h-8 w-8 flex items-center justify-center opacity-50">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car" style={{ transform: 'scaleX(-1)' }}>
                            <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                            <circle cx="8.5" cy="17.5" r="2.5"/>
                            <circle cx="15.5" cy="17.5" r="2.5"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !hasVoted ? (
                <div className="text-center p-8">
                  <div className="mb-4 text-primary text-6xl">🚫</div>
                  <h3 className="text-2xl font-bold mb-2">
                    War Missed
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    You didn't vote in this War challenge before it expired. 
                    Voting is required to participate in the racing contest.
                  </p>
                  
                  {/* Static race track with idle cars */}
                  <div className="bg-black/80 p-4 rounded-lg mb-6 max-w-md mx-auto">
                    <div className="flex justify-between mb-2 text-sm font-medium">
                      <span className="text-primary">{poll.optionAText}</span>
                      <span className="text-primary">{poll.optionBText}</span>
                    </div>
                    
                    <div className="relative h-12 rounded-lg overflow-hidden bg-gradient-to-r from-neutral-800 to-neutral-900 flex items-center">
                      <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 w-[60%] h-full border-x-4 border-white/70 bg-black/40"></div>
                      <div className="absolute left-0 top-0 bottom-0 w-[20%] bg-gradient-to-r from-red-900/80 to-red-700/60"></div>
                      <div className="absolute right-0 top-0 bottom-0 w-[20%] bg-gradient-to-l from-red-900/80 to-red-700/60"></div>
                      
                      {/* Static cars in the center */}
                      <div className="absolute left-[40%] top-1/2 transform -translate-y-1/2 -translate-x-1/2">
                        <div className="h-8 w-8 flex items-center justify-center opacity-50">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                            <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                            <circle cx="8.5" cy="17.5" r="2.5"/>
                            <circle cx="15.5" cy="17.5" r="2.5"/>
                          </svg>
                        </div>
                      </div>
                      <div className="absolute right-[40%] top-1/2 transform -translate-y-1/2 -translate-x-1/2">
                        <div className="h-8 w-8 flex items-center justify-center opacity-50">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car" style={{ transform: 'scaleX(-1)' }}>
                            <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                            <circle cx="8.5" cy="17.5" r="2.5"/>
                            <circle cx="15.5" cy="17.5" r="2.5"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // If the user voted, show the actual race
                <RaceGame 
                  races={userRaces || []} 
                  pollId={parseInt(id)}
                  optionAText={poll.optionAText}
                  optionBText={poll.optionBText}
                  option={userVoteOption}
                />
              )}
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}