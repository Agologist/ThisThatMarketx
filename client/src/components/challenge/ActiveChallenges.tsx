import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartBarIcon, Share2, EllipsisVertical, FilterIcon, MoreVertical } from "lucide-react";
import { useLocation } from "wouter";
import { Poll } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ActiveChallengesProps {
  polls: Poll[];
}

export default function ActiveChallenges({ polls }: ActiveChallengesProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const ITEMS_PER_PAGE = 5;
  const totalChallenges = polls.length;
  const totalPages = Math.ceil(totalChallenges / ITEMS_PER_PAGE);
  
  const getPaginatedChallenges = () => {
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
    
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, status: "Ended", percentage: 100 };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Calculate percentage of time elapsed
    const totalDuration = end.getTime() - new Date(polls.find(p => p.id === polls[0].id)?.createdAt || 0).getTime();
    const elapsed = totalDuration - diff;
    const percentage = Math.min(100 * (elapsed / totalDuration), 100);
    
    let status = "Active";
    if (hours < 3) status = "Ending Soon";
    
    return { hours, minutes, seconds, status, percentage };
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
  
  const shareChallenge = (poll: Poll, e: React.MouseEvent) => {
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
        description: "Challenge link copied to clipboard",
      });
    }
  };
  
  return (
    <div className="bg-[#191919] rounded-lg border border-[#333] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#333]">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Active Challenges</h2>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <FilterIcon className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white"
            >
              <EllipsisVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#333] text-left">
                <th className="pb-3 font-semibold text-gray-400">Challenge</th>
                <th className="pb-3 font-semibold text-gray-400">Created</th>
                <th className="pb-3 font-semibold text-gray-400">Votes</th>
                <th className="pb-3 font-semibold text-gray-400">Time Left</th>
                <th className="pb-3 font-semibold text-gray-400">Status</th>
                <th className="pb-3 font-semibold text-gray-400">War</th>
                <th className="pb-3 font-semibold text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedChallenges().map((poll) => {
                const { hours, minutes, seconds, status } = getRemainingTime(poll.endTime);
                const totalVotes = (poll.optionAVotes || 0) + (poll.optionBVotes || 0);
                const votePercentage = totalVotes > 0 ? Math.min((totalVotes / 100) * 100, 100) : 0;
                
                return (
                  <tr 
                    key={poll.id}
                    className="border-b border-[#333] cursor-pointer hover:bg-[#222]"
                    onClick={() => navigate(`/challenges/${poll.id}`)}
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#000] flex-shrink-0 flex items-center justify-center rounded">
                          <span className="text-[#FFD700] font-bold">📄</span>
                        </div>
                        <div>
                          <p className="font-medium">{poll.question}</p>
                          <p className="text-xs text-gray-400">This or That</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-gray-400">
                      {formatDate(poll.createdAt || new Date())}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{totalVotes}</span>
                        <div className="w-24 h-1.5 bg-[#333] rounded-full overflow-hidden">
                          <div 
                            className="bg-[#FFD700] h-full rounded-full" 
                            style={{ width: `${votePercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center">
                        {status === "Ended" ? (
                          <span>Ended</span>
                        ) : status === "Ending Soon" ? (
                          <div className="flex items-center">
                            <span className="text-red-500 mr-1">●</span>
                            <span>{minutes}m</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="text-[#FFD700] mr-1">●</span>
                            {hours > 0 && <span>{hours}h</span>}
                            {minutes > 0 && <span>{hours > 0 && ' '}{minutes}m</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge
                        className={`
                          border-none px-3 py-1 rounded-full text-xs font-medium
                          ${status === "Active" ? "bg-[#FFD700]/20 text-[#FFD700]" : 
                            status === "Ending Soon" ? "bg-red-500/20 text-red-500" : 
                            "bg-gray-500/20 text-gray-400"}
                        `}
                      >
                        {status === "Ending Soon" ? "Ending Soon" : status}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Badge
                        className={`
                          border-none px-3 py-1 rounded-full text-xs font-medium
                          ${poll.isWar === true ? "bg-[#FFD700]/20 text-[#FFD700]" : "bg-gray-500/20 text-gray-400"}
                        `}
                      >
                        {poll.isWar === true ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-gray-400 hover:text-white"
                          onClick={(e) => shareChallenge(poll, e)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-gray-400 hover:text-white"
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
                          className="text-gray-400 hover:text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-400">
            Showing {getPaginatedChallenges().length} of {totalChallenges} challenges
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon"
                className="w-8 h-8 border-[#333] bg-black text-gray-400 hover:text-white hover:bg-[#222]"
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
                      ? "bg-[#FFD700] text-black border-none" 
                      : "bg-black border-[#333] text-gray-400 hover:text-white hover:bg-[#222]"
                  }`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              
              <Button 
                variant="outline" 
                size="icon"
                className="w-8 h-8 border-[#333] bg-black text-gray-400 hover:text-white hover:bg-[#222]"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}