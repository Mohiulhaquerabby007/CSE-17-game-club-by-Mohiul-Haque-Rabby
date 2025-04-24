import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface GuessingGameProps {
  onClose: () => void;
}

export default function GuessingGame({ onClose }: GuessingGameProps) {
  const { toast } = useToast();
  const [guess, setGuess] = useState(50);
  const [result, setResult] = useState<null | { message: string, isCorrect: boolean, attemptsLeft: number }>(null);
  const [previousGuesses, setPreviousGuesses] = useState<number[]>([]);
  const [gameStats, setGameStats] = useState({ gamesPlayed: 0, winRate: 0, bestScore: 0 });

  // Fetch game stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/games/guessing/stats');
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

  const submitGuessMutation = useMutation({
    mutationFn: async (guessValue: number) => {
      const res = await apiRequest("POST", "/api/games/guessing/guess", { guess: guessValue });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setPreviousGuesses(prev => [...prev, guess]);
      
      if (data.isCorrect) {
        toast({
          title: "Congratulations!",
          description: "You guessed the correct number!",
        });
        
        // Refresh game stats
        queryClient.invalidateQueries({ queryKey: ["/api/games/guessing/stats"] });
      } else if (data.attemptsLeft === 0) {
        toast({
          title: "Game Over",
          description: `You're out of attempts. The number was ${data.correctNumber}.`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startNewGameMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/games/guessing/new", {});
      return res.json();
    },
    onSuccess: () => {
      setResult(null);
      setPreviousGuesses([]);
      setGuess(50);
      toast({
        title: "New Game Started",
        description: "Try to guess the number between 1 and 100.",
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

  const handleGuessSubmit = () => {
    submitGuessMutation.mutate(guess);
  };

  const handleNewGame = () => {
    startNewGameMutation.mutate();
  };

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Guessing Game</h2>
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Card className="mb-6 bg-muted/50">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-medium text-foreground mb-2">Guess the Number</h3>
            <p className="text-muted-foreground">
              I'm thinking of a number between <span className="text-accent font-medium">1</span> and <span className="text-accent font-medium">100</span>.
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-full max-w-md bg-background rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Your Guess:</span>
                <span className="text-2xl font-game text-accent">{guess}</span>
              </div>
              <Slider
                className="mt-2"
                min={1}
                max={100}
                step={1}
                value={[guess]}
                onValueChange={([value]) => setGuess(value)}
              />
            </div>
            
            <Button
              className="w-full max-w-md"
              onClick={handleGuessSubmit}
              disabled={submitGuessMutation.isPending || Boolean(result?.isCorrect) || previousGuesses.includes(guess)}
            >
              {submitGuessMutation.isPending ? "Submitting..." : "Submit Guess"}
            </Button>
            
            {result?.isCorrect && (
              <Button
                className="w-full max-w-md mt-2"
                onClick={handleNewGame}
                disabled={startNewGameMutation.isPending}
              >
                Start New Game
              </Button>
            )}
          </div>
          
          {result && (
            <div className="bg-background rounded-lg p-4 text-center mb-6">
              <p className="text-xl font-medium mb-2">
                Your guess was {result.message}!
              </p>
              <p className="text-muted-foreground">
                You have <span className="text-accent font-medium">{result.attemptsLeft}</span> attempts remaining.
              </p>
            </div>
          )}
          
          {previousGuesses.length > 0 && (
            <div className="bg-background rounded-lg p-4 mt-6">
              <h4 className="text-foreground font-medium mb-2">Previous Guesses</h4>
              <div className="flex flex-wrap gap-2">
                {previousGuesses.map((prevGuess, index) => (
                  <Badge key={index} variant="secondary">{prevGuess}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Game Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground text-sm">Games Played</p>
              <p className="text-xl font-game text-accent">{gameStats.gamesPlayed}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Win Rate</p>
              <p className="text-xl font-game text-secondary">{gameStats.winRate}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Best Score</p>
              <p className="text-xl font-game text-accent">{gameStats.bestScore}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
