import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RaceRecord } from "@shared/schema";
import { Trophy, Flag, Timer } from "lucide-react";
import { useLocation } from "wouter";

interface RaceGameProps {
  races: RaceRecord[];
}

export default function RaceGame({ races }: RaceGameProps) {
  const [, navigate] = useLocation();
  
  // Car images from free open source stock
  const carImages = [
    "https://cdn-icons-png.flaticon.com/512/4955/4955169.png",
    "https://cdn-icons-png.flaticon.com/512/4955/4955198.png",
    "https://cdn-icons-png.flaticon.com/512/4955/4955126.png",
    "https://cdn-icons-png.flaticon.com/512/4955/4955139.png"
  ];
  
  // Calculate stats
  const getBestTime = () => {
    if (!races || races.length === 0) return "N/A";
    
    const bestRace = [...races].sort((a, b) => a.time - b.time)[0];
    return `${(bestRace.time / 1000).toFixed(2)}s`;
  };
  
  const getTotalRaces = () => {
    return races?.length || 0;
  };
  
  const getRank = () => {
    const winCount = races?.filter(race => race.won).length || 0;
    
    if (winCount >= 20) return "Diamond";
    if (winCount >= 10) return "Platinum";
    if (winCount >= 5) return "Gold";
    if (winCount >= 3) return "Silver";
    return "Bronze";
  };
  
  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-montserrat font-bold">Data Race Game</CardTitle>
          <Button
            asChild
            size="sm"
            className="bg-primary/20 text-primary text-xs font-medium py-1 px-3 rounded-full hover:bg-primary/30 transition-colors"
          >
            <a href="/race">Play Now</a>
          </Button>
        </div>
        <CardDescription>
          Race to collect data faster than your opponent
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="bg-black rounded-lg p-4 mb-4">
          <div className="game-track h-32 rounded-lg flex items-end relative overflow-hidden bg-gradient-to-r from-neutral-800 to-neutral-900">
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            
            {/* Race track lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-10">
              <div className="h-px bg-white opacity-30"></div>
              <div className="h-px bg-white opacity-30"></div>
            </div>
            
            {/* Race cars */}
            <div className="car-track absolute top-1/3 transform -translate-y-1/2 left-4 right-4 h-8">
              <img 
                src={carImages[0]} 
                alt="Race car" 
                className="absolute left-0 h-8 w-auto race-car"
                style={{ animationDuration: "12s" }}
              />
            </div>
            
            <div className="car-track absolute top-2/3 transform -translate-y-1/2 left-4 right-4 h-8">
              <img 
                src={carImages[2]} 
                alt="Race car" 
                className="absolute left-0 h-8 w-auto race-car"
                style={{ animationDuration: "8s" }}
              />
            </div>
            
            {/* Finish line */}
            <div className="absolute right-4 top-0 bottom-0 w-2 bg-white opacity-70 flex flex-col">
              <div className="h-1/4 bg-black"></div>
              <div className="h-1/4 bg-black"></div>
              <div className="h-1/4 bg-black"></div>
              <div className="h-1/4 bg-black"></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-4">
              <Button 
                size="icon"
                variant="outline"
                className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center"
                onClick={() => navigate("/race")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
              <div>
                <h4 className="text-sm font-medium">Data Speed Race</h4>
                <p className="text-xs text-muted-foreground">Race to visualize your data faster</p>
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
        
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black rounded p-3 flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
              <Trophy className="text-primary text-sm" />
            </div>
            <div>
              <h5 className="text-sm font-medium">Best Time</h5>
              <p className="text-xs text-muted-foreground">{getBestTime()}</p>
            </div>
          </div>
          
          <div className="bg-black rounded p-3 flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
              <Flag className="text-primary text-sm" />
            </div>
            <div>
              <h5 className="text-sm font-medium">Races</h5>
              <p className="text-xs text-muted-foreground">{getTotalRaces()} total</p>
            </div>
          </div>
          
          <div className="bg-black rounded p-3 flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
              <Timer className="text-primary text-sm" />
            </div>
            <div>
              <h5 className="text-sm font-medium">Rank</h5>
              <p className="text-xs text-muted-foreground">{getRank()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
