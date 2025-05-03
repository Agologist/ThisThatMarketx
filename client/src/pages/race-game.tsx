import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Trophy, Flag, Timer, Award, Zap, X as XIcon } from "lucide-react";
import { useLocation } from "wouter";
import Achievements from "@/components/game/Achievements";
import type { 
  RaceRecord, 
  Achievement, 
  UserAchievement 
} from "../../../shared/schema";

// Game constants
const PUSH_POWER = 3; // How much pushing power each vote provides
const MAX_POSITION = 30; // Maximum possible position value
const PLATFORM_EDGE = 30; // Position at which a car falls off the ramp (equivalent to 10 steps from center)
const CENTER_POSITION = 0; // Starting position at center

// Using white racecar SVG images for better reliability
const carImages = [
  // White racing car with front/hood at right side (for left car)
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2FyIj48cGF0aCBkPSJNMTkgMTdINW0wIDB2MmMwIDEuMS45IDIgMiAyaDEwYTIgMiAwIDAgMCAyLTJ2LTJtMC0zVjZhMiAyIDAgMSAwLTQgMHY0TTUgMTRsMi01aDEyYzAgMCAxLjMgMS40MyAxLjUgM2EuNSA1IDAgMCAxLS41IDJoLTNtLTUgMGgtNyIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjE3LjUiIHI9IjIuNSIvPjxjaXJjbGUgY3g9IjE1LjUiIGN5PSIxNy41IiByPSIyLjUiLz48L3N2Zz4=",
  // Same white racing car 2
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2FyIj48cGF0aCBkPSJNMTkgMTdINW0wIDB2MmMwIDEuMS45IDIgMiAyaDEwYTIgMiAwIDAgMCAyLTJ2LTJtMC0zVjZhMiAyIDAgMSAwLTQgMHY0TTUgMTRsMi01aDEyYzAgMCAxLjMgMS40MyAxLjUgM2EuNSA1IDAgMCAxLS41IDJoLTNtLTUgMGgtNyIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjE3LjUiIHI9IjIuNSIvPjxjaXJjbGUgY3g9IjE1LjUiIGN5PSIxNy41IiByPSIyLjUiLz48L3N2Zz4=",
  // Same white racing car 3
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2FyIj48cGF0aCBkPSJNMTkgMTdINW0wIDB2MmMwIDEuMS45IDIgMiAyaDEwYTIgMiAwIDAgMCAyLTJ2LTJtMC0zVjZhMiAyIDAgMSAwLTQgMHY0TTUgMTRsMi01aDEyYzAgMCAxLjMgMS40MyAxLjUgM2EuNSA1IDAgMCAxLS41IDJoLTNtLTUgMGgtNyIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjE3LjUiIHI9IjIuNSIvPjxjaXJjbGUgY3g9IjE1LjUiIGN5PSIxNy41IiByPSIyLjUiLz48L3N2Zz4=",
  // Same white racing car 4
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2FyIj48cGF0aCBkPSJNMTkgMTdINW0wIDB2MmMwIDEuMS45IDIgMiAyaDEwYTIgMiAwIDAgMCAyLTJ2LTJtMC0zVjZhMiAyIDAgMSAwLTQgMHY0TTUgMTRsMi01aDEyYzAgMCAxLjMgMS40MyAxLjUgM2EuNSA1IDAgMCAxLS41IDJoLTNtLTUgMGgtNyIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjE3LjUiIHI9IjIuNSIvPjxjaXJjbGUgY3g9IjE1LjUiIGN5PSIxNy41IiByPSIyLjUiLz48L3N2Zz4="
];

interface RaceGameProps {
  races?: RaceRecord[];
  pollId?: number;
  optionAText?: string;
  optionBText?: string;
  option?: string | null;
}

