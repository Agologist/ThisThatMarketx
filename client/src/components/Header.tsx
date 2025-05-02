import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FlagIcon, User, LogOut, Menu, X, UserIcon } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, isGuest, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const navLinks = [
    { href: "/", label: "Dashboard", active: location === "/" },
    { href: "/polls", label: "Polls", active: location.startsWith("/polls") },
    { href: "/race", label: "Race Game", active: location === "/race" },
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
                  
                  {isGuest ? (
                    <DropdownMenuItem asChild>
                      <Link href="/auth" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Sign In / Register</span>
                      </Link>
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
              <Button asChild className="btn-gold">
                <Link href="/auth">Sign In</Link>
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
                      asChild
                    >
                      <Link href="/auth" onClick={() => setIsMenuOpen(false)}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        Sign In / Register
                      </Link>
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
                <Button asChild className="btn-gold">
                  <Link href="/auth" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                </Button>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
