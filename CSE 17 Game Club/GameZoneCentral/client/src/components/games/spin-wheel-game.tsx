import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface SpinWheelGameProps {
  onClose: () => void;
}

export default function SpinWheelGame({ onClose }: SpinWheelGameProps) {
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ prize: string; value: number } | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const prizes = [
    { color: "#EF4444", value: 100, label: "100 Points" },
    { color: "#F59E0B", value: 250, label: "250 Points" },
    { color: "#10B981", value: 500, label: "500 Points" },
    { color: "#3B82F6", value: 1000, label: "1000 Points" },
    { color: "#6D28D9", value: 0, label: "Try Again" },
    { color: "#EC4899", value: 150, label: "150 Points" },
    { color: "#8B5CF6", value: 750, label: "750 Points" },
    { color: "#F97316", value: 300, label: "300 Points" },
  ];

  const spinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/games/spinwheel/spin", {});
      return res.json();
    },
    onSuccess: (data) => {
      const { prize, value, degrees } = data;
      
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${degrees}deg)`;
      }
      
      setTimeout(() => {
        setIsSpinning(false);
        setResult({ prize, value });
        
        toast({
          title: "Congratulations!",
          description: `You won ${value} points!`,
        });
      }, 5000);
    },
    onError: (error) => {
      setIsSpinning(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSpin = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResult(null);
    spinMutation.mutate();
  };

  return (
    <div className="bg-card rounded-xl shadow-lg p-8 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-heading font-bold text-foreground">Spin Wheel Game</h2>
        <Button variant="outline" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Card className="mb-6 bg-muted/50">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-medium text-foreground mb-2">Spin to Win!</h3>
            <p className="text-muted-foreground">Try your luck and win amazing prizes.</p>
          </div>
          
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative w-72 h-72 mx-auto">
              {/* Wheel Indicator */}
              <div className="wheel-indicator"></div>
              
              {/* Spin Wheel */}
              <div className="spin-wheel" ref={wheelRef}>
                {/* Wheel sections with different colors */}
                {prizes.map((prize, index) => (
                  <div 
                    key={index}
                    className="wheel-section" 
                    style={{ 
                      backgroundColor: prize.color,
                      transform: `rotate(${index * 45}deg)`
                    }}
                  ></div>
                ))}
                
                {/* Wheel Center */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              className="mt-6 w-full max-w-md"
              onClick={handleSpin}
              disabled={isSpinning}
            >
              {isSpinning ? "Spinning..." : "Spin the Wheel"}
            </Button>
          </div>
          
          {result && (
            <div className="bg-background rounded-lg p-4 text-center">
              <p className="text-xl font-medium mb-2">Congratulations!</p>
              <p className="text-accent text-2xl font-game mb-2">+{result.value} Points</p>
              <p className="text-muted-foreground">You won {result.value} points! Keep spinning for more prizes.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Prizes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {prizes.map((prize, index) => (
              <div key={index} className="bg-background p-3 rounded-lg text-center">
                <p className="text-accent font-medium">{prize.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
