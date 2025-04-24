import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Gamepad, Menu, ChevronDown } from "lucide-react";
import { useState } from "react";
import logoImage from "../../assets/logo.png";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="bg-card px-6 py-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <img src={logoImage} alt="CSE-17 Game Club Logo" className="w-10 h-10" />
          <Link href="/">
            <a className="text-2xl font-heading font-bold text-foreground">CSE-17 Game Club</a>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/">
            <a className={`text-foreground hover:text-accent transition ${location === '/' ? 'text-accent' : ''}`}>
              Games
            </a>
          </Link>
          <Link href="/leaderboard">
            <a className={`text-foreground hover:text-accent transition ${location === '/leaderboard' ? 'text-accent' : ''}`}>
              Leaderboard
            </a>
          </Link>
          {user?.role === 'admin' && (
            <Link href="/admin">
              <a className={`text-foreground hover:text-accent transition ${location === '/admin' ? 'text-accent' : ''}`}>
                Admin
              </a>
            </Link>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 text-foreground hover:text-accent focus:ring-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href="/profile">
                    <a className="w-full">Profile</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings">
                    <a className="w-full">Settings</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" asChild>
              <Link href="/auth">
                <a>Sign In</a>
              </Link>
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-foreground hover:text-accent"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 space-y-2 pb-3">
          <Link href="/">
            <a className={`block py-2 text-foreground hover:text-accent ${location === '/' ? 'text-accent' : ''}`}>
              Games
            </a>
          </Link>
          <Link href="/leaderboard">
            <a className={`block py-2 text-foreground hover:text-accent ${location === '/leaderboard' ? 'text-accent' : ''}`}>
              Leaderboard
            </a>
          </Link>
          {user?.role === 'admin' && (
            <Link href="/admin">
              <a className={`block py-2 text-foreground hover:text-accent ${location === '/admin' ? 'text-accent' : ''}`}>
                Admin
              </a>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
