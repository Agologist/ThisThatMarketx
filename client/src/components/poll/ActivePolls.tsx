import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartBarIcon, Share2, EllipsisVertical, FilterIcon } from "lucide-react";
import { useLocation } from "wouter";
import { Poll } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ActivePollsProps {
  polls: Poll[];
}

export default function ActivePolls({ polls }: ActivePollsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const ITEMS_PER_PAGE = 2;
  const totalPolls = polls.length;
  const totalPages = Math.ceil(totalPolls / ITEMS_PER_PAGE);
  
  const getPaginatedPolls = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return polls.slice(startIndex, endIndex);
  };
  
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  const getRemainingTime = (endTime: Date) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return { hours: 0, minutes: 0, status: "Ended", percentage: 283 };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    // Calculate percentage of time elapsed
    const totalDuration = end.getTime() - new Date(polls.find(p => p.id === polls[0].id)?.createdAt || 0).getTime();
    const elapsed = totalDuration - diff;
    const percentage = Math.min(283 * (elapsed / totalDuration), 283);
    
    let status = "Active";
    if (hours < 3) status = "Ending Soon";
    
    return { hours, minutes, status, percentage };
  };
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const pollDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - pollDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return pollDate.toLocaleDateString();
  };
  
  const handleShare = (poll: Poll, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const shareUrl = `${window.location.origin}/challenges/${poll.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: poll.question,
        text: `Vote on "${poll.question}"`,
        url: shareUrl,
      }).catch(error => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Poll link copied to clipboard",
      });
    }
  };
  
  return (
    <Card className="bg-card border-primary/30">
      <CardHeader className="flex justify-between items-center pb-4">
        <CardTitle className="text-xl font-montserrat font-bold">Active Challenges</CardTitle>
        <div className="flex items-center">
          <Button variant="ghost" size="icon">
            <FilterIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <EllipsisVertical className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground text-sm font-medium">Challenge</TableHead>
                <TableHead className="text-muted-foreground text-sm font-medium">Created</TableHead>
                <TableHead className="text-muted-foreground text-sm font-medium">Votes</TableHead>
                <TableHead className="text-muted-foreground text-sm font-medium">Time Left</TableHead>
                <TableHead className="text-muted-foreground text-sm font-medium">Status</TableHead>
                <TableHead className="text-right text-muted-foreground text-sm font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getPaginatedPolls().map((poll) => {
                const { hours, minutes, status, percentage } = getRemainingTime(poll.endTime);
                const totalVotes = poll.optionAVotes + poll.optionBVotes;
                const votePercentage = totalVotes > 0 ? (totalVotes / 200) * 100 : 0;
                
                return (
                  <TableRow 
                    key={poll.id}
                    className="cursor-pointer hover:bg-muted/10"
                    onClick={() => navigate(`/challenges/${poll.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-black flex items-center justify-center rounded">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{poll.question}</p>
                          <p className="text-xs text-muted-foreground">This or That</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(poll.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="text-sm font-medium mr-2">{totalVotes}</span>
                        <div className="w-20 h-2 bg-black rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ width: `${votePercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2"></circle>
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="16" 
                            fill="none" 
                            stroke={status === "Ended" ? "currentColor" : status === "Ending Soon" ? "#FF3A3A" : "#FFD700"} 
                            strokeWidth="2" 
                            className="poll-timer" 
                            strokeDashoffset={percentage}
                          ></circle>
                        </svg>
                        <span className="text-sm">
                          {status === "Ended" ? (
                            "Ended"
                          ) : (
                            <>
                              {hours > 0 && `${hours}h `}{minutes}m
                            </>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`
                          ${status === "Active" ? "bg-primary/20 text-primary" : 
                            status === "Ending Soon" ? "bg-destructive/20 text-destructive" : 
                            "bg-muted/20 text-muted-foreground"}
                          text-xs py-1 px-2 rounded-full font-medium
                        `}
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => handleShare(poll, e)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/challenges/${poll.id}`);
                        }}
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {getPaginatedPolls().length} of {totalPolls} challenges
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              className="w-8 h-8 bg-black border-primary/30 text-muted-foreground hover:text-primary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            
            {[...Array(totalPages)].map((_, i) => (
              <Button 
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                className={`w-8 h-8 ${
                  currentPage === i + 1 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-black border-primary/30 text-muted-foreground hover:text-primary"
                }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            
            <Button 
              variant="outline" 
              size="icon"
              className="w-8 h-8 bg-black border-primary/30 text-muted-foreground hover:text-primary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
