import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, ChevronLeft, CheckIcon, XIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Poll } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import CoinDeliveryModal from "@/components/coin/CoinDeliveryModal";

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [pendingVoteData, setPendingVoteData] = useState<{
    option: "A" | "B";
    pollId: number;
    optionText: string;
    coinName: string;
    coinSymbol: string;
  } | null>(null);
  
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
  
  const hasVoted = userVoteData?.hasVoted || false;
  const userVoteOption = userVoteData?.option || null;
  
  // Calculate poll percentages for display
  const totalVotes = (poll?.optionAVotes || 0) + (poll?.optionBVotes || 0);
  const optionAPercentage = totalVotes ? Math.round((poll?.optionAVotes || 0) / totalVotes * 100) : 0;
  const optionBPercentage = totalVotes ? Math.round((poll?.optionBVotes || 0) / totalVotes * 100) : 0;
  
  // Calculate remaining time
  const getRemainingTime = () => {
    if (!poll?.endTime) {
      console.warn("DEBUG: No endTime found in poll:", poll);
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
      console.warn("⏰ POLL ENDED: Time difference is negative or zero:", diff);
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    console.warn("⏰ REMAINING TIME:", { hours, minutes, seconds });
    return { hours, minutes, seconds };
  };
  
  // Initialize with zeros first and then update when poll data is available
  const [timeState, setTimeState] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  // Update time state when poll data is available
  useEffect(() => {
    if (poll?.endTime) {
      setTimeState(getRemainingTime());
    }
  }, [poll?.endTime]);
  
  const { hours, minutes, seconds } = timeState;
  const isPollActive = hours > 0 || minutes > 0 || seconds > 0;
  
  // Add a timer update effect
  useEffect(() => {
    if (!isPollActive) return;
    
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
  }, [isPollActive, id]);
  
  const handleVote = async () => {
    if (!selectedOption || !isPollActive || !poll) return;
    
    setIsVoting(true);
    
    try {
      // First, try to submit vote without wallet address (this will trigger backend to ask for wallet preference)
      const response = await apiRequest(`/api/polls/${id}/vote`, "POST", { 
        option: selectedOption
        // No walletAddress provided - this triggers the modal flow
      });
      
      // If we reach here, vote was processed directly (shouldn't happen for MemeCoin polls)
      const result = await response.json();
      console.log("Vote processed directly:", result);
      
      // Update queries and show success
      if (result.poll) {
        queryClient.setQueryData([`/api/polls/${id}`], result.poll);
      }
      
      if (result.vote) {
        queryClient.setQueryData([`/api/polls/${id}/vote`], {
          hasVoted: true,
          poll: result.poll,
          userId: user?.id,
          pollId: parseInt(id!),
          option: result.vote.option
        });
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/polls/${id}/vote`] });
      setForceRefresh(prev => prev + 1);
      
      toast({
        title: "Vote Recorded!",
        description: `You voted for ${selectedOption === "A" ? poll.optionAText : poll.optionBText}`,
      });
      
    } catch (error: any) {
      console.error("=== VOTING CATCH BLOCK START ===");
      console.error("Voting error:", error);
      
      try {
        console.error("ERROR DATA CHECK:", error.response?.data);
        console.error("CHECKING CONDITIONS:");
        console.error("- error.response exists:", !!error.response);
        console.error("- error.response.data exists:", !!error.response?.data);
        console.error("- requiresWalletChoice:", error.response?.data?.requiresWalletChoice);
        console.error("- coinPreview exists:", !!error.response?.data?.coinPreview);
        
        // NEW: Check if backend is asking for wallet choice (data is in error.response.data)
        if (error.response?.data?.requiresWalletChoice && error.response?.data?.coinPreview) {
          console.error("✅ MODAL TRIGGER DETECTED - Backend requesting wallet choice");
          
          // Set up the pending vote data from backend response
          const voteData = {
            option: error.response.data.coinPreview.option,
            pollId: error.response.data.coinPreview.pollId,
            optionText: error.response.data.coinPreview.optionText,
            coinName: error.response.data.coinPreview.coinName,
            coinSymbol: error.response.data.coinPreview.coinSymbol
          };
          
          console.error("✅ SETTING PENDING VOTE DATA:", voteData);
          setPendingVoteData(voteData);
          
          console.error("✅ SETTING MODAL VISIBLE TO TRUE");
          setShowCoinModal(true);
          
          console.error("✅ MODAL STATE UPDATED - EXITING HANDLER");
          return; // IMPORTANT: Don't call setIsVoting(false) here - keep loading state for modal
        } else {
          console.error("❌ MODAL TRIGGER CONDITIONS NOT MET");
        }
      } catch (innerError) {
        console.error("Error in catch block processing:", innerError);
      }
      
      // For other errors, reset state and show error
      setIsVoting(false);
      toast({
        title: "Vote Failed",
        description: error instanceof Error ? error.message : "Failed to record vote",
        variant: "destructive"
      });
    }
  };

  const handleCoinDelivery = async (walletAddress: string | null) => {
    if (!pendingVoteData) return;
    
    setIsVoting(true);
    
    try {
      console.log("Submitting vote with wallet choice:", { 
        pollId: pendingVoteData.pollId, 
        option: pendingVoteData.option,
        walletAddress: walletAddress || 'demo_mode'
      });
      
      // Send the vote request with wallet address for coin generation
      const response = await apiRequest(`/api/polls/${id}/vote`, "POST", { 
        option: pendingVoteData.option,
        walletAddress: walletAddress || undefined // undefined triggers demo mode
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to record vote");
      }
      
      const result = await response.json();
      console.log("Vote success response:", result);
      
      // Immediately update the local poll data for instant feedback
      if (result.poll) {
        console.log("Updating poll data with:", result.poll);
        queryClient.setQueryData([`/api/polls/${id}`], result.poll);
      }
      
      // Also update the vote status
      if (result.vote) {
        console.log("Updating vote status with:", result.vote);
        queryClient.setQueryData([`/api/polls/${id}/vote`], {
          hasVoted: true,
          poll: result.poll,
          userId: user?.id,
          pollId: parseInt(id!),
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
          console.log("🔄 Manually fetching the latest poll data to ensure UI is up-to-date");
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
        description: `You voted for ${pendingVoteData.optionText}`,
      });
      
      // Show appropriate coin delivery notification
      setTimeout(() => {
        if (walletAddress) {
          toast({
            title: "🪙 Coin Delivered!",
            description: `${pendingVoteData.coinName} (${pendingVoteData.coinSymbol}) sent to your Solana wallet`,
          });
        } else {
          toast({
            title: "🪙 Coin Generated!",
            description: `${pendingVoteData.coinName} (${pendingVoteData.coinSymbol}) created in demo mode`,
          });
        }
      }, 1500);
    } catch (error) {
      console.error("Voting error:", error);
      toast({
        title: "Vote failed",
        description: error instanceof Error ? error.message : "There was an error recording your vote",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
      setPendingVoteData(null);
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
                    ${!isPollActive || hasVoted ? "pointer-events-none" : "cursor-pointer"}
                    ${hasVoted && userVoteOption === "A" ? "bg-primary/10" : ""}`}
                  onClick={() => isPollActive && !hasVoted && setSelectedOption("A")}
                >
                  {poll.optionAImage ? (
                    <div className="h-48 bg-muted flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/50">
                        <img 
                          src={poll.optionAImage} 
                          alt={poll.optionAText} 
                          className="w-full h-full object-cover"
                        />
                      </div>
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
                    ${!isPollActive || hasVoted ? "pointer-events-none" : "cursor-pointer"}
                    ${hasVoted && userVoteOption === "B" ? "bg-primary/10" : ""}`}
                  onClick={() => isPollActive && !hasVoted && setSelectedOption("B")}
                >
                  {poll.optionBImage ? (
                    <div className="h-48 bg-muted flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/50">
                        <img 
                          src={poll.optionBImage} 
                          alt={poll.optionBText} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 bg-muted flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full flex items-center justify-center bg-primary/20 border-4 border-primary/50">
                        <span className="text-4xl text-primary font-racing">B</span>
                      </div>
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
              


              {isPollActive && (
                <div className="mt-6 flex flex-col items-center">
                  <Button 
                    className="btn-gold w-full max-w-md" 
                    size="lg"
                    disabled={!selectedOption || isVoting || hasVoted}
                    onClick={handleVote}
                  >
                    {isVoting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recording vote...
                      </>
                    ) : hasVoted ? (
                      "You have already voted"
                    ) : (
                      `Vote for ${selectedOption ? poll[selectedOption === "A" ? "optionAText" : "optionBText"] : ""}`
                    )}
                  </Button>
                  
                  {hasVoted && (
                    <p className="text-xs text-muted-foreground mt-2">
                      You voted for {userVoteOption === "A" ? poll.optionAText : poll.optionBText}. 
                      Votes cannot be changed once submitted.
                    </p>
                  )}
                </div>
              )}
              
              <div className="mt-6">
                <Separator className="my-4" />
                <div className="text-center">
                  <h3 className="font-medium text-xl mb-2">Total Votes: {totalVotes}</h3>
                  <p className={isPollActive ? "text-muted-foreground" : "font-bold text-primary"}>
                    {!isPollActive ? (
                      // Show final result for ended polls
                      optionAPercentage > optionBPercentage 
                        ? `${poll.optionAText} has won with ${optionAPercentage}% of the votes!` 
                        : optionBPercentage > optionAPercentage
                          ? `${poll.optionBText} has won with ${optionBPercentage}% of the votes!`
                          : "The challenge ended in a tie!"
                    ) : (
                      // Show current status for active polls
                      optionAPercentage > optionBPercentage 
                        ? `${poll.optionAText} is leading by ${optionAPercentage - optionBPercentage}%` 
                        : optionBPercentage > optionAPercentage
                          ? `${poll.optionBText} is leading by ${optionBPercentage - optionAPercentage}%`
                          : "It's currently a tie!"
                    )}
                  </p>
                </div>
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
        </div>
      </main>
      
      <Footer />
      
      {/* Coin Delivery Modal */}
      {pendingVoteData && (
        <CoinDeliveryModal
          isOpen={showCoinModal}
          onClose={() => {
            setShowCoinModal(false);
            setPendingVoteData(null);
            setIsVoting(false);
          }}
          coinName={pendingVoteData.coinName}
          coinSymbol={pendingVoteData.coinSymbol}
          option={pendingVoteData.optionText}
          pollId={pendingVoteData.pollId}
          onDeliveryChoice={handleCoinDelivery}
        />
      )}
    </div>
  );
}
