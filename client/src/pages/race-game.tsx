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
  // Position from center - higher number means further from center
  // When a car gets a vote, it moves forward (decreases value) and pushes opponent backward (increases value)
  const [leftPosition, setLeftPosition] = useState(30); // Start 30% away from center
  const [rightPosition, setRightPosition] = useState(30); // Start 30% away from center
  const [leftVotes, setLeftVotes] = useState(0);
  const [rightVotes, setRightVotes] = useState(0);
  const [selectedCar, setSelectedCar] = useState(0);
  const [gameResult, setGameResult] = useState<{ won: boolean; time: number } | null>(null);
  const [leftExploded, setLeftExploded] = useState(false);
  const [rightExploded, setRightExploded] = useState(false);
  
  const raceTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Constants for the race game
  const PLATFORM_WIDTH = 60; // Percentage of the track width
  const MOVE_STEP = 5; // Percentage to move when a car wins a round
  
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
    // Initial position - cars start at a distance from center (higher value = further from center)
    setLeftPosition(40); // Left car starts 40% from center on left side
    setRightPosition(40); // Right car starts 40% from center on right side
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
      
      // Left arrow or 'A' key votes for the left car
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        setLeftPosition(prev => {
          const newPos = prev + 5; // Move 5% each press
          
          if (newPos >= 100) {
            const elapsed = Date.now() - (startTimeRef.current || 0);
            finishRace(true, elapsed);
            return 100;
          }
          
          return newPos;
        });
      }
      
      // Right arrow or 'D' key votes for the right car
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        setRightPosition(prev => {
          const newPos = prev + 5; // Move 5% each press
          
          if (newPos >= 100) {
            const elapsed = Date.now() - (startTimeRef.current || 0);
            finishRace(false, elapsed);
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
    setLeftPosition(40); // Initial position matches startRace
    setRightPosition(40); // Initial position matches startRace
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
                      <div className="absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2 w-[60%] h-full border-x-4 border-white/30 bg-black/40"></div>
                      
                      {/* Ramps on each side with diagonal stripes */}
                      <div className="absolute left-0 top-0 bottom-0 w-[20%] bg-gradient-to-r from-red-900/50 to-red-700/30 overflow-hidden">
                        {/* Diagonal stripes for ramp effect */}
                        <div className="absolute inset-0" style={{ 
                          backgroundImage: 'repeating-linear-gradient(145deg, transparent, transparent 8px, rgba(255, 0, 0, 0.2) 8px, rgba(255, 0, 0, 0.2) 16px)',
                          backgroundSize: '32px 32px'
                        }}></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/70"></div>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-800/40"></div>
                      </div>
                      <div className="absolute right-0 top-0 bottom-0 w-[20%] bg-gradient-to-l from-red-900/50 to-red-700/30 overflow-hidden">
                        {/* Diagonal stripes for ramp effect, mirrored */}
                        <div className="absolute inset-0" style={{ 
                          backgroundImage: 'repeating-linear-gradient(215deg, transparent, transparent 8px, rgba(255, 0, 0, 0.2) 8px, rgba(255, 0, 0, 0.2) 16px)',
                          backgroundSize: '32px 32px'
                        }}></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/70"></div>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-800/40"></div>
                      </div>
                      
                      {/* Center divider line */}
                      <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-px h-full bg-primary"></div>
                      
                      {/* Cars positioned nose-to-nose at the center line */}
                      {/* Left car (facing right - toward center) */}
                      <div className="absolute top-1/2 transform -translate-y-1/2" 
                           style={{ 
                             // Position from center: 50% - position%
                             // This way when position decreases (car moves forward), it gets closer to center
                             left: `${50 - leftPosition}%`, 
                             transition: 'left 0.3s ease-out',
                             zIndex: 10
                           }}>
                        {leftExploded ? (
                          <div className="relative">
                            <img 
                              src={carImages[selectedCar]} 
                              alt="Left car" 
                              className="h-12 w-auto opacity-50"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-destructive text-2xl">💥</div>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={carImages[selectedCar]} 
                            alt="Left car" 
                            className="h-12 w-auto"
                          />
                        )}
                      </div>
                      
                      {/* Right car (facing left - toward center) */}
                      <div className="absolute top-1/2 transform -translate-y-1/2" 
                           style={{ 
                             // Position from center: 50% - position%
                             // This way when position decreases (car moves forward), it gets closer to center
                             right: `${50 - rightPosition}%`, 
                             transition: 'right 0.3s ease-out',
                             zIndex: 9
                           }}>
                        {rightExploded ? (
                          <div className="relative">
                            <img 
                              src={carImages[(selectedCar + 2) % carImages.length]} 
                              alt="Right car" 
                              className="h-12 w-auto opacity-50"
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
                            className="h-12 w-auto"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                        )}
                      </div>

                      {/* Platform edges - more visible */}
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
                            // Generate a vote for either the left or right car
                            const random = Math.random();
                            let newLeftVotes = leftVotes;
                            let newRightVotes = rightVotes;
                            
                            if (random > 0.5) {
                              // Vote for left car
                              newLeftVotes += 1;
                              setLeftVotes(newLeftVotes);
                            } else {
                              // Vote for right car
                              newRightVotes += 1;
                              setRightVotes(newRightVotes);
                            }
                            
                            // After voting, one car pushes the other (they always remain nose-to-nose)
                            setTimeout(() => {
                              if (random > 0.5) {
                                // Left car got the vote - move forward, pushing right car back
                                const moveAmount = MOVE_STEP;
                                
                                // Left car moves forward (decreasing value to get closer to center)
                                setLeftPosition(prev => {
                                  // Moving forward means getting closer to center (reducing value)
                                  const newPos = Math.max(0, prev - moveAmount);
                                  return newPos;
                                });
                                
                                // Right car gets pushed back (increasing value to move away from center)
                                setTimeout(() => {
                                  setRightPosition(prev => {
                                    // Being pushed back means moving away from center (increasing value)
                                    const newPos = prev + moveAmount;
                                    
                                    // Check if car fell off the platform
                                    if (newPos >= PLATFORM_WIDTH / 2) {
                                      setRightExploded(true);
                                      const elapsed = Date.now() - (startTimeRef.current || 0);
                                      // Delay finish to show explosion
                                      setTimeout(() => {
                                        finishRace(true, elapsed); // Left wins
                                      }, 800);
                                      return PLATFORM_WIDTH / 2;
                                    }
                                    
                                    return newPos;
                                  });
                                }, 50);
                              } else {
                                // Right car got the vote - move forward, pushing left car back
                                const moveAmount = MOVE_STEP;
                                
                                // Right car moves forward (decreasing value to get closer to center)
                                setRightPosition(prev => {
                                  // Moving forward means getting closer to center (reducing value)
                                  const newPos = Math.max(0, prev - moveAmount);
                                  return newPos;
                                });
                                
                                // Left car gets pushed back (increasing value to move away from center)
                                setTimeout(() => {
                                  setLeftPosition(prev => {
                                    // Being pushed back means moving away from center (increasing value)
                                    const newPos = prev + moveAmount;
                                    
                                    // Check if car fell off the platform
                                    if (newPos >= PLATFORM_WIDTH / 2) {
                                      setLeftExploded(true);
                                      const elapsed = Date.now() - (startTimeRef.current || 0);
                                      // Delay finish to show explosion
                                      setTimeout(() => {
                                        finishRace(false, elapsed); // Right wins
                                      }, 800);
                                      return PLATFORM_WIDTH / 2;
                                    }
                                    
                                    return newPos;
                                  });
                                }, 50);
                              }
                              // If votes are tied, neither car moves
                            }, 500); // Short delay to show the vote count change first
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
