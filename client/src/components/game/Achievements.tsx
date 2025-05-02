import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, LockIcon, Rocket } from "lucide-react";
import { UserAchievement, Achievement } from "@shared/schema";

interface AchievementProps {
  achievements: (UserAchievement & Achievement)[];
}

export default function Achievements({ achievements }: AchievementProps) {
  // Map of Font Awesome icon names to Lucide icons
  const iconMap: Record<string, React.ReactNode> = {
    'poll': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    'star': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    'vote-yea': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    'flag-checkered': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    'tachometer-alt': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'trophy': (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    'default': <Rocket className="h-5 w-5" />
  };
  
  // Get the appropriate icon for an achievement
  const getIcon = (iconName: string) => {
    return iconMap[iconName] || iconMap.default;
  };
  
  // Sort achievements: completed first, then by progress
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    return b.progress - a.progress;
  });
  
  // Find next achievement to highlight (first incomplete with highest progress)
  const nextAchievement = sortedAchievements.find(a => !a.completed);
  
  // For achievement grid, show all completed ones + some locked ones
  const displayedAchievements = sortedAchievements.slice(0, 6);
  // Fill with locked placeholders if not enough
  while (displayedAchievements.length < 6) {
    displayedAchievements.push({
      id: -displayedAchievements.length,
      name: "Locked",
      description: "Keep playing to unlock",
      iconName: "lock",
      criteria: "locked",
      userId: 0,
      achievementId: 0,
      unlockedAt: new Date(),
      progress: 0,
      completed: false
    } as unknown as (UserAchievement & Achievement));
  }
  
  return (
    <Card className="bg-card border-primary/30">
      <CardHeader className="flex justify-between items-center pb-4">
        <CardTitle className="text-xl font-montserrat font-bold">Achievements</CardTitle>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {displayedAchievements.map((achievement) => (
            <div 
              key={achievement.id}
              className={`achievement-badge ${achievement.completed ? "bg-black" : "bg-black/50 opacity-40"} 
                rounded-lg p-2 flex flex-col items-center justify-center text-center`}
            >
              <div className={`w-12 h-12 rounded-full ${achievement.completed ? "bg-primary/20" : "bg-muted/20"} 
                flex items-center justify-center mb-2`}
              >
                {achievement.completed || achievement.progress > 0 ? (
                  <span className={achievement.completed ? "text-primary" : "text-muted-foreground"}>
                    {getIcon(achievement.iconName)}
                  </span>
                ) : (
                  <LockIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className={`text-xs ${achievement.completed ? "text-foreground" : "text-muted-foreground"}`}>
                {achievement.name}
              </span>
            </div>
          ))}
        </div>
        
        <div className="bg-black rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Next Achievement</h4>
          
          {nextAchievement ? (
            <>
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="text-primary">{getIcon(nextAchievement.iconName)}</span>
                </div>
                <div className="flex-grow">
                  <h5 className="text-sm font-medium">{nextAchievement.name}</h5>
                  <div className="flex items-center">
                    <div className="w-full bg-card rounded-full h-1.5 mr-2">
                      <div 
                        className="bg-primary h-1.5 rounded-full" 
                        style={{ width: `${Math.min((nextAchievement.progress / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {nextAchievement.progress}/10
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {nextAchievement.description}
              </p>
            </>
          ) : (
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h5 className="text-sm font-medium">All Achievements Unlocked!</h5>
                <p className="text-xs text-muted-foreground">
                  You've completed all available achievements
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
