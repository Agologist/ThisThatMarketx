import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Trophy,
  FileText,
  Award,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Flag as FlagIcon,
  Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import UserStatCards from "./dashboard/UserStatCards";

export default function NewHeader() {
  const [location] = useLocation();
  const { user, isLoading, isGuest, exitGuestMode, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const {
    data: userPolls = [],
  } = useQuery({
    queryKey: ["/api/user/polls"],
    enabled: !!user && !isGuest,
  });

  const {
    data: userVotes = [],
  } = useQuery({
    queryKey: ["/api/user/votes"],
    enabled: !!user && !isGuest,
  });

  const {
    data: userWonBattles = [],
  } = useQuery({
    queryKey: ["/api/user/battles/won"],
    enabled: !!user && !isGuest,
  });

  const {
    data: activeWarPolls = [],
  } = useQuery({
    queryKey: ["/api/user/warpasses"],
    enabled: !!user && !isGuest,
  });

  const { toast } = useToast();

  const handleLogout = () => {
    logoutMutation.mutate();
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully"
    });
  };

  // Calculate counts and ranks
  const challengeCount = userPolls.length || 0;
  const voteCount = userVotes.length || 0;
  const warCount = userWonBattles.length || 0;
  const warPassesCount = activeWarPolls.length || 0;

  // Get ranks for each metric
  const getRank = (count: number) => {
    if (count >= 1000000) return "Jester";
    if (count >= 100000) return "Ace";
    if (count >= 10000) return "King";
    if (count >= 1000) return "Queen";
    if (count >= 100) return "Jack";
    return "Egg";
  };

  const challengeRank = getRank(challengeCount);
  const voteRank = getRank(voteCount);
  const warRank = getRank(warCount);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const navLinks = [
    { 
      href: "/", 
      label: "Dashboard", 
      active: location === "/",
      icon: <Trophy size={16} className="mr-2" />
    },
    { 
      href: "/challenges", 
      label: "Challenges", 
      active: location.startsWith("/challenges") || location.startsWith("/polls"),
      icon: <FileText size={16} className="mr-2" />
    },
    { 
      href: "/battle-game", 
      label: "War Game", 
      active: location.startsWith("/battle-game"),
      icon: <Terminal size={16} className="mr-2" />
    }
  ];
  
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'G'; // Default to 'G' for guest
  };
  
  // Determine if we should show user profile menu
  const showUserProfile = user || isGuest;
  
  return (
    <header className="bg-black border-b border-[#FFD700]/30 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center group">
            <FlagIcon className="text-[#FFD700] h-6 w-6 mr-2 group-hover:scale-110 transition-transform" />
            <h1 className="font-racing text-[#FFD700] text-2xl tracking-wider">
              <span className="group-hover:text-yellow-400 transition-colors">Votes</span> and <span className="group-hover:text-yellow-400 transition-colors">Wars</span>
            </h1>
          </Link>
          
          {/* Mobile Nav Toggle */}
          <button 
            className="lg:hidden text-[#FFD700] hover:bg-[#FFD700]/10 rounded-full p-2 transition-colors"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`hover:text-[#FFD700] transition-all font-medium relative px-3 py-2 rounded-md flex items-center ${
                  link.active 
                    ? "text-[#FFD700] bg-[#FFD700]/10 shadow-sm" 
                    : "text-white hover:bg-black/10"
                }`}
              >
                <span className={link.active ? "text-[#FFD700]" : "text-gray-400"}>
                  {link.icon}
                </span>
                {link.label}
                {link.active && <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[#FFD700] rounded-full"></span>}
              </Link>
            ))}
            
            {/* User Profile or Guest */}
            {showUserProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-[#FFD700]/20 hover:border-[#FFD700]/50 transition-colors">
                    <Avatar className="h-9 w-9">
                      {user && (
                        <AvatarImage 
                          src={user.profileImageUrl || ""} 
                          alt={user.displayName || user.username} 
                        />
                      )}
                      <AvatarFallback className="bg-[#FFD700]/20 text-[#FFD700]">
                        {isGuest ? 'G' : getInitials(user?.displayName || user?.username || '')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      {isGuest ? (
                        <>
                          <p className="text-sm font-medium leading-none">Guest User</p>
                          <p className="text-xs leading-none text-muted-foreground">Limited access mode</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium leading-none">{user?.displayName || user?.username}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Stats for desktop dropdown */}
                  {(!isGuest && user) && (
                    <>
                      <div className="px-2 py-1.5 grid grid-cols-2 gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center cursor-pointer">
                              <FileText className="text-[#FFD700] h-4 w-4 mr-1.5" />
                              <div className="text-xs">
                                <p className="text-muted-foreground">Challenges</p>
                                <p className="font-bold">{challengeCount}</p>
                                <p className="text-xs text-[#FFD700]">Rank: {challengeRank}</p>
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Challenges You Created</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {userPolls.length > 0 ? (
                              userPolls.map((poll: any) => {
                                const createdDate = poll.createdAt ? new Date(poll.createdAt).toLocaleDateString() : '';
                                return (
                                  <DropdownMenuItem key={poll.id} asChild>
                                    <Link 
                                      href={`/polls/${poll.id}`} 
                                      className="cursor-pointer flex items-center"
                                    >
                                      <FileText className="h-4 w-4 mr-2 text-[#FFD700]" />
                                      <span className="truncate">{poll.question} <span className="text-xs text-muted-foreground">({createdDate})</span></span>
                                    </Link>
                                  </DropdownMenuItem>
                                );
                              })
                            ) : (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                You haven't created any challenges yet
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center cursor-pointer">
                              <FileText className="text-[#FFD700] h-4 w-4 mr-1.5 rotate-90" />
                              <div className="text-xs">
                                <p className="text-muted-foreground">Votes</p>
                                <p className="font-bold">{voteCount}</p>
                                <p className="text-xs text-[#FFD700]">Rank: {voteRank}</p>
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Challenges You Voted In</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {userVotes.length > 0 ? (
                              userVotes.map((vote: any) => {
                                const poll = userPolls.find((p: any) => p.id === vote.pollId) || { question: `Challenge #${vote.pollId}` };
                                const voteTime = vote.votedAt ? new Date(vote.votedAt).toLocaleDateString() : '';
                                return (
                                  <DropdownMenuItem key={vote.id} asChild>
                                    <Link 
                                      href={`/polls/${vote.pollId}`} 
                                      className="cursor-pointer flex items-center"
                                    >
                                      <FileText className="h-4 w-4 mr-2 text-[#FFD700] rotate-90" />
                                      <span className="truncate">{poll.question} <span className="text-xs text-muted-foreground">({voteTime})</span></span>
                                    </Link>
                                  </DropdownMenuItem>
                                );
                              })
                            ) : (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                You haven't voted in any challenges yet
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center cursor-pointer">
                              <Trophy className="text-[#FFD700] h-4 w-4 mr-1.5" />
                              <div className="text-xs">
                                <p className="text-muted-foreground">Wars</p>
                                <p className="font-bold">{warCount}</p>
                                <p className="text-xs text-[#FFD700]">Rank: {warRank}</p>
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Wars You've Won</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {userWonBattles.length > 0 ? (
                              userWonBattles.map((race: any) => {
                                const battleTime = race.racedAt ? new Date(race.racedAt).toLocaleDateString() : '';
                                
                                const displayTitle = race.title || "Unnamed Challenge";
                                const winTime = (race.time / 1000).toFixed(1); // Format time to 1 decimal place
                                
                                return (
                                  <DropdownMenuItem key={race.id}>
                                    {race.pollId ? (
                                      <Link 
                                        href={`/polls/${race.pollId}`} 
                                        className="cursor-pointer flex items-center w-full"
                                      >
                                        <Trophy className="h-4 w-4 mr-2 text-[#FFD700]" />
                                        <span className="truncate">{displayTitle} <span className="text-xs text-muted-foreground">({battleTime}) - {winTime}s</span></span>
                                      </Link>
                                    ) : (
                                      <div className="flex items-center">
                                        <Trophy className="h-4 w-4 mr-2 text-[#FFD700]" />
                                        <span className="truncate">Challenge <span className="text-xs text-muted-foreground">({battleTime}) - {winTime}s</span></span>
                                      </div>
                                    )}
                                  </DropdownMenuItem>
                                );
                              })
                            ) : (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                You haven't won any battles yet
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center cursor-pointer">
                              <Award className="text-[#FFD700] h-4 w-4 mr-1.5" />
                              <div className="text-xs">
                                <p className="text-muted-foreground">War Passes</p>
                                <p className="font-bold">{warPassesCount}</p>
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Available War Passes</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {activeWarPolls.length > 0 ? (
                              activeWarPolls.map((poll: any) => (
                                <DropdownMenuItem key={poll.id} asChild>
                                  <Link 
                                    href={`/polls/${poll.id}`} 
                                    className="cursor-pointer flex items-center"
                                  >
                                    <Trophy className="h-4 w-4 mr-2 text-[#FFD700]" />
                                    <span className="truncate">{poll.question}</span>
                                  </Link>
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                No active War passes available
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {isGuest ? (
                    <DropdownMenuItem asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10"
                        onClick={exitGuestMode}
                      >
                        <UserIcon className="mr-2 h-4 w-4" />
                        Sign In / Register
                      </Button>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Button 
                        variant="outline" 
                        className="w-full border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10" 
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Button>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-medium shadow hover:shadow-md"
                onClick={exitGuestMode}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-black border-t border-[#FFD700]/20 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`py-3 px-4 font-medium flex items-center rounded-md ${
                    link.active 
                      ? "text-[#FFD700] bg-[#FFD700]/10 border-l-4 border-[#FFD700]" 
                      : "text-white hover:text-[#FFD700] hover:bg-[#FFD700]/5 transition-colors border-l-4 border-transparent"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className={link.active ? "text-[#FFD700]" : "text-gray-400"}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}
              
              {/* User Stats Component for mobile */}
              {(!isGuest && user) && <UserStatCards />}
              
              {showUserProfile ? (
                <>
                  <div className="pt-2 flex items-center">
                    <Avatar className="h-8 w-8 border-2 border-[#FFD700]/30 mr-2">
                      {user && (
                        <AvatarImage 
                          src={user.profileImageUrl || ""} 
                          alt={user.displayName || user.username} 
                        />
                      )}
                      <AvatarFallback className="bg-[#FFD700]/20 text-[#FFD700]">
                        {isGuest ? 'G' : getInitials(user?.displayName || user?.username || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white">
                      {isGuest ? 'Guest User' : (user?.displayName || user?.username)}
                    </span>
                  </div>
                  
                  {isGuest ? (
                    <Button 
                      variant="outline" 
                      className="border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors shadow-sm"
                      onClick={() => {
                        setIsMenuOpen(false);
                        exitGuestMode();
                      }}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      Sign In / Register
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors shadow-sm" 
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-medium shadow hover:shadow-md"
                  onClick={() => {
                    setIsMenuOpen(false);
                    exitGuestMode();
                  }}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}