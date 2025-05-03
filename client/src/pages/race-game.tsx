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
import { Loader2, ChevronLeft, Trophy, Flag, Timer, Award, Zap } from "lucide-react";
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

export default function RaceGame() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [searchParams] = useLocation();
  const pollId = Number(new URLSearchParams(searchParams).get("pollId") || "0");
  const option = new URLSearchParams(searchParams).get("option") || "A";
  
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
  // Determine which car the user voted for (left = A, right = B)
  const userCar = option === "A" ? "left" : "right";
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
                      {carImages.map((car, index) => (
                        <div 
                          key={index}
                          className={`border rounded-md p-4 cursor-pointer transition-all ${selectedCar === index ? "ring-2 ring-primary border-primary" : "hover:border-primary"}`}
                          onClick={() => setSelectedCar(index)}
                        >
                          <div className="aspect-square flex items-center justify-center">
                            <img 
                              src={car} 
                              alt={`Race car ${index + 1}`}
                              className="w-20 h-20 object-contain"
                            />
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
                        <div className="text-sm uppercase font-bold text-muted-foreground mb-1">Left</div>
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
                        <div className="text-sm uppercase font-bold text-muted-foreground mb-1">Right</div>
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
                            <img 
                              src={carImages[selectedCar]} 
                              alt="Left car" 
                              className="h-14 w-auto opacity-50"
                              style={{ transform: 'scaleX(1)' }} /* Left car facing right */
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-destructive text-2xl">💥</div>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={carImages[selectedCar]} 
                            alt="Left car" 
                            className="h-14 w-auto"
                            style={{ transform: 'scaleX(1)' }} /* Left car facing right */
                          />
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
                            <img 
                              src={carImages[(selectedCar + 2) % carImages.length]} 
                              alt="Right car" 
                              className="h-14 w-auto opacity-50"
                              style={{ transform: 'scaleX(-1)' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-destructive text-2xl">💥</div>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={carImages[(selectedCar + 2) % carImages.length]} 
                            alt="Right car" 
                            className="h-14 w-auto"
                            style={{ transform: 'scaleX(-1)' }}
                          />
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
                          <span className="text-xs ml-1">Left</span>
                        </div>
                        <span className="text-xs text-muted-foreground">vs</span>
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                            <span className="text-xs">R</span>
                          </div>
                          <span className="text-xs ml-1">Right</span>
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
                        <Button 
                          className="btn-gold w-full"
                          size="lg"
                          onClick={startCountdown}
                        >
                          Start Race
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">Click Start to enable voting</p>
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
                        <Button 
                          className="btn-gold w-full"
                          size="lg"
                          onClick={resetGame}
                        >
                          Race Again
                        </Button>
                      </div>
                    )}
                    
                    {gameState === "racing" && (
                      <div className="w-full max-w-md flex flex-col items-center">
                        <button 
                          className="w-16 h-16 rounded-full bg-primary mb-4 flex items-center justify-center text-black hover:bg-primary/80 transition-colors"
                          onClick={() => {
                            // Handle the vote for the left car using our centralized function
                            handleLeftVote();
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                            <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75A.75.75 0 0 1 15 2a2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
                          </svg>
                        </button>
                        <p className="text-sm text-muted-foreground">Click the Thumb-Up button to vote!</p>
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
