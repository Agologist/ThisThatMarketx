import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Database, Trophy, Medal } from "lucide-react";

interface StatCardsProps {
  pollCount: number;
  raceWins: number;
  achievements: number;
}

export default function StatCards({ pollCount, raceWins, achievements }: StatCardsProps) {
  const stats = [
    {
      title: "Active Polls",
      value: pollCount,
      icon: <BarChart3 className="text-primary" />,
      change: {
        value: 12,
        type: "increase" as const
      }
    },
    {
      title: "Data Points",
      value: 1259,
      icon: <Database className="text-primary" />,
      change: {
        value: 23,
        type: "increase" as const
      }
    },
    {
      title: "Race Wins",
      value: raceWins,
      icon: <Trophy className="text-primary" />,
      change: {
        value: 5,
        type: "decrease" as const
      }
    },
    {
      title: "Achievements",
      value: achievements,
      total: 30,
      icon: <Medal className="text-primary" />,
      progress: true
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-card border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{stat.title}</p>
                <h3 className="text-3xl font-montserrat font-bold mt-1">
                  {stat.progress ? `${stat.value}/${stat.total}` : stat.value.toLocaleString()}
                </h3>
              </div>
              <div className="bg-primary/20 rounded-full w-10 h-10 flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            
            {stat.progress ? (
              <div className="mt-4">
                <Progress 
                  value={(stat.value / (stat.total || 1)) * 100} 
                  className="h-2.5 bg-black"
                />
              </div>
            ) : (
              <div className="mt-4 flex items-center">
                <span 
                  className={`
                    text-sm flex items-center 
                    ${stat.change.type === "increase" ? "text-emerald-500" : "text-red-500"}
                  `}
                >
                  {stat.change.type === "increase" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {stat.change.value}%
                </span>
                <span className="text-muted-foreground text-sm ml-2">vs last week</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
