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

// Race car images
const carImages = [
  "https://cdn-icons-png.flaticon.com/512/4955/4955169.png",
  "https://cdn-icons-png.flaticon.com/512/4955/4955198.png",
  "https://cdn-icons-png.flaticon.com/512/4955/4955126.png",
  "https://cdn-icons-png.flaticon.com/512/4955/4955139.png"
];

export default function RaceGame() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [gameState, setGameState] = useState<"ready" | "countdown" | "racing" | "finished">("ready");
  const [countdownValue, setCountdownValue] = useState(3);
  const [raceTime, setRaceTime] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [aiPosition, setAiPosition] = useState(0);
  const [selectedCar, setSelectedCar] = useState(0);
  const [gameResult, setGameResult] = useState<{ won: boolean; time: number } | null>(null);
  
  const raceTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const aiSpeedRef = useRef(Math.random() * 3 + 8); // Random AI speed between 8-11
  
  const { data: userRaces, isLoading: racesLoading } = useQuery({
    queryKey: ["/api/user/races"],
  });
  
  const { data: userAchievements, isLoading: achievementsLoading } = useQuery({
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
    setPlayerPosition(0);
    setAiPosition(0);
    setRaceTime(0);
    
    startTimeRef.current = Date.now();
    
    // Start race timer
    raceTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      setRaceTime(elapsed);
      
      // Move AI car
      setAiPosition(prev => {
        const newPos = prev + aiSpeedRef.current;
        if (newPos >= 100) {
          finishRace(false, elapsed);
        }
        return Math.min(newPos, 100);
      });
    }, 100);
  };
  
  // Handle key presses for player car
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "racing") return;
      
      if (e.code === "ArrowRight" || e.code === "Space") {
        setPlayerPosition(prev => {
          const newPos = prev + 5; // Move 5% each press
          
          if (newPos >= 100) {
            const elapsed = Date.now() - (startTimeRef.current || 0);
            finishRace(true, elapsed);
            return 100;
          }
          
          return newPos;
        });
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);
  
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
    aiSpeedRef.current = Math.random() * 3 + 8; // Random AI speed for next race
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
                          ? "Press Space or Right Arrow repeatedly to accelerate!"
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
                    <div className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-r from-neutral-800 to-neutral-900 flex items-center">
                      {/* Track markings - Single middle line */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-px bg-white opacity-30"></div>
                      </div>
                      
                      {/* Center divider line */}
                      <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-px h-full bg-primary"></div>
                      
                      {/* Left Player car (facing right) */}
                      <div className="absolute top-1/2 transform -translate-y-1/2" 
                           style={{ 
                             left: `${playerPosition}%`, 
                             transition: 'left 0.1s ease-out' 
                           }}>
                        <img 
                          src={carImages[selectedCar]} 
                          alt="Player car" 
                          className="h-10 w-auto"
                        />
                      </div>
                      
                      {/* Right AI car (facing left) */}
                      <div className="absolute top-1/2 transform -translate-y-1/2" 
                           style={{ 
                             right: `${100 - aiPosition}%`, 
                             transition: 'right 0.1s ease-out' 
                           }}>
                        <img 
                          src={carImages[(selectedCar + 2) % carImages.length]} 
                          alt="AI car" 
                          className="h-10 w-auto transform scale-x-[-1]" // Flip horizontally
                        />
                      </div>
                      
                      {/* Finish lines on both sides */}
                      <div className="absolute left-[2%] top-0 bottom-0 w-1 bg-white opacity-70"></div>
                      <div className="absolute right-[2%] top-0 bottom-0 w-1 bg-white opacity-70"></div>
                      
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
                              ? "Keep tapping to accelerate!" 
                              : gameState === "finished"
                                ? gameResult?.won ? "Great job! You won the race!" : "Better luck next time!"
                                : "Vote to advance your choice!"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="hidden md:flex items-center space-x-2">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <span className="text-xs">P</span>
                          </div>
                          <span className="text-xs ml-1">You</span>
                        </div>
                        <span className="text-xs text-muted-foreground">vs</span>
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                            <span className="text-xs">AI</span>
                          </div>
                          <span className="text-xs ml-1">CPU</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Game controls */}
                  <div className="flex justify-center">
                    {gameState === "ready" && (
                      <Button 
                        className="btn-gold w-full max-w-md"
                        size="lg"
                        onClick={startCountdown}
                      >
                        Start Race
                      </Button>
                    )}
                    
                    {gameState === "finished" && (
                      <Button 
                        className="btn-gold w-full max-w-md"
                        size="lg"
                        onClick={resetGame}
                      >
                        Race Again
                      </Button>
                    )}
                    
                    {gameState === "racing" && (
                      <div className="w-full max-w-md p-4 border border-dashed rounded-md text-center">
                        <p className="text-lg mb-2">Press <span className="font-bold">Space</span> or <span className="font-bold">→</span> repeatedly!</p>
                        <p className="text-sm text-muted-foreground">Tap quickly to accelerate your car</p>
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
