import { useState } from "react";
import { ChartBarIcon, Share2, MoreVertical, FilterIcon } from "lucide-react";
import { useLocation } from "wouter";
import { Poll } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface HomePageChallengesProps {
  polls: Poll[];
}

export default function HomePageChallenges({ polls }: HomePageChallengesProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const ITEMS_PER_PAGE = 2;
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
    
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, status: "Ended" };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let status = "Active";
    if (hours < 3) status = "Ending Soon";
    
    return { hours, minutes, seconds, status };
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
    <div className="bg-[#111] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <h2 className="text-xl font-bold text-white">Active Challenges</h2>
        <div className="flex gap-2">
          <button className="text-gray-400 hover:text-white">
            <FilterIcon className="h-5 w-5" />
          </button>
          <button className="text-gray-400 hover:text-white">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Column headers */}
      <div className="grid grid-cols-6 border-b border-[#333] px-4 py-2">
        <div className="text-sm font-medium text-gray-400">Challenge</div>
        <div className="text-sm font-medium text-gray-400">Created</div>
        <div className="text-sm font-medium text-gray-400">Votes</div>
        <div className="text-sm font-medium text-gray-400">Time Left</div>
        <div className="text-sm font-medium text-gray-400">Status</div>
        <div className="text-sm font-medium text-gray-400 text-right">Actions</div>
      </div>
      
      {/* Challenge rows */}
      {getPaginatedChallenges().map((poll) => {
        const { status } = getRemainingTime(poll.endTime);
        const totalVotes = (poll.optionAVotes || 0) + (poll.optionBVotes || 0);
        
        return (
          <div 
            key={poll.id}
            className="grid grid-cols-6 items-center border-b border-[#333] px-4 py-3 cursor-pointer hover:bg-[#222]"
            onClick={() => navigate(`/challenges/${poll.id}`)}
          >
            {/* Challenge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black flex items-center justify-center rounded">
                <span className="text-[#FFD700] text-xl">📋</span>
              </div>
              <div>
                <p className="font-medium text-white">{poll.question}</p>
                <p className="text-xs text-gray-400">This or That</p>
              </div>
            </div>
            
            {/* Created */}
            <div className="text-gray-400">
              {formatDate(poll.createdAt || new Date())}
            </div>
            
            {/* Votes */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white">{totalVotes}</span>
                <div className="w-20 h-1.5 bg-[#333] rounded-full overflow-hidden">
                  <div 
                    className="bg-[#FFD700] h-full rounded-full" 
                    style={{ width: `${Math.min((totalVotes / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Time Left */}
            <div className="flex items-center">
              {status === "Ended" ? (
                <div className="flex items-center">
                  <span className="text-gray-400 mr-1">○</span>
                  <span className="text-gray-400">Ended</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className={status === "Ending Soon" ? "text-red-500 mr-1" : "text-[#FFD700] mr-1"}>●</span>
                  <span className="text-white">Active</span>
                </div>
              )}
            </div>
            
            {/* Status */}
            <div>
              <span className={`
                px-3 py-1 rounded-full text-xs font-medium
                ${status === "Active" ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30" : 
                  status === "Ending Soon" ? "bg-red-500/20 text-red-500 border border-red-500/30" : 
                  "bg-gray-500/20 text-gray-400 border border-gray-500/30"}
              `}>
                {status === "Ending Soon" ? "Ending Soon" : status}
              </span>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button className="text-gray-400 hover:text-white" onClick={(e) => shareChallenge(poll, e)}>
                <Share2 className="h-4 w-4" />
              </button>
              <button 
                className="text-gray-400 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/challenges/${poll.id}`);
                }}
              >
                <ChartBarIcon className="h-4 w-4" />
              </button>
              <button className="text-gray-400 hover:text-white" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
      
      {/* Pagination */}
      <div className="flex justify-between items-center p-4">
        <div className="text-sm text-gray-400">
          Showing {getPaginatedChallenges().length} of {totalChallenges} challenges
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            className="w-8 h-8 flex items-center justify-center bg-[#111] text-gray-400 hover:text-white rounded"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
            // Since we're displaying 7 numbers at most, no need for ellipsis with this small number of pages
            const pageNumber = i + 1;
            
            return (
              <button 
                key={i}
                className={`w-8 h-8 flex items-center justify-center rounded ${
                  currentPage === pageNumber 
                    ? "bg-[#FFD700] text-black" 
                    : "bg-[#222] text-gray-400 hover:text-white"
                }`}
                onClick={() => handlePageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
          
          <button 
            className="w-8 h-8 flex items-center justify-center bg-[#111] text-gray-400 hover:text-white rounded"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}