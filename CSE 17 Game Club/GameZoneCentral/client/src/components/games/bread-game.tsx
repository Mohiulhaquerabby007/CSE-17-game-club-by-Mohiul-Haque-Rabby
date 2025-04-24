import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface BreadGameProps {
  onClose: () => void;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameStats {
  level: number;
  lives: number;
  score: number;
  highScores: { player: string; score: number }[];
}

export default function BreadGame({ onClose }: BreadGameProps) {
  const { toast } = useToast();
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 10, y: 50 });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    level: 1,
    lives: 3,
    score: 0,
    highScores: [],
  });
  
  const playerRef = useRef<HTMLDivElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const keyStateRef = useRef<{ [key: string]: boolean }>({});

  // Clean up game loop on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  // Set up keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameActive) return;
      keyStateRef.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameActive) return;
      keyStateRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameActive]);

  const startGameMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/games/bread/start", {});
      return res.json();
    },
    onSuccess: (data) => {
      // Reset game state
      setGameActive(true);
      setGameOver(false);
      setPlayerPosition({ x: 10, y: 50 });
      setObstacles(data.obstacles || generateObstacles());
      setGameStats({
        level: 1,
        lives: 3,
        score: 0,
        highScores: data.highScores || [],
      });
      
      if (playerRef.current) {
        playerRef.current.style.left = '10px';
        playerRef.current.style.top = '50%';
      }
      
      startGameLoop();
      
      toast({
        title: "Game Started",
        description: "Help the bread navigate through obstacles to reach the finish line!",
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

  const submitScoreMutation = useMutation({
    mutationFn: async (data: { score: number }) => {
      const res = await apiRequest("POST", "/api/games/bread/score", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGameStats(prev => ({
        ...prev,
        highScores: data.highScores || prev.highScores,
      }));
      
      toast({
        title: "Score Submitted",
        description: `Your score: ${gameStats.score} points`,
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

  // Generate random obstacles
  const generateObstacles = (): Obstacle[] => {
    const obstacles: Obstacle[] = [];
    const gameArea = gameAreaRef.current;
    
    if (!gameArea) return obstacles;
    
    const areaWidth = gameArea.clientWidth;
    const areaHeight = gameArea.clientHeight;
    
    // Generate 3-5 random obstacles
    const count = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < count; i++) {
      obstacles.push({
        id: i,
        x: (areaWidth * 0.3) + Math.random() * (areaWidth * 0.6),
        y: Math.random() * (areaHeight - 30),
        width: 30,
        height: 30,
      });
    }
    
    return obstacles;
  };

  const startGameLoop = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    
    const gameLoop = () => {
      if (!gameActive) return;
      
      // Move player based on key state
      updatePlayerPosition();
      
      // Check for collisions
      checkCollisions();
      
      // Check if player reached the finish line
      checkWinCondition();
      
      // Continue game loop
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const updatePlayerPosition = () => {
    const keys = keyStateRef.current;
    const gameArea = gameAreaRef.current;
    
    if (!gameArea) return;
    
    const areaWidth = gameArea.clientWidth;
    const areaHeight = gameArea.clientHeight;
    const speed = 5;
    let newX = playerPosition.x;
    let newY = playerPosition.y;
    
    // Update position based on keys pressed
    if (keys['ArrowUp'] || keys['w']) {
      newY = Math.max(0, playerPosition.y - speed);
    }
    if (keys['ArrowDown'] || keys['s']) {
      newY = Math.min(areaHeight - 50, playerPosition.y + speed);
    }
    if (keys['ArrowLeft'] || keys['a']) {
      newX = Math.max(0, playerPosition.x - speed);
    }
    if (keys['ArrowRight'] || keys['d']) {
      newX = Math.min(areaWidth - 50, playerPosition.x + speed);
    }
    
    setPlayerPosition({ x: newX, y: newY });
    
    if (playerRef.current) {
      playerRef.current.style.left = `${newX}px`;
      playerRef.current.style.top = `${newY}px`;
    }
  };

  const checkCollisions = () => {
    if (!playerRef.current) return;
    
    const playerRect = playerRef.current.getBoundingClientRect();
    
    for (const obstacle of obstacles) {
      const obstacleElem = document.getElementById(`obstacle-${obstacle.id}`);
      if (!obstacleElem) continue;
      
      const obstacleRect = obstacleElem.getBoundingClientRect();
      
      if (
        playerRect.left < obstacleRect.right &&
        playerRect.right > obstacleRect.left &&
        playerRect.top < obstacleRect.bottom &&
        playerRect.bottom > obstacleRect.top
      ) {
        // Collision detected
        handleCollision();
        break;
      }
    }
  };

  const handleCollision = () => {
    // Decrease lives
    setGameStats(prev => {
      const newLives = prev.lives - 1;
      
      if (newLives <= 0) {
        endGame(false);
        return { ...prev, lives: 0 };
      }
      
      // Reset player position
      setPlayerPosition({ x: 10, y: 50 });
      
      if (playerRef.current) {
        playerRef.current.style.left = '10px';
        playerRef.current.style.top = '50%';
      }
      
      toast({
        title: "Ouch!",
        description: `You hit an obstacle! Lives remaining: ${newLives}`,
        variant: "destructive",
      });
      
      return { ...prev, lives: newLives };
    });
  };

  const checkWinCondition = () => {
    const gameArea = gameAreaRef.current;
    
    if (!gameArea) return;
    
    const areaWidth = gameArea.clientWidth;
    
    // Check if player reached the right side
    if (playerPosition.x >= areaWidth - 55) {
      // Level completed
      setGameStats(prev => {
        const newLevel = prev.level + 1;
        const newScore = prev.score + 250;
        
        toast({
          title: "Level Complete!",
          description: `You reached level ${newLevel}!`,
        });
        
        // Generate new obstacles for the next level
        setObstacles(generateObstacles());
        
        // Reset player position
        setPlayerPosition({ x: 10, y: 50 });
        
        if (playerRef.current) {
          playerRef.current.style.left = '10px';
          playerRef.current.style.top = '50%';
        }
        
        return {
          ...prev,
          level: newLevel,
          score: newScore,
        };
      });
    }
  };

  const endGame = (completed: boolean) => {
    setGameActive(false);
    setGameOver(true);
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    
    if (completed) {
      toast({
        title: "Game Completed!",
        description: `You completed all levels with ${gameStats.score} points!`,
      });
    } else {
      toast({
        title: "Game Over",
        description: "You ran out of lives!",
      });
    }
    
    // Submit score
    submitScoreMutation.mutate({ score: gameStats.score });
  };

  // Fetch game stats on initial load
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/games/bread/stats');
        if (response.ok) {
          const data = await response.json();
          setGameStats(prev => ({
            ...prev,
            highScores: data.highScores || [],
          }));
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
        <h2 className="text-2xl font-heading font-bold text-foreground">CSE-17 Bread Game</h2>
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Card className="mb-6 bg-muted/50">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-medium text-foreground mb-2">Help the Bread!</h3>
            <p className="text-muted-foreground">Guide your bread character through obstacles to reach the finish line.</p>
          </div>
          
          <div className="relative bg-background w-full h-80 rounded-lg overflow-hidden mb-6" id="breadGameArea" ref={gameAreaRef}>
            {/* Start Line */}
            <div className="absolute left-0 top-0 h-full w-1 bg-accent"></div>
            
            {/* Finish Line */}
            <div className="absolute right-0 top-0 h-full w-1 bg-secondary"></div>
            
            {/* Bread Character */}
            <div className="bread-character absolute" ref={playerRef} style={{ left: '10px', top: '50%', transform: 'translateY(-50%)' }}></div>
            
            {/* Obstacles */}
            {obstacles.map(obstacle => (
              <div
                key={obstacle.id}
                id={`obstacle-${obstacle.id}`}
                className="obstacle"
                style={{
                  left: `${obstacle.x}px`,
                  top: `${obstacle.y}px`,
                  width: `${obstacle.width}px`,
                  height: `${obstacle.height}px`,
                }}
              ></div>
            ))}
            
            {(!gameActive || gameOver) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                <div className="text-center">
                  {gameOver ? (
                    <>
                      <h4 className="text-2xl font-bold text-white mb-4">Game Over!</h4>
                      <p className="text-white mb-4">Your final score: {gameStats.score}</p>
                    </>
                  ) : (
                    <h4 className="text-2xl font-bold text-white mb-4">Ready to Play?</h4>
                  )}
                  <Button onClick={() => startGameMutation.mutate()}>
                    {gameOver ? 'Play Again' : 'Start Game'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-foreground font-medium mb-2">Controls</h4>
              <div className="bg-background p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Use the arrow keys or WASD to move the bread character:</p>
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  <div></div>
                  <Button variant="outline" className="p-3 text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                  </Button>
                  <div></div>
                  <Button variant="outline" className="p-3 text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/></svg>
                  </Button>
                  <Button variant="outline" className="p-3 text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>
                  </Button>
                  <Button variant="outline" className="p-3 text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 5 7 7-7 7"/></svg>
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-foreground font-medium mb-2">Game Info</h4>
              <div className="bg-background p-3 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Level:</span>
                  <span className="text-accent font-medium">{gameStats.level}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Lives:</span>
                  <div>
                    {[...Array(3)].map((_, i) => (
                      <span key={i}>
                        {i < gameStats.lives ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline text-destructive">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline text-muted-foreground">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                          </svg>
                        )}
                        {' '}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="text-accent font-medium">{gameStats.score}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">High Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gameStats.highScores.length > 0 ? (
              gameStats.highScores.slice(0, 3).map((score, index) => (
                <div key={index} className="bg-background p-3 rounded-lg text-center">
                  <div className="text-accent text-2xl font-game">{score.score}</div>
                  <p className="text-muted-foreground text-sm">{score.player}</p>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center text-muted-foreground p-3">
                No high scores yet. Be the first one!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
