import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, ChevronLeft, CheckIcon, XIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Poll, RaceRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import RaceGame from "@/components/game/RaceGame";

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [showWarGame, setShowWarGame] = useState(false);
  const [warCountdown, setWarCountdown] = useState(60); // 60 second countdown after challenge ends
  
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
    queryKey: ["/api/user/races"],
    enabled: !!user && !!poll?.isWar,
  });
  
  const hasVoted = userVoteData?.hasVoted || false;
  const userVoteOption = userVoteData?.option || null;
  
  // Calculate challenge percentages for display
  const totalVotes = (poll?.optionAVotes || 0) + (poll?.optionBVotes || 0);
  const optionAPercentage = totalVotes ? Math.round((poll?.optionAVotes || 0) / totalVotes * 100) : 0;
  const optionBPercentage = totalVotes ? Math.round((poll?.optionBVotes || 0) / totalVotes * 100) : 0;
  
  // Calculate remaining time
  const getRemainingTime = () => {
    if (!poll?.endTime) {
      console.warn("DEBUG: No endTime found in challenge:", poll);
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    const now = new Date();
    const end = new Date(poll.endTime);
    const diff = end.getTime() - now.getTime();
    
    // Force log to the console to make sure we can see it
    console.warn("⏰ TIME CHECK:", {
      now: now.toISOString(),
      nowTime: now.getTime(),
      end: end.toISOString(),
      endTime: end.getTime(),
      diff: diff,
      diffInMinutes: diff / (1000 * 60),
      endTimeRaw: poll.endTime,
      pollId: poll.id
    });
    
    if (diff <= 0) {
      console.warn("⏰ CHALLENGE ENDED: Time difference is negative or zero:", diff);
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    console.warn("⏰ REMAINING TIME:", { hours, minutes, seconds });
    return { hours, minutes, seconds };
  };
  
  // Initialize with zeros first and then update when challenge data is available
  const [timeState, setTimeState] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  // Update time state when challenge data is available
  useEffect(() => {
    if (poll?.endTime) {
      setTimeState(getRemainingTime());
    }
  }, [poll?.endTime]);
  
  const { hours, minutes, seconds } = timeState;
  const isChallengeActive = hours > 0 || minutes > 0 || seconds > 0;
  
  // Check if we should show the war game UI
  useEffect(() => {
    if (poll?.isWar && !isChallengeActive && hasVoted) {
      setShowWarGame(true);
    } else {
      setShowWarGame(false);
    }
  }, [poll?.isWar, isChallengeActive, hasVoted]);
  
  // War countdown timer effect
  useEffect(() => {
    // Start the war countdown only when the challenge has ended and user has voted
    if (poll?.isWar && !isChallengeActive && hasVoted) {
      console.log("🏁 Starting War countdown:", warCountdown);
      
      const warIntervalId = setInterval(() => {
        setWarCountdown(prev => {
          const newCount = prev - 1;
          console.log("🏁 War countdown:", newCount);
          
          // When countdown reaches zero, prepare for war!
          if (newCount <= 0) {
            clearInterval(warIntervalId);
            // We already set showWarGame to true in the previous effect
            // Now we need to scroll to the game section
            const gameElement = document.getElementById('war-game-section');
            if (gameElement) {
              gameElement.scrollIntoView({ behavior: 'smooth' });
            }
          }
          return newCount;
        });
      }, 1000);
      
      return () => clearInterval(warIntervalId);
    }
  }, [poll?.isWar, isChallengeActive, hasVoted]);
  
  // Add a timer update effect
  useEffect(() => {
    if (!isChallengeActive) return;
    
    const intervalId = setInterval(() => {
      const newTime = getRemainingTime();
      setTimeState(newTime);
      
      if (newTime.hours <= 0 && newTime.minutes <= 0 && newTime.seconds <= 0) {
        // Challenge has ended, refresh the challenge data
        queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}`] });
        clearInterval(intervalId);
      }
    }, 1000); // Update every second
    
    return () => clearInterval(intervalId);
  }, [isChallengeActive, id]);
  
  const handleVote = async () => {
    if (!selectedOption || !isChallengeActive) return;
    
    setIsVoting(true);
    
    try {
      console.log("Submitting vote:", { pollId: id, option: selectedOption });
      
      // Send the vote request regardless of whether user has already voted
      // The server will return an error if the user has already voted
      const response = await apiRequest("POST", `/api/polls/${id}/vote`, { option: selectedOption });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to record vote");
      }
      
      const result = await response.json();
      console.log("Vote success response:", result);
      
      // Immediately update the local challenge data for instant feedback
      if (result.poll) {
        console.log("Updating challenge data with:", result.poll);
        queryClient.setQueryData([`/api/polls/${id}`], result.poll);
      }
      
      // Also update the vote status
      if (result.vote) {
        console.log("Updating vote status with:", result.vote);
        queryClient.setQueryData([`/api/polls/${id}/vote`], {
          hasVoted: true,
          poll: result.poll,
          userId: user?.id,
          pollId: parseInt(id),
          option: result.vote.option
        });
      }
      
      // Let's force the query client to actually refresh with the new data
      // First, invalidate ALL queries related to this challenge (including the vote)
      queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}/vote`] });
      
      // Use our force refresh state to trigger a brand new fetch
      setForceRefresh(prev => prev + 1);
      
      // Manually refetch the data to ensure it's updated properly
      setTimeout(async () => {
        try {
          console.log("🔄 Manually fetching the latest challenge data to ensure UI is up-to-date");
          const [voteResult, pollResult] = await Promise.all([
            refetchVoteData(),
            refetchPoll()
          ]);
          console.log("🔄 After vote - refetched data:", { 
            voteResult, 
            pollResult,
            currentPollData: pollResult.data,
            optionAVotes: pollResult.data?.optionAVotes,
            optionBVotes: pollResult.data?.optionBVotes,
          });
          
          // Set force refresh again to make absolutely sure we get fresh data
          setForceRefresh(prev => prev + 1);
        } catch (fetchError) {
          console.error("Error refetching data after vote:", fetchError);
        }
      }, 500);
      
      toast({
        title: "Vote recorded!",
        description: `You voted for ${selectedOption === "A" ? poll.optionAText : poll.optionBText}`,
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
            onClick={() => navigate("/challenges")}
            className="mb-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Challenges
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
                
                <div className="flex gap-2">
                  {poll.isWar && (
                    <div className="flex flex-col items-center">
                      <Button 
                        variant={isChallengeActive ? "destructive" : (hasVoted ? "success" : "outline")}
                        size="sm"
                        className="font-racing"
                      >
                        {isChallengeActive ? (
                          <div className="flex items-center">
                            <span className="mr-1">WAR</span>
                            <svg className="w-3 h-3" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2"></circle>
                              <circle 
                                cx="18" 
                                cy="18" 
                                r="16" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                style={{ 
                                  strokeDashoffset: 283 * (1 - (hours * 60 + minutes) / (24 * 60))
                                }}
                              ></circle>
                            </svg>
                          </div>
                        ) : (
                          <span>{hasVoted ? "READY" : "UNAVAILABLE"}</span>
                        )}
                      </Button>
                      
                      {!isChallengeActive && hasVoted && (
                        <div className="text-xs mt-1 font-bold font-racing">
                          War in: {warCountdown}s
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={shareChallenge}
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
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
              
              <div className="mt-6 flex justify-center">
                {isChallengeActive && !hasVoted && (
                  <Button 
                    onClick={handleVote} 
                    disabled={!selectedOption || isVoting}
                    className="w-full max-w-xs"
                  >
                    {isVoting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Voting...
                      </>
                    ) : (
                      'Vote Now'
                    )}
                  </Button>
                )}
                
                {hasVoted && isChallengeActive && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      You've already voted for <span className="font-medium text-primary">{userVoteOption === "A" ? poll.optionAText : poll.optionBText}</span>.
                    </p>
                  </div>
                )}
                
                {!isChallengeActive && (
                  <div className="text-center">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <Badge variant="outline" className="px-3 py-1 border-primary/30 text-primary font-medium">
                        Final Results
                      </Badge>
                      
                      {poll.isWar && (
                        <Badge variant="destructive" className="px-3 py-1 font-racing uppercase">
                          War Mode
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {totalVotes === 0 ? (
                        "No votes were cast in this challenge."
                      ) : (
                        <>
                          <span className="font-medium text-primary">
                            {optionAPercentage > optionBPercentage 
                              ? poll.optionAText 
                              : optionBPercentage > optionAPercentage 
                                ? poll.optionBText 
                                : "It's a tie!"
                            }
                          </span> {" "}
                          {optionAPercentage !== optionBPercentage ? "won with " : ""}
                          {optionAPercentage > optionBPercentage 
                            ? `${optionAPercentage}% of the votes`
                            : optionBPercentage > optionAPercentage 
                              ? `${optionBPercentage}% of the votes`
                              : ""
                          }.
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="border-t pt-4 flex justify-between">
              <span className="text-sm text-muted-foreground">
                Created {new Date(poll.createdAt).toLocaleDateString()}
              </span>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={shareChallenge}
              >
                <Share2 className="mr-1 h-4 w-4" />
                Share
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
              <RaceGame 
                races={userRaces || []} 
                pollId={parseInt(id)}
                optionAText={poll.optionAText}
                optionBText={poll.optionBText}
              />
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}