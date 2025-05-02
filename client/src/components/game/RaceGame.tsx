import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RaceRecord } from "@shared/schema";
import { ThumbsUp } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RaceGameProps {
  races: RaceRecord[];
  pollId?: number;
}

export default function RaceGame({ races, pollId }: RaceGameProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [carPositions, setCarPositions] = useState({
    carA: 0, // percentage from left
    carB: 0  // percentage from right
  });
  
  // Car images from free open source stock (now facing each other)
  const carImages = {
    leftCar: "https://cdn-icons-png.flaticon.com/512/4955/4955169.png", // right-facing car
    rightCar: "https://cdn-icons-png.flaticon.com/512/4955/4955198.png"  // left-facing car
  };
  
  // Mock poll data for demonstration
  const pollData = {
    id: pollId || 1,
    optionA: "Dogs",
    optionB: "Cats",
    votes: {
      optionA: 12,
      optionB: 15
    }
  };
  
  // Vote and move cars
  const handleVote = async (option: 'A' | 'B') => {
    try {
      // Only try API call if a poll ID is provided
      if (pollId) {
        const response = await apiRequest('POST', `/api/polls/${pollId}/vote`, { option });
        const data = await response.json();
        
        // Update the UI after successful API call
        if (option === 'A') {
          setCarPositions(prev => ({
            ...prev,
            carA: Math.min(100, prev.carA + 10) // Move right
          }));
          
          toast({
            title: `Voted for ${pollData.optionA}!`,
            description: "Your vote moved the car forward",
          });
        } else {
          setCarPositions(prev => ({
            ...prev,
            carB: Math.min(100, prev.carB + 10) // Move left
          }));
          
          toast({
            title: `Voted for ${pollData.optionB}!`,
            description: "Your vote moved the car forward",
          });
        }
      } else {
        // For demo mode without a poll ID, just update UI
        if (option === 'A') {
          setCarPositions(prev => ({
            ...prev,
            carA: Math.min(100, prev.carA + 10) // Move right
          }));
        } else {
          setCarPositions(prev => ({
            ...prev,
            carB: Math.min(100, prev.carB + 10) // Move left
          }));
        }
        
        toast({
          title: `Voted for ${option === 'A' ? pollData.optionA : pollData.optionB}!`,
          description: "Demo mode: Your vote moved the car forward",
        });
      }
    } catch (error: any) {
      // Error message is now properly extracted by our throwIfResNotOk
      const errorMessage = error.message || "Please try again";
      
      // Check if this is a "already voted" error
      if (errorMessage.includes("already voted")) {
        toast({
          title: "Already voted",
          description: "You have already voted on this challenge",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Voting failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    }
  };
  
  // Stats calculation functions removed
  
  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-montserrat font-bold">Votes and Wars Race</CardTitle>
          <Button
            asChild
            size="sm"
            className="bg-primary/20 text-primary text-xs font-medium py-1 px-3 rounded-full hover:bg-primary/30 transition-colors"
          >
            <a href="/race">Play Full Game</a>
          </Button>
        </div>
        <CardDescription>
          Race between poll options - vote to advance your choice!
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="bg-black rounded-lg p-4 mb-4">
          {/* Poll information */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {pollData.optionA}
              </Badge>
            </div>
            <span className="text-sm font-semibold">VS</span>
            <div className="flex items-center">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {pollData.optionB}
              </Badge>
            </div>
          </div>
          
          {/* Race track - single line with cars facing each other */}
          <div className="game-track h-24 rounded-lg flex items-center relative overflow-hidden bg-gradient-to-r from-neutral-800 to-neutral-900">
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            
            {/* Race track middle line */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-white opacity-30"></div>
            </div>
            
            {/* Center divider */}
            <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-px h-full bg-primary"></div>
            
            {/* Left car (facing right) */}
            <div className="absolute top-1/2 transform -translate-y-1/2 left-5" style={{ 
              left: `calc(5% + ${carPositions.carA}%)`, 
              transition: 'left 0.5s ease-out' 
            }}>
              <img 
                src={carImages.leftCar}
                alt="Left Car" 
                className="h-10 w-auto"
              />
            </div>
            
            {/* Right car (facing left) */}
            <div className="absolute top-1/2 transform -translate-y-1/2 right-5" style={{ 
              right: `calc(5% + ${carPositions.carB}%)`, 
              transition: 'right 0.5s ease-out' 
            }}>
              <img 
                src={carImages.rightCar}
                alt="Right Car" 
                className="h-10 w-auto transform scale-x-[-1]" // Flip horizontally
              />
            </div>
            
            {/* Vote buttons */}
            <div className="absolute bottom-2 left-5">
              <Button 
                size="sm"
                variant="outline"
                className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                onClick={() => handleVote('A')}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Vote
              </Button>
            </div>
            
            <div className="absolute bottom-2 right-5">
              <Button 
                size="sm"
                variant="outline"
                className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                onClick={() => handleVote('B')}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Vote
              </Button>
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
                <h4 className="text-sm font-medium">Poll Racing Game</h4>
                <p className="text-xs text-muted-foreground">Vote to advance your choice!</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Current votes:</span>
              <div className="flex items-center">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30">
                  {pollData.votes.optionA}
                </Badge>
                <span className="text-xs mx-1">-</span>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30">
                  {pollData.votes.optionB}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        {/* Game stats section removed */}
      </CardContent>
    </Card>
  );
}
