import { useState } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import LeaderboardTable from "@/components/leaderboard-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-card rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Global Leaderboards</h2>
            
            <Tabs 
              defaultValue="all" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="overflow-x-auto">
                <TabsList className="mb-6 flex-nowrap overflow-x-auto w-max">
                  <TabsTrigger value="all">All Games</TabsTrigger>
                  <TabsTrigger value="guessing">Guessing Game</TabsTrigger>
                  <TabsTrigger value="spinwheel">Spin Wheel</TabsTrigger>
                  <TabsTrigger value="redlight">Red Light, Green Light</TabsTrigger>
                  <TabsTrigger value="typeracer">Type Racer</TabsTrigger>
                  <TabsTrigger value="cse17">CSE-17 Bread Game</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="all">
                <LeaderboardTable gameType="all" />
              </TabsContent>
              
              <TabsContent value="guessing">
                <LeaderboardTable gameType="guessing" />
              </TabsContent>
              
              <TabsContent value="spinwheel">
                <LeaderboardTable gameType="spinwheel" />
              </TabsContent>
              
              <TabsContent value="redlight">
                <LeaderboardTable gameType="redlight" />
              </TabsContent>
              
              <TabsContent value="typeracer">
                <LeaderboardTable gameType="typeracer" />
              </TabsContent>
              
              <TabsContent value="cse17">
                <LeaderboardTable gameType="cse17" />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
