import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Trophy, Flag, Loader2, Timer, Zap } from "lucide-react";
import { useLocation } from "wouter";
import type { RaceRecord } from "../../../shared/schema";

// Game constants
const PUSH_POWER = 3; // How much pushing power each vote provides
const MAX_POSITION = 30; // Maximum possible position value
const PLATFORM_EDGE = 30; // Position at which a car falls off the ramp (equivalent to 10 steps from center)
const CENTER_POSITION = 0; // Starting position at center

// Using white racecar SVG images for better reliability
const carImages = [
  // White racing car with front/hood at right side (for left car)
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2FyIj48cGF0aCBkPSJNMTkgMTdINW0wIDB2MmMwIDEuMS45IDIgMiAyaDEwYTIgMiAwIDAgMCAyLTJ2LTJtMC0zVjZhMiAyIDAgMSAwLTQgMHY0TTUgMTRsMi01aDEyYzAgMCAxLjMgMS40MyAxLjUgM2EuNSA1IDAgMCAxLS41IDJoLTNtLTUgMGgtNyIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjE3LjUiIHI9IjIuNSIvPjxjaXJjbGUgY3g9IjE1LjUiIGN5PSIxNy41IiByPSIyLjUiLz48L3N2Zz4=",
  // White racing car 2
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2FyIj48cGF0aCBkPSJNMTkgMTdINW0wIDB2MmMwIDEuMS45IDIgMiAyaDEwYTIgMiAwIDAgMCAyLTJ2LTJtMC0zVjZhMiAyIDAgMSAwLTQgMHY0TTUgMTRsMi01aDEyYzAgMCAxLjMgMS40MyAxLjUgM2EuNSA1IDAgMCAxLS41IDJoLTNtLTUgMGgtNyIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjE3LjUiIHI9IjIuNSIvPjxjaXJjbGUgY3g9IjE1LjUiIGN5PSIxNy41IiByPSIyLjUiLz48L3N2Zz4=",
  // White racing car 3
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2FyIj48cGF0aCBkPSJNMTkgMTdINW0wIDB2MmMwIDEuMS45IDIgMiAyaDEwYTIgMiAwIDAgMCAyLTJ2LTJtMC0zVjZhMiAyIDAgMSAwLTQgMHY0TTUgMTRsMi01aDEyYzAgMCAxLjMgMS40MyAxLjUgM2EuNSA1IDAgMCAxLS41IDJoLTNtLTUgMGgtNyIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjE3LjUiIHI9IjIuNSIvPjxjaXJjbGUgY3g9IjE1LjUiIGN5PSIxNy41IiByPSIyLjUiLz48L3N2Zz4=",
  // White racing car 4
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
  
  // Check if this is an embedded component in challenge page
  const isEmbedded = propPollId !== undefined;
  
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
  
  // Check for saved state - prevents game restart on page refresh
  useEffect(() => {
    // For standalone race game
    if (isStandaloneMode) {
      const savedState = localStorage.getItem(`raceGame_standalone`);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.gameState === "finished" && parsedState.gameResult) {
            // Restore the finished state
            setGameState("finished");
            setGameResult(parsedState.gameResult);
            setUserCarSelection(parsedState.userCarSelection || "");
          }
        } catch (e) {
          console.error("Failed to parse saved race game state", e);
        }
      }
    }
    
    // For challenge races
    if (pollId > 0) {
      const savedState = localStorage.getItem(`raceGame_poll_${pollId}`);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.gameState === "finished" && parsedState.gameResult) {
            // Restore the finished state for this specific challenge
            setGameState("finished");
            setGameResult(parsedState.gameResult);
          }
        } catch (e) {
          console.error("Failed to parse saved race game state", e);
        }
      }
    }
  }, [isStandaloneMode, pollId]);
  
  // Save game state when it changes to finished
  useEffect(() => {
    if (gameState === "finished" && gameResult) {
      if (isStandaloneMode) {
        localStorage.setItem(`raceGame_standalone`, JSON.stringify({
          gameState,
          gameResult,
          userCarSelection
        }));
      } else if (pollId > 0) {
        localStorage.setItem(`raceGame_poll_${pollId}`, JSON.stringify({
          gameState,
          gameResult
        }));
      }
    }
  }, [gameState, gameResult, isStandaloneMode, pollId, userCarSelection]);
  
  // Auto-start the game when loaded from a challenge
  useEffect(() => {
    // Only auto-start when not in standalone mode and in "ready" state
    if (!isStandaloneMode && gameState === "ready" && userOption) {
      // Small delay to ensure component is fully rendered
      const autoStartTimer = setTimeout(() => {
        startCountdown();
      }, 300);
      
      return () => clearTimeout(autoStartTimer);
    }
  }, [isStandaloneMode, gameState, userOption]);
  
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
    
    // Clear the saved state
    if (isStandaloneMode) {
      localStorage.removeItem(`raceGame_standalone`);
    } else if (pollId > 0) {
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
  
  if (racesLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {!isEmbedded && <Header />}
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
        {!isEmbedded && <Footer />}
      </div>
    );
  }
  
  // For embedded mode (in a challenge page), we render just the card content
  if (isEmbedded) {
    return (
      <div>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Votes and Wars Race</CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {gameState === "racing" ? "Racing!" : gameState === "countdown" ? "Ready..." : gameState === "finished" ? "Finished" : "Ready"}
            </Badge>
          </div>
          <CardDescription>
            {gameState === "ready" 
              ? "Challenge ended! The race will start automatically..."
              : gameState === "countdown" 
                ? "Race starts in..."
                : gameState === "racing"
                  ? "Click the thumbs-up button or use arrow keys!"
                  : "Race complete! View your results below"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Countdown display */}
          {gameState === "countdown" && (
            <div className="py-10 flex justify-center items-center">
              <div className="text-8xl font-bold text-primary">{countdownValue}</div>
            </div>
          )}
          
          {/* Race track - single line with cars facing each other */}
          <div className={`bg-black rounded-lg p-4 mb-4 ${gameState === "ready" ? "opacity-70" : ""}`}>
            {/* Vote counters */}
            <div className="flex justify-between mb-4">
              <div className="flex flex-col items-center">
                <div className="text-sm uppercase font-bold text-muted-foreground mb-1 truncate max-w-[120px]">
                  {optionAText || "Left"}
                </div>
                <div className="bg-primary/30 border border-primary/50 text-primary font-mono text-xl px-4 py-1 rounded-md shadow-inner shadow-primary/10">
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
                  {optionBText || "Right"}
                </div>
                <div className="bg-destructive/30 border border-destructive/50 text-destructive font-mono text-xl px-4 py-1 rounded-md shadow-inner shadow-destructive/10">
                  {rightVotes}
                </div>
              </div>
            </div>
            
            {/* Race track base */}
            <div className="relative h-24 bg-gray-800 rounded overflow-hidden">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-yellow-500 transform -translate-x-1/2 z-10"></div>
              
              {/* Left car */}
              <div 
                className={`absolute top-1/2 transform -translate-y-1/2 transition-all duration-200 ${leftExploded ? 'opacity-50' : ''}`}
                style={{ 
                  left: `calc(40% + ${leftPosition}%)`,
                  transform: `translateY(-50%) ${leftExploded ? 'rotate(90deg)' : ''}`,
                  transition: 'left 0.2s ease-out, transform 0.5s ease-out',
                  filter: leftExploded ? 'drop-shadow(0 0 0.5rem red)' : 'none'
                }}
              >
                <div className="h-12 w-12 flex items-center justify-center">
                  <img src={carImages[selectedCar]} alt="Left car" className="h-full" />
                </div>
              </div>
              
              {/* Right car */}
              <div 
                className={`absolute top-1/2 transform -translate-y-1/2 transition-all duration-200 ${rightExploded ? 'opacity-50' : ''}`}
                style={{ 
                  left: `calc(60% + ${rightPosition}%)`,
                  transform: `translateY(-50%) scaleX(-1) ${rightExploded ? 'rotate(-90deg)' : ''}`,
                  transition: 'left 0.2s ease-out, transform 0.5s ease-out',
                  filter: rightExploded ? 'drop-shadow(0 0 0.5rem red)' : 'none'
                }}
              >
                <div className="h-12 w-12 flex items-center justify-center">
                  <img src={carImages[selectedCar]} alt="Right car" className="h-full" />
                </div>
              </div>
              
              {/* Indicator of which car the user is controlling */}
              {gameState === "racing" && userCar && (
                <div 
                  className="absolute top-0 p-1 bg-primary/30 text-primary text-xs font-bold rounded"
                  style={{ 
                    left: userCar === "left" ? `calc(40% + ${leftPosition}%)` : `calc(60% + ${rightPosition}%)`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  YOU
                </div>
              )}
            </div>
          </div>
          
          {/* Controls for racing and voting */}
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Timer display for racing state */}
            {gameState === "racing" && (
              <div className="flex items-center justify-center mb-4">
                <div className="bg-background border rounded-md px-4 py-2 flex items-center space-x-2">
                  <Timer className="h-5 w-5 text-muted-foreground" />
                  <span className="font-mono text-lg">{(raceTime / 1000).toFixed(2)}s</span>
                </div>
              </div>
            )}
            
            {/* Vote buttons - only shown during racing */}
            {gameState === "racing" && (
              <div className="flex justify-center space-x-4">
                {userCar === "left" ? (
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                    onClick={handleLeftVote}
                    disabled={leftExploded || rightExploded}
                  >
                    Push Right <span className="ml-2">→</span>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-8"
                    onClick={handleRightVote}
                    disabled={leftExploded || rightExploded}
                  >
                    <span className="mr-2">←</span> Push Left
                  </Button>
                )}
              </div>
            )}
            
            {/* Game state indicators */}
            {gameState !== "racing" && (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {gameState === "racing" ? (
                      <Timer className="h-5 w-5" />
                    ) : gameState === "finished" ? (
                      gameResult?.won ? <Trophy className="h-5 w-5" /> : <Flag className="h-5 w-5" />
                    ) : (
                      <Zap className="h-5 w-5" />
                    )}
                  </div>
                </div>

                {/* Results for finished games */}
                {gameState === "finished" && (
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-1">{gameResult?.won ? "Victory!" : "Game Over"}</h3>
                    <p className="text-sm text-muted-foreground">
                      You finished in {((gameResult?.time || 0) / 1000).toFixed(2)} seconds
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </div>
    );
  } else {
    // For standalone mode, we include header, footer, and navigation
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
                            ? "Press the buttons or use arrow keys to race!"
                            : "Race complete! View your results below"}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Car selection grid (visible in ready state) */}
                    {gameState === "ready" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div
                          className={`relative flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-all
                            ${userCarSelection === "left" ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"}`}
                          onClick={() => setUserCarSelection("left")}
                        >
                          <div className="h-20 w-20 flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car">
                              <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                              <circle cx="8.5" cy="17.5" r="2.5"/>
                              <circle cx="15.5" cy="17.5" r="2.5"/>
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold mb-1">Left Car</h3>
                          <p className="text-sm text-muted-foreground text-center">Pushes opponent to the right</p>
                          
                          {userCarSelection === "left" && (
                            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                              Selected
                            </Badge>
                          )}
                        </div>
                        
                        <div
                          className={`relative flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-all
                            ${userCarSelection === "right" ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"}`}
                          onClick={() => setUserCarSelection("right")}
                        >
                          <div className="h-20 w-20 flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-car" style={{ transform: 'scaleX(-1)' }}>
                              <path d="M19 17H5m0 0v2c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2v-2m0-3V6a2 2 0 1 0-4 0v4M5 14l2-5h12c0 0 1.3 1.43 1.5 3a.5 5 0 0 1-.5 2h-3m-5 0h-7"/>
                              <circle cx="8.5" cy="17.5" r="2.5"/>
                              <circle cx="15.5" cy="17.5" r="2.5"/>
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold mb-1">Right Car</h3>
                          <p className="text-sm text-muted-foreground text-center">Pushes opponent to the left</p>
                          
                          {userCarSelection === "right" && (
                            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                              Selected
                            </Badge>
                          )}
                        </div>
                        
                        <div className="col-span-1 sm:col-span-2 flex justify-center mt-4">
                          <Button 
                            className="btn-gold w-full max-w-md"
                            size="lg"
                            onClick={startCountdown}
                            disabled={!userCarSelection}
                          >
                            Start Race
                          </Button>
                          
                          {!userCarSelection && (
                            <p className="text-sm text-muted-foreground mt-2">Select a car to start racing</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Countdown display */}
                    {gameState === "countdown" && (
                      <div className="py-10 flex justify-center items-center">
                        <div className="text-8xl font-bold text-primary">{countdownValue}</div>
                      </div>
                    )}
                    
                    {/* Race track - single line with cars facing each other */}
                    <div className={`bg-black rounded-lg p-4 mb-4 ${gameState === "ready" ? "opacity-70" : ""}`}>
                      {/* Vote counters */}
                      <div className="flex justify-between mb-4">
                        <div className="flex flex-col items-center">
                          <div className="text-sm uppercase font-bold text-muted-foreground mb-1 truncate max-w-[120px]">
                            Left
                          </div>
                          <div className="bg-primary/30 border border-primary/50 text-primary font-mono text-xl px-4 py-1 rounded-md shadow-inner shadow-primary/10">
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
                            Right
                          </div>
                          <div className="bg-destructive/30 border border-destructive/50 text-destructive font-mono text-xl px-4 py-1 rounded-md shadow-inner shadow-destructive/10">
                            {rightVotes}
                          </div>
                        </div>
                      </div>
                      
                      {/* Race track base */}
                      <div className="relative h-24 bg-gray-800 rounded overflow-hidden">
                        {/* Center line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-yellow-500 transform -translate-x-1/2 z-10"></div>
                        
                        {/* Left car */}
                        <div 
                          className={`absolute top-1/2 transform -translate-y-1/2 transition-all duration-200 ${leftExploded ? 'opacity-50' : ''}`}
                          style={{ 
                            left: `calc(40% + ${leftPosition}%)`,
                            transform: `translateY(-50%) ${leftExploded ? 'rotate(90deg)' : ''}`,
                            transition: 'left 0.2s ease-out, transform 0.5s ease-out',
                            filter: leftExploded ? 'drop-shadow(0 0 0.5rem red)' : 'none'
                          }}
                        >
                          <div className="h-12 w-12 flex items-center justify-center">
                            <img src={carImages[selectedCar]} alt="Left car" className="h-full" />
                          </div>
                        </div>
                        
                        {/* Right car */}
                        <div 
                          className={`absolute top-1/2 transform -translate-y-1/2 transition-all duration-200 ${rightExploded ? 'opacity-50' : ''}`}
                          style={{ 
                            left: `calc(60% + ${rightPosition}%)`,
                            transform: `translateY(-50%) scaleX(-1) ${rightExploded ? 'rotate(-90deg)' : ''}`,
                            transition: 'left 0.2s ease-out, transform 0.5s ease-out',
                            filter: rightExploded ? 'drop-shadow(0 0 0.5rem red)' : 'none'
                          }}
                        >
                          <div className="h-12 w-12 flex items-center justify-center">
                            <img src={carImages[selectedCar]} alt="Right car" className="h-full" />
                          </div>
                        </div>
                        
                        {/* Indicator of which car the user is controlling */}
                        {gameState === "racing" && userCar && (
                          <div 
                            className="absolute top-0 p-1 bg-primary/30 text-primary text-xs font-bold rounded"
                            style={{ 
                              left: userCar === "left" ? `calc(40% + ${leftPosition}%)` : `calc(60% + ${rightPosition}%)`,
                              transform: 'translateX(-50%)',
                            }}
                          >
                            YOU
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Controls for racing and voting */}
                    <div className="flex flex-col items-center justify-center space-y-4">
                      {/* Timer display for racing state */}
                      {gameState === "racing" && (
                        <div className="flex items-center justify-center mb-4">
                          <div className="bg-background border rounded-md px-4 py-2 flex items-center space-x-2">
                            <Timer className="h-5 w-5 text-muted-foreground" />
                            <span className="font-mono text-lg">{(raceTime / 1000).toFixed(2)}s</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Vote buttons - only shown during racing */}
                      {gameState === "racing" && (
                        <div className="flex justify-center space-x-4">
                          {userCar === "left" ? (
                            <Button
                              size="lg"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                              onClick={handleLeftVote}
                              disabled={leftExploded || rightExploded}
                            >
                              Push Right <span className="ml-2">→</span>
                            </Button>
                          ) : (
                            <Button
                              size="lg"
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-8"
                              onClick={handleRightVote}
                              disabled={leftExploded || rightExploded}
                            >
                              <span className="mr-2">←</span> Push Left
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {/* Game state indicators */}
                      {gameState === "finished" && (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center justify-center mb-2">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                              {gameResult?.won ? <Trophy className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
                            </div>
                          </div>
                          <div className="text-center">
                            <h3 className="text-xl font-bold mb-1">{gameResult?.won ? "Victory!" : "Game Over"}</h3>
                            <p className="text-sm text-muted-foreground">
                              You finished in {((gameResult?.time || 0) / 1000).toFixed(2)} seconds
                            </p>
                          </div>
                          
                          {/* Play again button */}
                          <Button 
                            className="btn-gold mt-6"
                            size="lg"
                            onClick={resetGame}
                          >
                            Play Again
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }
}