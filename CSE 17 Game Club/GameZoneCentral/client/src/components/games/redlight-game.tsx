import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface RedlightGameProps {
  onClose: () => void;
}

export default function RedlightGame({ onClose }: RedlightGameProps) {
  const { toast } = useToast();
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [lightState, setLightState] = useState<'red' | 'yellow' | 'green'>('red');
  const [playerPosition, setPlayerPosition] = useState(0);
  const [gameStats, setGameStats] = useState({
    attempts: 0,
    bestTime: '0.0',
    successRate: 0,
  });
  const [timer, setTimer] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const lightTimerRef = useRef<number | null>(null);
  const isMovingRef = useRef(false);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (lightTimerRef.current) clearInterval(lightTimerRef.current);
    };
  }, []);

  const startGameMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/games/redlight/start", {});
      return res.json();
    },
    onSuccess: () => {
      setGameActive(true);
      setGameOver(false);
      setGameWon(false);
      setPlayerPosition(0);
      setTimer(0);
      if (playerRef.current) {
        playerRef.current.style.left = '4px';
      }
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setTimer(prev => prev + 0.1);
      }, 100);
      
      // Start light changes
      startLightChanges();
      
      toast({
        title: "Game Started",
        description: "Move when the light is green, stop when it's red!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startLightChanges = () => {
    let counter = 0;
    
    const changeLights = () => {
      counter++;
      
      // Randomly decide which light to show
      // Weights: Red - 40%, Yellow - 20%, Green - 40%
      const random = Math.random();
      
      if (random < 0.4) {
        setLightState('red');
      } else if (random < 0.6) {
        setLightState('yellow');
      } else {
        setLightState('green');
      }
      
      // End game after some time
      if (counter > 20) {
        if (lightTimerRef.current) clearInterval(lightTimerRef.current);
      }
    };
    
    // Initial light change
    changeLights();
    
    // Schedule light changes
    lightTimerRef.current = window.setInterval(changeLights, 1500);
  };

  const movePlayer = () => {
    if (!gameActive || gameOver) return;
    
    // Check if we're on red light
    if (lightState === 'red' && isMovingRef.current) {
      // Player moved on red light - game over
      endGame(false);
      return;
    }
    
    isMovingRef.current = true;
    
    // Move player
    if (gameActive && !gameOver && (lightState === 'green' || lightState === 'yellow')) {
      const newPosition = playerPosition + 5;
      setPlayerPosition(newPosition);
      
      if (playerRef.current) {
        playerRef.current.style.left = `${newPosition + 4}px`;
      }
      
      // Check if player reached finish line
      const gameAreaWidth = document.getElementById('gameArea')?.clientWidth || 600;
      if (newPosition >= gameAreaWidth - 40) {
        endGame(true);
      }
    }
  };

  const stopMoving = () => {
    isMovingRef.current = false;
  };

  const endGame = (won: boolean) => {
    setGameActive(false);
    setGameOver(true);
    setGameWon(won);
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (lightTimerRef.current) clearInterval(lightTimerRef.current);
    
    if (won) {
      // Record game win
      submitScoreMutation.mutate({ time: timer.toFixed(1) });
      
      toast({
        title: "You Win!",
        description: `You reached the finish line in ${timer.toFixed(1)} seconds!`,
      });
    } else {
      toast({
        title: "Game Over",
        description: "You moved on a red light!",
        variant: "destructive",
      });
    }
  };

  const submitScoreMutation = useMutation({
    mutationFn: async (data: { time: string }) => {
      const res = await apiRequest("POST", "/api/games/redlight/score", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGameStats(data.stats);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Fetch game stats on initial load
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/games/redlight/stats');
        if (response.ok) {
          const data = await response.json();
          setGameStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch game stats:', error);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Red Light, Green Light</h2>
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Card className="mb-6 bg-muted/50">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-medium text-foreground mb-2">Red Light, Green Light</h3>
            <p className="text-muted-foreground">Press and hold to move during green light, but freeze on red light!</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-6">
            {/* Traffic Light */}
            <div className="traffic-light">
              <div className={`light ${lightState === 'red' ? 'red-active' : ''}`}></div>
              <div className={`light ${lightState === 'yellow' ? 'yellow-active' : ''}`}></div>
              <div className={`light ${lightState === 'green' ? 'green-active' : ''}`}></div>
            </div>
            
            {/* Game Area */}
            <div className="relative bg-background w-full h-64 rounded-lg overflow-hidden" id="gameArea">
              {/* Finish Line */}
              <div className="absolute top-0 right-0 h-full w-1 bg-secondary"></div>
              
              {/* Player Character */}
              <div 
                ref={playerRef}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-accent rounded-full" 
              ></div>
              
              {(!gameActive || gameOver) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                  <div className="text-center">
                    {!gameActive && !gameOver && (
                      <>
                        <h4 className="text-2xl font-bold text-white mb-4">Ready to Play?</h4>
                        <Button onClick={() => startGameMutation.mutate()}>
                          Start Game
                        </Button>
                      </>
                    )}
                    
                    {gameOver && (
                      <>
                        <h4 className="text-2xl font-bold text-white mb-4">
                          {gameWon ? 'You Win!' : 'Game Over!'}
                        </h4>
                        <p className="text-white mb-4">
                          {gameWon 
                            ? `You completed the game in ${timer.toFixed(1)} seconds!` 
                            : 'You moved on a red light!'}
                        </p>
                        <Button onClick={() => startGameMutation.mutate()}>
                          Play Again
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              className="w-full max-w-md"
              onMouseDown={movePlayer}
              onMouseUp={stopMoving}
              onTouchStart={movePlayer}
              onTouchEnd={stopMoving}
              disabled={!gameActive || gameOver}
            >
              Press and Hold to Move
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Game Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground text-sm">Attempts</p>
              <p className="text-xl font-game text-accent">{gameStats.attempts}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Best Time</p>
              <p className="text-xl font-game text-secondary">{gameStats.bestTime}s</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Success Rate</p>
              <p className="text-xl font-game text-accent">{gameStats.successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