export default function RaceGame({ races, pollId: propPollId, optionAText, optionBText, option: propOption }: RaceGameProps = {}) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [searchParams] = useLocation();
  const urlPollId = Number(new URLSearchParams(searchParams).get("pollId") || "0");
  const urlOption = new URLSearchParams(searchParams).get("option") || "";
  
  // Process options and poll ID from props or URL params
  const pollId = propPollId || urlPollId;
  const userOption = propOption || urlOption;
  
  // Allow standalone mode when accessed directly from the footer
  const isStandaloneMode = pollId === 0 && !userOption;
  
  // Check if this is an expired challenge with a saved vote
  const [isExpiredChallenge, setIsExpiredChallenge] = useState(false);
  
  // Additional check for retrieving poll data to determine if it's expired
  const { data: pollData } = useQuery({
    queryKey: ["/api/polls", pollId],
    queryFn: async () => {
      if (pollId <= 0) return null;
      const res = await apiRequest("GET", `/api/polls/${pollId}`);
      return await res.json();
    },
    enabled: !!pollId && pollId > 0,
  });
  
  // Game state
  const [gameState, setGameState] = useState<"ready" | "countdown" | "racing" | "finished">("ready");
  const [countdownValue, setCountdownValue] = useState(3);
  const [raceTime, setRaceTime] = useState(0);
  
  // Car positions: from 0 (center) to MAX_POSITION (edge)
  const [leftPosition, setLeftPosition] = useState(0);
  const [rightPosition, setRightPosition] = useState(0);
  
  // Vote counts
  const [leftVotes, setLeftVotes] = useState(0);
  const [rightVotes, setRightVotes] = useState(0);
  
  // Car selection and options
  const [selectedCar, setSelectedCar] = useState(0);
  // For standalone mode, allow user to select car
  const [userCarSelection, setUserCarSelection] = useState<"left" | "right" | "">("");
  // Determine which car the user voted for (left = A, right = B)
  const userCar = isStandaloneMode ? userCarSelection : (userOption === "A" ? "left" : "right");
  const [gameResult, setGameResult] = useState<{ won: boolean; time: number } | null>(null);
  const [leftExploded, setLeftExploded] = useState(false);
  const [rightExploded, setRightExploded] = useState(false);
  
  // Refs for timers
  const raceTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  const { data: userRaces, isLoading: racesLoading } = useQuery<RaceRecord[]>({
    queryKey: ["/api/user/races"],
  });
  
  const { data: userAchievements, isLoading: achievementsLoading } = useQuery<(UserAchievement & Achievement)[]>({
    queryKey: ["/api/user/achievements"],
  });
  
  const saveRaceMutation = useMutation({
    mutationFn: async (raceData: { time: number; won: boolean }) => {
      const res = await apiRequest("POST", "/api/races", raceData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/races"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/achievements"] });
      
      toast({
        title: gameResult?.won ? "Victory!" : "Race Complete",
        description: `You finished in ${(gameResult?.time || 0) / 1000} seconds`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save race results",
        variant: "destructive",
      });
    }
  });
  
  // Start the countdown
  const startCountdown = () => {
    setGameState("countdown");
    setCountdownValue(3);
    
    const countdownInterval = setInterval(() => {
      setCountdownValue(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startRace();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Start the race
  const startRace = () => {
    setGameState("racing");
    // Initial position - cars start nose-to-nose near the center line
    setLeftPosition(0); // Initial offset is added to base position (40%)
    setRightPosition(0); // Initial offset is added to base position (60%)
    setLeftVotes(0);
    setRightVotes(0);
    setLeftExploded(false);
    setRightExploded(false);
    setRaceTime(0);
    
    startTimeRef.current = Date.now();
    
    // Start race timer
    raceTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      setRaceTime(elapsed);
    }, 100);
  };
  
  // Handle key presses for cars
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "racing") return;
      
      // Only allow keyboard control for the car the user voted for
      if (userCar === "left") {
        // Left arrow or 'A' key votes for the left car
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          e.preventDefault();
          handleLeftVote();
        }
      } else if (userCar === "right") {
        // Right arrow or 'D' key votes for the right car
        if (e.code === "ArrowRight" || e.code === "KeyD") {
          e.preventDefault();
          handleRightVote();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, userCar]);
  
  // Handle a vote for the left car
  const handleLeftVote = () => {
    // Only process if the game is still racing
    if (gameState !== "racing" || leftExploded || rightExploded) return;
    
    // User can only play the car they voted for
    if (userCar !== "left") {
      toast({
        title: "Wrong Car",
        description: "You can only control the car you voted for!",
        variant: "destructive",
      });
      return;
    }
    
    // Increment left votes
    setLeftVotes(prev => prev + 1);
    
    // In a sumo-style game:
    // - The cars push against each other at the boundary between them
    // - The boundary position is determined by the relative strength of the two sides
    // - When one side gets a vote, they get more pushing power and move the boundary toward the other car
    
    // For visual effect, add a small delay to simulate impact
    setTimeout(() => {
      // Current position of both cars in the match
      const currentLeftPos = leftPosition;
      const currentRightPos = rightPosition;
      
      // Calculate new positions after this push
      // Left car pushes with PUSH_POWER units of force
      const pushAmount = PUSH_POWER;
      
      // Calculate new positions for both cars
      const newLeftPos = currentLeftPos + pushAmount;
      const newRightPos = currentRightPos + pushAmount;
      
      // Calculate the actual position percentages relative to the container
      // Platform edges are at 20% from each side (80% platform width in the middle)
      // This means left car should explode when pushing beyond left 20% and right car when beyond right 20%
      
      // Left car position refers to distance from center toward right
      // Right car position refers to distance from center toward right
      
      // Check if right car would move too far and fall off the right edge
      // At rightPosition = 30, the right car should be at the edge (20% from center = right platform edge)
      if (newRightPos >= PLATFORM_EDGE) {
        // Right car falls off - show explosion
        setRightExploded(true);
        setRightPosition(PLATFORM_EDGE); // Position at edge
        
        // Calculate race time
        const elapsed = Date.now() - (startTimeRef.current || 0);
        
        // Delay end of race to show explosion animation
        setTimeout(() => {
          finishRace(true, elapsed); // Left car wins because right car fell off
        }, 800);
        return;
      }
      
      // Check if left car's position goes beyond its edge line
      // As left car moves forward (rightward), leftPosition increases
      // At leftPosition = 30, the left car should be at the edge
      if (newLeftPos >= PLATFORM_EDGE) {
        // Left car falls off - show explosion
        setLeftExploded(true);
        setLeftPosition(PLATFORM_EDGE); // Position at edge
        
        // Calculate race time
        const elapsed = Date.now() - (startTimeRef.current || 0);
        
        // Delay end of race to show explosion animation
        setTimeout(() => {
          finishRace(false, elapsed); // Left car loses because it fell off
        }, 800);
        return;
      }
      
      // If neither car falls off, update both positions
      setLeftPosition(newLeftPos);
      setRightPosition(newRightPos);
    }, 100); // Short delay for visual effect
  };
  
  // Handle a vote for the right car
  const handleRightVote = () => {
    // Only process if the game is still racing
    if (gameState !== "racing" || leftExploded || rightExploded) return;
    
    // User can only play the car they voted for
    if (userCar !== "right") {
      toast({
        title: "Wrong Car",
        description: "You can only control the car you voted for!",
        variant: "destructive",
      });
      return;
    }
    
    // Increment right votes
    setRightVotes(prev => prev + 1);
    
    // For visual effect, add a small delay to simulate impact
    setTimeout(() => {
      // Current position of both cars in the match
      const currentLeftPos = leftPosition;
      const currentRightPos = rightPosition;
      
      // Right car pushes with PUSH_POWER units of force
      const pushAmount = PUSH_POWER;
      
      // Calculate new positions after this push
      // When right car pushes, both cars move left (decreasing positions)
      const newLeftPos = currentLeftPos - pushAmount;
      const newRightPos = currentRightPos - pushAmount;
      
      // Check if left car would move too far and fall off the left edge
      // At leftPosition = -30, the left car should be at the edge
      if (newLeftPos <= -PLATFORM_EDGE) {
        // Left car falls off - show explosion
        setLeftExploded(true);
        setLeftPosition(-PLATFORM_EDGE); // Position at edge
        
        // Calculate race time
        const elapsed = Date.now() - (startTimeRef.current || 0);
        
        // Delay end of race to show explosion animation
        setTimeout(() => {
          finishRace(true, elapsed); // Right car wins because left car fell off
        }, 800);
        return;
      }
      
      // Check if right car would move too far backward and fall off
      if (newRightPos <= -PLATFORM_EDGE) {
        // Right car falls off - show explosion
        setRightExploded(true);
        setRightPosition(-PLATFORM_EDGE); // Position at edge
        
        // Calculate race time
        const elapsed = Date.now() - (startTimeRef.current || 0);
        
        // Delay end of race to show explosion animation
        setTimeout(() => {
          finishRace(false, elapsed); // Right car loses because it fell off
        }, 800);
        return;
      }
      
      // If neither car falls off, update both positions
      setLeftPosition(newLeftPos);
      setRightPosition(newRightPos);
    }, 100); // Short delay for visual effect
  };
  
  // Check if challenge is expired
  useEffect(() => {
    if (pollId > 0 && pollData) {
      // Calculate if the challenge is expired
      const now = new Date();
      const endTime = new Date(pollData.endTime);
      const isExpired = now > endTime;
      
      console.log("Challenge expiration check:", { pollId, now, endTime, isExpired });
      
      setIsExpiredChallenge(isExpired);
    }
  }, [pollId, pollData]);
  
  // Check for saved game state on component mount
  useEffect(() => {
    // For standalone games
    if (isStandaloneMode) {
      const savedState = localStorage.getItem('raceGame_standalone');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.gameState === "finished" && parsedState.gameResult) {
            // Restore the finished state
            setGameState("finished");
            setGameResult(parsedState.gameResult);
            if (parsedState.userCarSelection) {
              setUserCarSelection(parsedState.userCarSelection);
            }
          }
        } catch (e) {
          console.error("Failed to parse saved race game state", e);
        }
      }
    }
    
    // For challenge-based games
    if (pollId > 0) {
      // Load any saved game state for this challenge
      const savedState = localStorage.getItem(`raceGame_poll_${pollId}`);
      console.log(`⚠️ RaceGame: Checking localStorage for poll ${pollId}:`, { 
        savedState: savedState ? "found" : "not found",
        isExpiredChallenge
      });
      
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          console.log(`⚠️ RaceGame: Parsed state for poll ${pollId}:`, parsedState);
          
          if (parsedState.gameState === "finished" && parsedState.gameResult) {
            // Restore the finished state for this specific challenge
            setGameState("finished");
            setGameResult(parsedState.gameResult);
          }
        } catch (e) {
          console.error("Failed to parse saved race game state", e);
        }
      } else if (isExpiredChallenge) {
        // CRITICAL FIX: If this is the first time loading an expired challenge,
        // create a completed race record in localStorage to prevent replay
        console.log(`⚠️ CREATING AUTOMATIC COMPLETION RECORD for expired challenge ${pollId}`);
        const gameStateToSave = {
          gameState: "finished",
          gameResult: { 
            won: Math.random() > 0.5, // Random win/loss for auto-completed games
            time: 30000 + Math.floor(Math.random() * 20000) // Random time between 30-50s
          }
        };
        
        // Save to localStorage to prevent future replays
        localStorage.setItem(`raceGame_poll_${pollId}`, JSON.stringify(gameStateToSave));
        
        // Update state to match saved data
        setGameState("finished");
        setGameResult(gameStateToSave.gameResult);
        
        // Also save to server if the user is logged in
        if (user) {
          saveRaceMutation.mutate({ 
            time: gameStateToSave.gameResult.time, 
            won: gameStateToSave.gameResult.won 
          });
        }
      }
    }
  }, [isStandaloneMode, pollId, isExpiredChallenge, user, saveRaceMutation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (raceTimerRef.current) {
        clearInterval(raceTimerRef.current);
      }
    };
  }, []);
  
  // Finish the race
  const finishRace = (playerWon: boolean, time: number) => {
    if (raceTimerRef.current) {
      clearInterval(raceTimerRef.current);
    }
    
    setGameState("finished");
    setGameResult({ won: playerWon, time });
    
    // Save race results
    saveRaceMutation.mutate({ time, won: playerWon });
    
    // Save game state to localStorage for persistence across page refreshes
    const gameStateToSave = {
      gameState: "finished",
      gameResult: { won: playerWon, time },
      userCarSelection
    };
    
    // For standalone games
    if (isStandaloneMode) {
      localStorage.setItem('raceGame_standalone', JSON.stringify(gameStateToSave));
    }
    
    // For challenge-based games
    if (pollId > 0) {
      localStorage.setItem(`raceGame_poll_${pollId}`, JSON.stringify(gameStateToSave));
    }
  };
  
  // Reset the game
  const resetGame = () => {
    setGameState("ready");
    setGameResult(null);
    setLeftPosition(0); // Match initial position from startRace
    setRightPosition(0); // Match initial position from startRace
    setLeftVotes(0);
    setRightVotes(0);
    setLeftExploded(false);
    setRightExploded(false);
    
    // Clear localStorage data for this game
    if (isStandaloneMode) {
      localStorage.removeItem('raceGame_standalone');
    }
    
    // For challenge-based games
    if (pollId > 0) {
      localStorage.removeItem(`raceGame_poll_${pollId}`);
    }
  };
  
  // Calculate best time
  const getBestTime = () => {
    if (!userRaces || userRaces.length === 0) return "N/A";
    
    const bestRace = [...userRaces].sort((a, b) => a.time - b.time)[0];
    return `${(bestRace.time / 1000).toFixed(2)}s`;
  };
  
  // Calculate win rate
  const getWinRate = () => {
    if (!userRaces || userRaces.length === 0) return "0%";
    
    const wins = userRaces.filter(race => race.won).length;
    return `${Math.round((wins / userRaces.length) * 100)}%`;
  };
  
  if (racesLoading || achievementsLoading) {
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
      
      <main className="flex-grow py-8 px-4">
        <div className="container mx-auto">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl">Votes and Wars Race</CardTitle>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {gameState === "racing" ? "Racing!" : gameState === "countdown" ? "Ready..." : gameState === "finished" ? "Finished" : "Select Car"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {gameState === "ready" 
                      ? "Select your car and press the Start button"
                      : gameState === "countdown" 
                        ? "Race starts in..."
                        : gameState === "racing"
                          ? "Click the thumbs-up button to vote!"
                          : "Race complete! View your results below"}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {/* Car selection grid (visible in ready state) */}
                  {gameState === "ready" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div 
                          key={index}
                          className={`border rounded-md p-4 cursor-pointer transition-all ${selectedCar === index ? "ring-2 ring-primary border-primary" : "hover:border-primary"}`}
                          onClick={() => setSelectedCar(index)}
                        >
                          <div className="aspect-square flex items-center justify-center">
                            <div className="w-20 h-20 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                                <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                                <circle cx="8.5" cy="17.5" r="2.5"/>
                                <circle cx="15.5" cy="17.5" r="2.5"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Countdown display */}
                  {gameState === "countdown" && (
                    <div className="py-10 flex justify-center items-center">
                      <div className="text-8xl font-racing text-primary">{countdownValue}</div>
                    </div>
                  )}
                  
                  {/* Race track - single line with cars facing each other */}
                  <div className={`bg-black rounded-lg p-4 mb-4 ${gameState === "ready" ? "opacity-70" : ""}`}>
                    {/* Vote counters */}
                    <div className="flex justify-between mb-4">
                      <div className="flex flex-col items-center">
                        <div className="text-sm uppercase font-bold text-muted-foreground mb-1 truncate max-w-[120px]">
                          {isStandaloneMode ? "Left" : (optionAText || "Left")}
                        </div>
                        <div className="bg-primary/30 border border-primary/50 text-primary font-racing text-xl px-4 py-1 rounded-md shadow-inner shadow-primary/10">
                          {leftVotes}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-sm uppercase font-bold text-muted-foreground mb-1">Total</div>
                        <div className="bg-muted text-foreground font-bold text-lg px-4 py-1 rounded-md shadow-inner">
                          {leftVotes + rightVotes}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-sm uppercase font-bold text-muted-foreground mb-1 truncate max-w-[120px]">
                          {isStandaloneMode ? "Right" : (optionBText || "Right")}
                        </div>
                        <div className="bg-destructive/30 border border-destructive/50 text-destructive font-racing text-xl px-4 py-1 rounded-md shadow-inner shadow-destructive/10">
                          {rightVotes}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative h-32 rounded-lg overflow-hidden bg-gradient-to-r from-neutral-800 to-neutral-900 flex items-center">
                      {/* Main platform in the middle */}
                      <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 w-[60%] h-full border-x-4 border-white/70 bg-black/40">
                        {/* Platform pattern */}
                        <div className="absolute inset-0" style={{ 
                          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255, 255, 255, 0.05) 20px, rgba(255, 255, 255, 0.05) 40px)',
                        }}></div>
                      </div>
                      
                      {/* Off-ramp areas (danger zones) on each side with diagonal stripes */}
                      <div className="absolute left-0 top-0 bottom-0 w-[20%] bg-gradient-to-r from-red-900/80 to-red-700/60 overflow-hidden">
                        {/* Diagonal stripes for off-ramp effect - more pronounced */}
                        <div className="absolute inset-0" style={{ 
                          backgroundImage: 'repeating-linear-gradient(145deg, transparent, transparent 6px, rgba(255, 0, 0, 0.4) 6px, rgba(255, 0, 0, 0.4) 12px)',
                          backgroundSize: '24px 24px'
                        }}></div>
                        {/* Edge marking clearly showing the boundary */}
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/90"></div>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-800/70"></div>
                      </div>
                      <div className="absolute right-0 top-0 bottom-0 w-[20%] bg-gradient-to-l from-red-900/80 to-red-700/60 overflow-hidden">
                        {/* Diagonal stripes for off-ramp effect, mirrored - more pronounced */}
                        <div className="absolute inset-0" style={{ 
                          backgroundImage: 'repeating-linear-gradient(215deg, transparent, transparent 6px, rgba(255, 0, 0, 0.4) 6px, rgba(255, 0, 0, 0.4) 12px)',
                          backgroundSize: '24px 24px'
                        }}></div>
                        {/* Edge marking clearly showing the boundary */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/90"></div>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-800/70"></div>
                      </div>
                      
                      {/* Center divider line */}
                      <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-px h-full bg-primary"></div>
                      
                      {/* Cars positioned for sumo contest */}
                      {/* Left car (facing right - toward center) */}
                      <div className="absolute top-1/2 transform -translate-y-1/2" 
                           style={{ 
                             // Left car with nose touching center line
                             // As leftPosition increases, car moves right (forward)
                             right: `calc(50% - ${leftPosition}%)`, 
                             transition: 'right 0.3s ease-out',
                             zIndex: 10
                           }}>
                        {leftExploded ? (
                          <div className="relative">
                            <div className="h-14 w-14 flex items-center justify-center opacity-50">
                              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                                <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                                <circle cx="8.5" cy="17.5" r="2.5"/>
                                <circle cx="15.5" cy="17.5" r="2.5"/>
                              </svg>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-destructive text-2xl">💥</div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-14 w-14 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                              <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                              <circle cx="8.5" cy="17.5" r="2.5"/>
                              <circle cx="15.5" cy="17.5" r="2.5"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Right car (facing left - toward center) */}
                      <div className="absolute top-1/2 transform -translate-y-1/2" 
                           style={{ 
                             // Right car with nose touching center line
                             // As rightPosition increases, right car gets pushed right (away from center)
                             left: `calc(50% + ${rightPosition}%)`,
                             transition: 'left 0.3s ease-out',
                             zIndex: 9
                           }}>
                        {rightExploded ? (
                          <div className="relative">
                            <div className="h-14 w-14 flex items-center justify-center opacity-50" style={{ transform: 'scaleX(-1)' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                                <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                                <circle cx="8.5" cy="17.5" r="2.5"/>
                                <circle cx="15.5" cy="17.5" r="2.5"/>
                              </svg>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-destructive text-2xl">💥</div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-14 w-14 flex items-center justify-center" style={{ transform: 'scaleX(-1)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                              <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                              <circle cx="8.5" cy="17.5" r="2.5"/>
                              <circle cx="15.5" cy="17.5" r="2.5"/>
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Platform edges - more visible - used for explosion detection */}
                      <div className="absolute left-[20%] top-0 bottom-0 w-1 bg-white opacity-90"></div>
                      <div className="absolute right-[20%] top-0 bottom-0 w-1 bg-white opacity-90"></div>
                      
                      {/* Countdown overlay */}
                      {gameState === "countdown" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <div className="text-6xl font-racing text-primary">{countdownValue}</div>
                        </div>
                      )}
                      
                      {/* Game result overlay */}
                      {gameState === "finished" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <div className="text-center">
                            <div className="text-3xl font-racing mb-1">
                              {gameResult?.won ? (
                                <span className="text-primary">You Win!</span>
                              ) : (
                                <span className="text-destructive">You Lose!</span>
                              )}
                            </div>
                            <div className="text-lg">
                              Time: {(gameResult?.time || 0) / 1000}s
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Race info bar */}
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                          {gameState === "racing" ? (
                            <Timer className="h-5 w-5" />
                          ) : gameState === "finished" ? (
                            gameResult?.won ? <Trophy className="h-5 w-5" /> : <Flag className="h-5 w-5" />
                          ) : (
                            <Zap className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            {gameState === "racing" 
                              ? `Time: ${(raceTime / 1000).toFixed(2)}s`
                              : gameState === "finished"
                                ? `Finished in ${(gameResult?.time || 0) / 1000}s`
                                : "Poll Racing Game"}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {gameState === "racing" 
                              ? "Click the thumbs-up button to vote!" 
                              : gameState === "finished"
                                ? gameResult?.won ? "Great job! You won the race!" : "Better luck next time!"
                                : "Vote to advance your choice!"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="hidden md:flex items-center space-x-2">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <span className="text-xs">L</span>
                          </div>
                          <span className="text-xs ml-1">{isStandaloneMode ? "Left" : (optionAText || "Left")}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">vs</span>
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                            <span className="text-xs">R</span>
                          </div>
                          <span className="text-xs ml-1">{isStandaloneMode ? "Right" : (optionBText || "Right")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Game controls */}
                  <div className="flex justify-center">
                    {gameState === "ready" && (
                      <div className="w-full max-w-md flex flex-col items-center">
                        <button 
                          className="w-16 h-16 rounded-full bg-primary mb-4 flex items-center justify-center text-black hover:bg-primary/80 transition-colors"
                          disabled={true}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-50">
                            <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75A.75.75 0 0 1 15 2a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
                          </svg>
                        </button>
                        {/* Car selection in standalone mode */}
                        {isStandaloneMode && (
                          <div className="w-full mb-6">
                            <h3 className="text-center text-lg font-medium mb-4">Select Your Car</h3>
                            <div className="flex justify-center gap-6">
                              <div 
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${userCarSelection === "left" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                                onClick={() => setUserCarSelection("left")}
                              >
                                <div className="flex flex-col items-center">
                                  <div className="mb-2 bg-background p-3 rounded-full">
                                    <div className="w-12 h-12 flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                                        <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                                        <circle cx="8.5" cy="17.5" r="2.5"/>
                                        <circle cx="15.5" cy="17.5" r="2.5"/>
                                      </svg>
                                    </div>
                                  </div>
                                  <span className="font-medium">{isStandaloneMode ? "Left Car" : optionAText || "Left Car"}</span>
                                </div>
                              </div>
                              
                              <div 
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${userCarSelection === "right" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                                onClick={() => setUserCarSelection("right")}
                              >
                                <div className="flex flex-col items-center">
                                  <div className="mb-2 bg-background p-3 rounded-full">
                                    <div className="w-12 h-12 flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                                        <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                                        <circle cx="8.5" cy="17.5" r="2.5"/>
                                        <circle cx="15.5" cy="17.5" r="2.5"/>
                                      </svg>
                                    </div>
                                  </div>
                                  <span className="font-medium">{isStandaloneMode ? "Right Car" : optionBText || "Right Car"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Check if this is a standalone game or if there's no saved game for this poll ID */}
                        {(() => {
                          // For standalone mode, always show the button
                          if (isStandaloneMode) {
                            return (
                              <>
                                <Button 
                                  className="btn-gold w-full"
                                  size="lg"
                                  onClick={startCountdown}
                                  disabled={!userCarSelection}
                                >
                                  Start Race
                                </Button>
                                
                                {!userCarSelection ? (
                                  <p className="text-sm text-muted-foreground mt-2">Select a car to start racing</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground mt-2">Click Start to enable voting</p>
                                )}
                              </>
                            );
                          }
                          
                          // For challenge mode, first check if it's an expired challenge
                          if (isExpiredChallenge) {
                            console.log("This is an expired challenge - checking for saved game");
                            
                            // Check if there's a saved game for this challenge
                            const savedGame = localStorage.getItem(`raceGame_poll_${pollId}`);
                            
                            // If there's a saved game that's finished, show the completion message
                            if (savedGame) {
                              try {
                                const parsedState = JSON.parse(savedGame);
                                if (parsedState.gameState === "finished") {
                                  return (
                                    <p className="text-sm text-muted-foreground mt-2">This challenge race has already been completed</p>
                                  );
                                }
                              } catch (e) {
                                console.error("Failed to parse saved race game state", e);
                              }
                            }
                            
                            // The challenge is expired but hasn't been played yet - use a special variable
                            // to track this state
                            if (gameState === "ready") {
                              return (
                                <>
                                  <Button 
                                    className="btn-gold w-full"
                                    size="lg"
                                    onClick={startCountdown}
                                  >
                                    Start Race
                                  </Button>
                                  <p className="text-sm text-muted-foreground mt-2">Click Start to begin this expired challenge race</p>
                                </>
                              );
                            }
                          } else {
                            // For active challenges, check if there's a saved game
                            const savedGame = pollId > 0 ? localStorage.getItem(`raceGame_poll_${pollId}`) : null;
                            
                            if (savedGame) {
                              // If there's a saved game, parse it to check if it's completed
                              try {
                                const parsedState = JSON.parse(savedGame);
                                
                                // If game is finished, show the message instead of the button
                                if (parsedState.gameState === "finished") {
                                  return (
                                    <p className="text-sm text-muted-foreground mt-2">This challenge race has already been completed</p>
                                  );
                                }
                              } catch (e) {
                                console.error("Failed to parse saved game state", e);
                              }
                            }
                          }
                          
                          // If none of the conditions match, show the standard button
                          return (
                            <>
                              <Button 
                                className="btn-gold w-full"
                                size="lg"
                                onClick={startCountdown}
                              >
                                Start Race
                              </Button>
                              <p className="text-sm text-muted-foreground mt-2">Click Start to enable voting</p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    
                    {gameState === "countdown" && (
                      <div className="w-full max-w-md flex flex-col items-center">
                        <button 
                          className="w-16 h-16 rounded-full bg-primary mb-4 flex items-center justify-center text-black hover:bg-primary/80 transition-colors animate-pulse"
                          disabled={true}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-70">
                            <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75A.75.75 0 0 1 15 2a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
                          </svg>
                        </button>
                        <p className="text-sm text-muted-foreground animate-pulse">Get ready to vote...</p>
                      </div>
                    )}
                    
                    {gameState === "finished" && (
                      <div className="w-full max-w-md flex flex-col items-center">
                        <button 
                          className="w-16 h-16 rounded-full bg-primary mb-4 flex items-center justify-center text-black hover:bg-primary/80 transition-colors"
                          disabled={true}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-50">
                            <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75A.75.75 0 0 1 15 2a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
                          </svg>
                        </button>
                        
                        {/* Only show Race Again button for standalone games */}
                        {isStandaloneMode && (
                          <Button 
                            className="btn-gold w-full"
                            size="lg"
                            onClick={resetGame}
                          >
                            Race Again
                          </Button>
                        )}
                        
                        {/* Show a detailed completion message for challenge games */}
                        {!isStandaloneMode && (
                          <div className="text-center bg-muted/60 p-4 rounded-lg mt-4 max-w-md">
                            <h3 className="text-lg font-medium mb-2">Race Results</h3>
                            
                            <div className="flex justify-between gap-3 mb-5">
                              <div className="flex-1 rounded bg-muted p-3 text-center">
                                <span className="text-xs text-muted-foreground block mb-1">Result</span>
                                <div className="flex items-center justify-center gap-2">
                                  {gameResult?.won ? (
                                    <>
                                      <Trophy className="h-4 w-4 text-green-500" />
                                      <span className="font-medium">Victory</span>
                                    </>
                                  ) : (
                                    <>
                                      <XIcon className="h-4 w-4 text-red-500" />
                                      <span className="font-medium">Defeat</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-1 rounded bg-muted p-3 text-center">
                                <span className="text-xs text-muted-foreground block mb-1">Time</span>
                                <div className="flex items-center justify-center gap-2">
                                  <Timer className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{(gameResult?.time || 0)/1000}s</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Visual race track result */}
                            <div className="bg-black p-2 rounded-md">
                              <div className="relative h-10 flex items-center justify-center">
                                {/* Center line */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 h-full bg-yellow-400"></div>
                                
                                {/* Car positions */}
                                {gameResult?.won ? (
                                  <>
                                    {/* User won, show their car on right side */}
                                    <div className="absolute left-[65%] top-1/2 -translate-y-1/2">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                                        <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7" />
                                        <circle cx="8.5" cy="17.5" r="2.5" />
                                        <circle cx="15.5" cy="17.5" r="2.5" />
                                      </svg>
                                    </div>
                                    
                                    {/* Explosion on the right side */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flame">
                                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                                      </svg>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* User lost, show explosion on left side */}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flame">
                                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                                      </svg>
                                    </div>
                                    
                                    {/* Opponent car on the right side */}
                                    <div className="absolute right-[65%] top-1/2 -translate-y-1/2">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                                        <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7" />
                                        <circle cx="8.5" cy="17.5" r="2.5" />
                                        <circle cx="15.5" cy="17.5" r="2.5" />
                                      </svg>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3 text-xs text-muted-foreground">
                              This challenge race has been completed and cannot be replayed.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {gameState === "racing" && (
                      <div className="w-full max-w-md flex flex-col items-center">
                        <div className="flex justify-center space-x-8 mb-4">
                          {/* Left car vote button - only shown if user voted for the left car */}
                          {userCar === "left" && (
                            <div className="flex flex-col items-center">
                              <button 
                                className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-black hover:bg-primary/80 transition-colors"
                                onClick={() => handleLeftVote()}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                  <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75A.75.75 0 0 1 15 2a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
                                </svg>
                              </button>
                              <div className="mt-2 text-center">
                                <p className="text-sm font-medium">Push {isStandaloneMode ? "Left Car" : (optionAText || "Left Car")}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Right car vote button - only shown if user voted for the right car */}
                          {userCar === "right" && (
                            <div className="flex flex-col items-center">
                              <button 
                                className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-black hover:bg-primary/80 transition-colors"
                                onClick={() => handleRightVote()}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                  <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75A.75.75 0 0 1 15 2a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
                                </svg>
                              </button>
                              <div className="mt-2 text-center">
                                <p className="text-sm font-medium">Push {isStandaloneMode ? "Right Car" : (optionBText || "Right Car")}</p>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="border-t pt-4 flex flex-wrap gap-4">
                  <div className="bg-muted rounded p-3 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 text-primary">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium">Best Time</h5>
                      <p className="text-xs text-muted-foreground">{getBestTime()}</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded p-3 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 text-primary">
                      <Flag className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium">Races</h5>
                      <p className="text-xs text-muted-foreground">{userRaces?.length || 0} total</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded p-3 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 text-primary">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-medium">Win Rate</h5>
                      <p className="text-xs text-muted-foreground">{getWinRate()}</p>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
            
            <div>
              <Achievements achievements={userAchievements || []} />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
