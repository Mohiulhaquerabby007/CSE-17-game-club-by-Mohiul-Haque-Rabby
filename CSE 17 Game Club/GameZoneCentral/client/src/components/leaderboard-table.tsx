import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  player: string;
  playerImage?: string;
  game: string;
  gameType: string;
  score: string;
  date: string;
}

interface WinnerData {
  player: string;
  game: string;
  gameType: string;
  score: string | number;
  message: string;
}

interface WebSocketMessage {
  type: 'leaderboard' | 'winner';
  data: LeaderboardEntry[];
  winner?: WinnerData;
}

interface LeaderboardTableProps {
  gameType?: string;
}

export default function LeaderboardTable({ gameType = "all" }: LeaderboardTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [winnerData, setWinnerData] = useState<WinnerData | null>(null);
  
  // Regular API query as fallback
  const { data: leaderboardData, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", gameType],
  });
  
  // Create WebSocket connection and handle messages
  useEffect(() => {
    // Function to establish WebSocket connection
    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        // Request leaderboard data for current game type
        ws.send(JSON.stringify({ 
          type: "requestLeaderboard", 
          gameType 
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'leaderboard') {
            // Update the leaderboard data in the cache
            queryClient.setQueryData(["/api/leaderboard", gameType], message.data);
          } 
          else if (message.type === 'winner' && message.winner) {
            // Show winner notification and set winner data
            setWinnerData(message.winner);
            
            // Display toast notification
            toast({
              title: "New High Score! 🏆",
              description: message.winner.message,
              variant: "default",
              duration: 5000
            });
            
            // Update leaderboard data
            if (message.data) {
              queryClient.setQueryData(["/api/leaderboard", gameType], message.data);
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
        // Try to reconnect after delay
        setTimeout(connectWebSocket, 3000);
      };
    };
    
    // Connect to WebSocket server
    connectWebSocket();
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [gameType, queryClient, toast]);
  
  // Clear winner announcement banner after delay
  useEffect(() => {
    if (winnerData) {
      const timer = setTimeout(() => {
        setWinnerData(null);
      }, 10000); // Display for 10 seconds
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [winnerData]);

  // Game type to color mapping
  const gameTypeToColor: Record<string, string> = {
    guessing: "bg-primary/20 text-primary",
    spinwheel: "bg-accent/20 text-accent",
    redlight: "bg-destructive/20 text-destructive",
    typeracer: "bg-primary/20 text-primary",
    cse17: "bg-secondary/20 text-secondary"
  };

  return (
    <div className="bg-muted/20 rounded-lg overflow-hidden">
      {/* Winner announcement banner */}
      {winnerData && (
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <span className="font-bold">{winnerData.player}</span>
              <span>just scored</span>
              <span className="font-bold">{winnerData.score}</span>
              <span>in {winnerData.game}!</span>
            </div>
            <button 
              onClick={() => setWinnerData(null)} 
              className="text-white hover:text-gray-200"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Game</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Loading skeletons
            Array(5).fill(0).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Skeleton className="h-8 w-8 rounded-full mr-3" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
              </TableRow>
            ))
          ) : leaderboardData && leaderboardData.length > 0 ? (
            leaderboardData.map((entry) => (
              <TableRow key={`${entry.player}-${entry.rank}`} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {entry.rank}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground mr-2">
                      {entry.player.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {entry.player}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={gameTypeToColor[entry.gameType] || "bg-muted text-muted-foreground"} variant="outline">
                    {entry.game}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-accent font-bold">
                  {entry.score}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                  {entry.date}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No leaderboard entries found for {gameType === "all" ? "any games" : gameType}.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
