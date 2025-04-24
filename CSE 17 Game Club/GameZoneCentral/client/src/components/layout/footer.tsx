import { Gamepad } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-card py-8 px-6">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Gamepad className="text-accent text-2xl" />
              <h2 className="text-xl font-heading font-bold text-foreground">CSE-17 Game Club</h2>
            </div>
            <p className="text-muted-foreground text-sm">A collection of fun and interactive games to challenge your skills and compete with friends.</p>
          </div>
          
          <div>
            <h3 className="text-foreground font-medium mb-4">Quick Links</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/">
                  <a className="hover:text-accent transition">Home</a>
                </Link>
              </li>
              <li>
                <Link href="/leaderboard">
                  <a className="hover:text-accent transition">Leaderboards</a>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <a className="hover:text-accent transition">About Us</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-foreground font-medium mb-4">Games</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/?game=guessing">
                  <a className="hover:text-accent transition">Guessing Game</a>
                </Link>
              </li>
              <li>
                <Link href="/?game=spinwheel">
                  <a className="hover:text-accent transition">Spin Wheel</a>
                </Link>
              </li>
              <li>
                <Link href="/?game=redlight">
                  <a className="hover:text-accent transition">Red Light, Green Light</a>
                </Link>
              </li>
              <li>
                <Link href="/?game=typeracer">
                  <a className="hover:text-accent transition">Type Racer</a>
                </Link>
              </li>
              <li>
                <Link href="/?game=cse17">
                  <a className="hover:text-accent transition">CSE-17 Bread Game</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-foreground font-medium mb-4">Connect With Us</h3>
            <div className="flex space-x-4 mb-4">
              <a href="#" className="text-muted-foreground hover:text-accent transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-accent transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-accent transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-accent transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              </a>
            </div>
            <p className="text-muted-foreground text-sm">Subscribe to our newsletter for updates and new games.</p>
            <div className="mt-2 flex">
              <Input 
                type="email" 
                placeholder="Your email" 
                className="rounded-r-none bg-muted text-foreground"
              />
              <Button className="rounded-l-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm mb-4 md:mb-0">© 2023 CSE-17 Game Club. All rights reserved.</p>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-accent transition">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition">Terms of Service</a>
            <a href="#" className="hover:text-accent transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
