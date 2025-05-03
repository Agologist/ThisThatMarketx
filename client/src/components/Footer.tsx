import React from "react";
import { Link } from "wouter";
import { FlagIcon } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  
  return (
    <footer className="bg-black border-t border-primary/50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <FlagIcon className="text-primary h-5 w-5 mr-2" />
            <Link href="/">
              <h2 className="font-racing text-primary text-xl hover:text-primary/80 cursor-pointer transition-colors">Votes and Wars</h2>
            </Link>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4 md:mb-0">
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Dashboard
            </Link>
            <Link href="/challenges" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Challenges
            </Link>
            <Link href="/race" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Race Game
            </Link>
          </div>
          
          <div className="flex-grow"></div>
        </div>
        
        <div className="border-t border-primary/20 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm mb-4 md:mb-0">
            © {year} Votes and Wars. All rights reserved.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Terms of Service
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
