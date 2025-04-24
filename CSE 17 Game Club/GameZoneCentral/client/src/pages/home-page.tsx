import { useState, useEffect } from 'react';
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import GameCard from "@/components/game-card";
import GuessingGame from "@/components/games/guessing-game";
import SpinWheelGame from "@/components/games/spin-wheel-game";
import RedlightGame from "@/components/games/redlight-game";
import TyperacerGame from "@/components/games/typeracer-game";
import BreadGame from "@/components/games/bread-game";
import LeaderboardTable from "@/components/leaderboard-table";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, params] = useLocation();
  const searchParams = new URLSearchParams(params);
  const gameParam = searchParams.get("game");
  
  const [activeGame, setActiveGame] = useState<string | null>(gameParam);

  useEffect(() => {
    if (gameParam) {
      setActiveGame(gameParam);
    }
  }, [gameParam]);

  const { data: games } = useQuery({
    queryKey: ["/api/games"],
  });

  const closeGame = () => {
    setActiveGame(null);
    // Update URL to remove game parameter
    window.history.pushState({}, "", "/");
  };

  const renderActiveGame = () => {
    switch(activeGame) {
      case 'guessing':
        return <GuessingGame onClose={closeGame} />;
      case 'spinwheel':
        return <SpinWheelGame onClose={closeGame} />;
      case 'redlight':
        return <RedlightGame onClose={closeGame} />;
      case 'typeracer':
        return <TyperacerGame onClose={closeGame} />;
      case 'cse17':
        return <BreadGame onClose={closeGame} />;
      default:
        return null;
    }
  };

  const gameData = [
    {
      id: 'guessing',
      title: 'Guessing Game',
      description: 'Test your intuition by guessing the correct number within a range.',
      image: 'https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&h=300&q=80',
      rating: 4.5,
      badge: { text: 'Popular', color: 'primary' }
    },
    {
      id: 'spinwheel',
      title: 'Spin Wheel',
      description: 'Spin the wheel and test your luck to win exciting prizes!',
      image: 'https://images.unsplash.com/photo-1660164467500-77522d6bb5f5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&h=300&q=80',
      rating: 4.0,
      badge: { text: 'Featured', color: 'accent' }
    },
    {
      id: 'redlight',
      title: 'Red Light, Green Light',
      description: 'Move during green light, freeze on red light. Don\'t get caught!',
      image: 'https://images.unsplash.com/photo-1634391922163-d9f9f5e1850b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&h=300&q=80',
      rating: 4.9,
      badge: { text: 'New', color: 'secondary' }
    },
    {
      id: 'typeracer',
      title: 'Type Racer',
      description: 'Race against others by typing text as quickly and accurately as possible.',
      image: 'https://images.unsplash.com/photo-1633229737782-99cf1dc2e47c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&h=300&q=80',
      rating: 4.2,
      badge: { text: 'Popular', color: 'primary' }
    },
    {
      id: 'cse17',
      title: 'CSE-17 Bread Game',
      description: 'Help the bread navigate through obstacles in this unique platformer.',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&h=300&q=80',
      rating: 3.5,
      badge: { text: 'New', color: 'secondary' }
    }
  ];

  const handleGameClick = (gameId: string) => {
    setActiveGame(gameId);
    // Update URL to include game parameter
    window.history.pushState({}, "", `/?game=${gameId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          {renderActiveGame() || (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-heading font-bold text-foreground mb-6">CSE-17 Game Club</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gameData.map((game) => (
                    <GameCard
                      key={game.id}
                      id={game.id}
                      title={game.title}
                      description={game.description}
                      image={game.image}
                      rating={game.rating}
                      badge={game.badge}
                      onClick={handleGameClick}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Global Leaderboards</h2>
                <LeaderboardTable />
              </div>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
