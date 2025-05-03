import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FlagIcon, User, LogOut, Menu, X, UserIcon, Trophy, Award, FileText } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user, isGuest, logoutMutation, exitGuestMode } = useAuth();
  
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
  
  const { data: userRaces = [] } = useQuery({
    queryKey: ["/api/user/races"],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch("/api/user/races", { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!user && !isGuest
  });
  
  const { data: activeWarPolls = [] } = useQuery({
    queryKey: ["/api/polls/active-wars"],
    queryFn: async () => {
      if (!user) return [];
      // Get all polls with isWar=true that are active and the user has voted on
      const res = await fetch("/api/polls?filter=active-wars", { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!user && !isGuest
  });
  
  // Calculate stats
  const challengeCount = userPolls.length;
  const voteCount = (user?.id && !isGuest) ? userRaces.length : 0; // Consider using a proper votes count query when available
  const warCount = userRaces.filter((race: any) => race.won).length;
  const warPassesCount = activeWarPolls.length;
  
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
  const warRank = getRank(warCount);

  const handleLogout = async () => {
    try {
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
    { href: "/", label: "Dashboard", active: location === "/" },
    { href: "/challenges", label: "Challenges", active: location.startsWith("/challenges") || location.startsWith("/polls") },
  ];
  
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'G'; // Default to 'G' for guest
  };
  
  // Determine if we should show user profile menu
  const showUserProfile = user || isGuest;
  
  return (
    <header className="bg-black border-b border-primary/50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <FlagIcon className="text-primary h-6 w-6 mr-2" />
            <h1 className="font-racing text-primary text-2xl">Votes and Wars</h1>
          </Link>
          
          {/* Mobile Nav Toggle */}
          <button 
            className="lg:hidden text-primary"
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
                className={`hover:text-primary transition-colors font-montserrat font-medium ${
                  link.active ? "text-primary" : "text-foreground"
                }`}
              >
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
                        <div className="flex items-center">
                          <FileText className="text-primary h-4 w-4 mr-1.5" />
                          <div className="text-xs">
                            <p className="text-muted-foreground">Challenges</p>
                            <p className="font-bold">{challengeCount}</p>
                            <p className="text-xs text-primary">Rank: {challengeRank}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <FileText className="text-primary h-4 w-4 mr-1.5 rotate-90" />
                          <div className="text-xs">
                            <p className="text-muted-foreground">Votes</p>
                            <p className="font-bold">{voteCount}</p>
                            <p className="text-xs text-primary">Rank: {voteRank}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Trophy className="text-primary h-4 w-4 mr-1.5" />
                          <div className="text-xs">
                            <p className="text-muted-foreground">Wars</p>
                            <p className="font-bold">{warCount}</p>
                            <p className="text-xs text-primary">Rank: {warRank}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="flex items-center cursor-pointer">
                              <Award className="text-primary h-4 w-4 mr-1.5" />
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
                                    <Trophy className="h-4 w-4 mr-2 text-primary" />
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
        <div className="lg:hidden bg-black border-t border-primary/30">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`py-2 font-montserrat font-medium ${
                    link.active ? "text-primary" : "text-foreground hover:text-primary transition-colors"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* User Stats Grid for mobile */}
              {(!isGuest && user) && (
                <div className="grid grid-cols-2 gap-3 py-2">
                  <div className="flex items-center p-2 bg-primary/10 rounded-md">
                    <FileText className="text-primary h-5 w-5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Challenges</p>
                      <p className="text-xl font-bold text-primary">{challengeCount}</p>
                      <p className="text-xs text-primary">Rank: {challengeRank}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-2 bg-primary/10 rounded-md">
                    <FileText className="text-primary h-5 w-5 mr-2 rotate-90" />
                    <div>
                      <p className="text-sm font-medium">Votes</p>
                      <p className="text-xl font-bold text-primary">{voteCount}</p>
                      <p className="text-xs text-primary">Rank: {voteRank}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-2 bg-primary/10 rounded-md">
                    <Trophy className="text-primary h-5 w-5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Wars</p>
                      <p className="text-xl font-bold text-primary">{warCount}</p>
                      <p className="text-xs text-primary">Rank: {warRank}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center p-2 bg-primary/10 rounded-md">
                      <Award className="text-primary h-5 w-5 mr-2" />
                      <div>
                        <p className="text-sm font-medium">War Passes</p>
                        <p className="text-xl font-bold text-primary">{warPassesCount}</p>
                      </div>
                    </div>
                    
                    {/* War Passes List */}
                    {activeWarPolls.length > 0 && (
                      <div className="ml-2 pl-7 flex flex-col gap-1">
                        {activeWarPolls.map((poll: any) => (
                          <Link 
                            key={poll.id}
                            href={`/polls/${poll.id}`}
                            className="text-sm text-primary flex items-center py-1"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <Trophy className="h-4 w-4 mr-1.5 inline" />
                            <span className="truncate">{poll.question}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
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
                      className="border-primary text-primary"
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
                      className="border-primary text-primary" 
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  className="btn-gold"
                  onClick={() => {
                    setIsMenuOpen(false);
                    exitGuestMode();
                  }}
                >
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
