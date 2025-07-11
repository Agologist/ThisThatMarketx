import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useReplitAuth, logoutFromReplit } from "@/hooks/use-replit-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, LogOut, Menu, X, UserIcon, Trophy, Award, FileText, Terminal, Package } from "lucide-react";
import logoImage from "@assets/Contemporary_Emblem_Logo_for_ThisThat.Market-removebg-preview_1751386189685.png";
import UserStatCards from "@/components/dashboard/UserStatCards";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [votesDropdownOpen, setVotesDropdownOpen] = useState(false);

  const [location, navigate] = useLocation();
  const { user, isGuest, logoutMutation, exitGuestMode } = useAuth();
  
  // Check if we have a Replit authenticated user
  const { user: replitUser, isAuthenticated: isReplitAuth } = useReplitAuth();
  
  // Fetch user stats
  const { data: userPolls = [] } = useQuery({
    queryKey: ["/api/user/polls"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch("/api/user/polls", { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!user && !isGuest
  });
  
  const { data: userVotes = [] } = useQuery({
    queryKey: ["/api/user/votes"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch("/api/user/votes", { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!user && !isGuest
  });
  

  

  
  // Fetch all polls for reference when displaying battle results
  const { data: allPolls = [] } = useQuery({
    queryKey: ["/api/polls"],
    queryFn: async () => {
      const res = await fetch("/api/polls", { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!user && !isGuest
  });
  
  // Calculate stats
  const challengeCount = userPolls.length;
  const voteCount = (user?.id && !isGuest) ? userVotes.length : 0;

  
  // Calculate ranks based on count
  const getRank = (count: number): string => {
    if (count < 100) return "Egg";
    if (count < 1000) return "Jack";
    if (count < 10000) return "Queen";
    if (count < 100000) return "King";
    if (count < 1000000) return "Ace";
    return "Jester";
  };
  
  const challengeRank = getRank(challengeCount);
  const voteRank = getRank(voteCount);

  const handleLogout = async () => {
    try {
      // Check if we're logged in with Replit Auth
      if (isReplitAuth) {
        // Use Replit Auth logout
        logoutFromReplit();
        return; // We're done, the redirect will happen automatically
      }
      
      // Import Firebase signOut dynamically to avoid circular dependencies
      const { signOut } = await import('@/lib/firebase');
      
      // First sign out from Firebase if user was authenticated with it
      if (user?.provider === 'firebase') {
        await signOut();
      }
      
      // Perform the server-side logout
      logoutMutation.mutate(undefined, {
        onSuccess: () => {
          // Force hard navigation to the auth page after successful logout
          window.location.href = '/auth';
        },
        onError: () => {
          // Still redirect even if there's an error (client-side cleanup)
          window.location.href = '/auth';
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to regular logout if Firebase logout fails
      window.location.href = '/auth';
    }
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const navLinks = [
    { 
      href: "/", 
      label: "Dashboard", 
      active: location === "/",
      icon: <Trophy className="h-4 w-4 mr-1.5" />
    },
    { 
      href: "/challenges", 
      label: "Challenges", 
      active: location.startsWith("/challenges") || location.startsWith("/polls"),
      icon: <FileText className="h-4 w-4 mr-1.5" />
    },
    { 
      href: "/packages", 
      label: "Packages", 
      active: location === "/packages",
      icon: <Package className="h-4 w-4 mr-1.5" />
    }
  ];
  
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'G'; // Default to 'G' for guest
  };
  
  // Determine if we should show user profile menu
  const showUserProfile = user || isGuest;
  
  return (
    <header className="header-enhanced">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center group">
            <img 
              src={logoImage} 
              alt="ThisThat.Market Logo" 
              className="h-12 w-12 mr-3 group-hover:scale-110 transition-transform" 
            />
            <h1 className="font-racing text-primary text-2xl tracking-wider">
              <span className="group-hover:text-yellow-400 transition-colors">ThisThat</span>.<span className="group-hover:text-yellow-400 transition-colors">Market</span>
            </h1>
          </Link>
          
          {/* Mobile Nav Toggle */}
          <button 
            className="block rounded-full p-2 text-primary bg-transparent border-0 cursor-pointer lg:hidden"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? 
              <X className="h-6 w-6" /> : 
              <Menu className="h-6 w-6" />}
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`nav-link ${link.active ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                <span className={link.active ? 'nav-icon-active' : 'nav-icon-inactive'}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
            
            {/* User Profile or Guest */}
            {showUserProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary">
                      {user && (
                        <AvatarImage 
                          src={user.profileImageUrl || ""} 
                          alt={user.displayName || user.username} 
                        />
                      )}
                      <AvatarFallback className="bg-primary/20 text-primary">
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
                              <FileText className="text-primary h-4 w-4 mr-1.5" />
                              <div className="text-xs">
                                <p className="text-muted-foreground">Challenges</p>
                                <p className="font-bold">{challengeCount}</p>
                                <p className="text-xs text-primary">Rank: {challengeRank}</p>
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
                                      <FileText className="h-4 w-4 mr-2 text-primary" />
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
                              <FileText className="text-primary h-4 w-4 mr-1.5 rotate-90" />
                              <div className="text-xs">
                                <p className="text-muted-foreground">Votes</p>
                                <p className="font-bold">{voteCount}</p>
                                <p className="text-xs text-primary">Rank: {voteRank}</p>
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
                                      <FileText className="h-4 w-4 mr-2 text-primary rotate-90" />
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

                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {isGuest ? (
                    <DropdownMenuItem onClick={exitGuestMode} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Sign In / Register</span>
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={exitGuestMode} className="btn-gold">
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="mobile-menu fixed top-[68px] left-0 w-full h-[calc(100vh-68px)] z-40 p-4 overflow-auto">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`mobile-nav-link ${link.active ? 'mobile-nav-link-active' : 'mobile-nav-link-inactive'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className={`nav-icon ${link.active ? 'nav-icon-active' : 'nav-icon-inactive'}`}>
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
                    <Avatar className="h-8 w-8 border-2 border-primary mr-2">
                      {user && (
                        <AvatarImage 
                          src={user.profileImageUrl || ""} 
                          alt={user.displayName || user.username} 
                        />
                      )}
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {isGuest ? 'G' : getInitials(user?.displayName || user?.username || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground">
                      {isGuest ? 'Guest User' : (user?.displayName || user?.username)}
                    </span>
                  </div>
                  
                  {isGuest ? (
                    <Button 
                      variant="outline" 
                      className="user-button"
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
                      className="user-button" 
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  className="btn-gold shadow-md hover:shadow-lg transform hover:scale-105 transition-all font-bold"
                  onClick={() => {
                    setIsMenuOpen(false);
                    exitGuestMode();
                  }}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Sign In / Register
                </Button>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
