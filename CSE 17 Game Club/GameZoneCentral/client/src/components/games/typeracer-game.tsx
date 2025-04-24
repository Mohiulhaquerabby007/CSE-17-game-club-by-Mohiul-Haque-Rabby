import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface TyperacerGameProps {
  onClose: () => void;
}

interface LeaderboardEntry {
  rank: number;
  player: string;
  wpm: number;
  accuracy: number;
}

export default function TyperacerGame({ onClose }: TyperacerGameProps) {
  const { toast } = useToast();
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timer, setTimer] = useState(60);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [currentText, setCurrentText] = useState("");
  const [displayText, setDisplayText] = useState<{ char: string; status: string }[]>([]);
  const [input, setInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startGameMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/games/typeracer/start", {});
      return res.json();
    },
    onSuccess: (data) => {
      const { text } = data;
      setCurrentText(text);
      
      // Reset game state
      setGameActive(true);
      setGameOver(false);
      setTimer(60);
      setWpm(0);
      setAccuracy(100);
      setInput("");
      setCurrentIndex(0);
      setCorrectChars(0);
      setIncorrectChars(0);
      
      // Format display text
      const formattedText = text.split('').map(char => ({
        char,
        status: ''
      }));
      formattedText[0].status = 'active';
      setDisplayText(formattedText);
      
      // Focus input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast({
        title: "Game Started",
        description: "Type the text as fast and accurately as you can!",
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
    mutationFn: async (data: { wpm: number; accuracy: number }) => {
      const res = await apiRequest("POST", "/api/games/typeracer/score", data);
      return res.json();
    },
    onSuccess: (data) => {
      setLeaderboard(data.leaderboard);
      
      toast({
        title: "Score Submitted",
        description: `Your score: ${wpm} WPM with ${accuracy}% accuracy`,
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

  // Fetch leaderboard on initial load
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('/api/games/typeracer/leaderboard');
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }
    };
    
    fetchLeaderboard();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!gameActive || gameOver) return;
    
    const value = e.target.value;
    setInput(value);
    
    // Check correctness of the last character typed
    const expectedChar = currentText[currentIndex];
    const typedChar = value[value.length - 1];
    
    if (typedChar === expectedChar) {
      // Correct character
      setCorrectChars(prev => prev + 1);
      
      // Update display text
      const newDisplayText = [...displayText];
      newDisplayText[currentIndex].status = 'correct';
      if (currentIndex + 1 < currentText.length) {
        newDisplayText[currentIndex + 1].status = 'active';
      }
      setDisplayText(newDisplayText);
      
      // Move to next character
      setCurrentIndex(prev => prev + 1);
      
      // Calculate WPM (words per minute)
      // Assume average word length is 5 characters
      const minutes = (60 - timer) / 60;
      if (minutes > 0) {
        const words = correctChars / 5;
        setWpm(Math.round(words / minutes));
      }
      
      // Calculate accuracy
      const total = correctChars + incorrectChars + 1;
      setAccuracy(Math.round((correctChars + 1) / total * 100));
      
      // Clear input if reached end of word
      if (expectedChar === ' ' || currentIndex + 1 >= currentText.length) {
        setInput('');
      }
      
      // Check if finished the text
      if (currentIndex + 1 >= currentText.length) {
        endGame();
      }
    } else {
      // Incorrect character
      setIncorrectChars(prev => prev + 1);
      
      // Update display text
      const newDisplayText = [...displayText];
      newDisplayText[currentIndex].status = 'incorrect';
      setDisplayText(newDisplayText);
      
      // Calculate accuracy
      const total = correctChars + incorrectChars + 1;
      setAccuracy(Math.round(correctChars / total * 100));
    }
  };

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setGameActive(false);
    setGameOver(true);
    
    // Submit score
    submitScoreMutation.mutate({ wpm, accuracy });
  };

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Type Racer</h2>
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Card className="mb-6 bg-muted/50">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-medium text-foreground mb-2">Type As Fast As You Can!</h3>
            <p className="text-muted-foreground">Test your typing speed and accuracy.</p>
          </div>
          
          <div className="bg-background p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-muted-foreground">Time: </span>
                <span className="text-xl font-game text-accent">{timer}</span>
                <span className="text-muted-foreground text-sm">seconds</span>
              </div>
              <div>
                <span className="text-muted-foreground">WPM: </span>
                <span className="text-xl font-game text-secondary">{wpm}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Accuracy: </span>
                <span className="text-xl font-game text-accent">{accuracy}%</span>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg mb-4 typing-game">
              <p className="text-foreground text-lg leading-relaxed">
                {displayText.map((char, index) => (
                  <span 
                    key={index} 
                    className={`letter ${char.status}`}
                  >
                    {char.char}
                  </span>
                ))}
              </p>
            </div>
            
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                className="w-full bg-card text-foreground"
                placeholder="Start typing here..."
                disabled={!gameActive}
              />
              
              {(!gameActive) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-md">
                  <Button onClick={() => startGameMutation.mutate()}>
                    {gameOver ? 'Play Again' : 'Start Typing'}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <Card className="bg-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-muted-foreground text-left text-sm">
                      <th className="px-4 py-2">Rank</th>
                      <th className="px-4 py-2">Player</th>
                      <th className="px-4 py-2">WPM</th>
                      <th className="px-4 py-2">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="px-4 py-2 text-accent font-medium">{entry.rank}</td>
                        <td className="px-4 py-2 text-foreground">{entry.player}</td>
                        <td className="px-4 py-2 text-foreground">{entry.wpm}</td>
                        <td className="px-4 py-2 text-foreground">{entry.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
