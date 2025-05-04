import { Card, CardContent } from "@/components/ui/card";
import { 
  FolderPlus, 
  Trophy, 
  Award, 
  CheckSquare
} from "lucide-react";
import { Link } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Poll, RaceRecord, Vote } from "@shared/schema";

export default function UserStatCards() {
  const { user, isGuest } = useAuth();
  
  // Only fetch user-specific data if not in guest mode
  const { data: userPolls = [] } = useQuery<Poll[]>({
    queryKey: ["/api/user/polls"],
    enabled: !isGuest && !!user
  });

  const { data: userVotes = [] } = useQuery<Vote[]>({
    queryKey: ["/api/user/votes"],
    enabled: !isGuest && !!user
  });
  
  const { data: userRaces = [] } = useQuery<RaceRecord[]>({
    queryKey: ["/api/user/races"],
    enabled: !isGuest && !!user
  });

  // Get active war polls (challenges with isWar=true and user has voted)
  const { data: activeWarPolls = [] } = useQuery<Poll[]>({
    queryKey: ["/api/user/warpasses"],
    enabled: !isGuest && !!user
  });

  // Get user's won battles
  const { data: userWonBattles = [] } = useQuery<RaceRecord[]>({
    queryKey: ["/api/user/battles/won"],
    enabled: !!user && !isGuest
  });
  
  // Fetch all polls for reference when displaying battle results
  const { data: allPolls = [] } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    enabled: !!user && !isGuest
  });
  
  // Calculate stats
  const challengeCount = userPolls.length;
  const voteCount = (user?.id && !isGuest) ? userVotes.length : 0;
  // Count all battles won by the user for display
  const warCount = userWonBattles.length;
  const warPassesCount = activeWarPolls.length;
  
  // Calculate ranks based on count and remaining to next rank
  const getRankInfo = (count: number): { rank: string, remaining: number, nextRank: string } => {
    if (count < 100) return { rank: "Egg", remaining: 100 - count, nextRank: "Jack" };
    if (count < 1000) return { rank: "Jack", remaining: 1000 - count, nextRank: "Queen" };
    if (count < 10000) return { rank: "Queen", remaining: 10000 - count, nextRank: "King" };
    if (count < 100000) return { rank: "King", remaining: 100000 - count, nextRank: "Ace" };
    if (count < 1000000) return { rank: "Ace", remaining: 1000000 - count, nextRank: "Jester" };
    return { rank: "Jester", remaining: 0, nextRank: "" };
  };
  
  const challengeRankInfo = getRankInfo(challengeCount);
  const voteRankInfo = getRankInfo(voteCount);
  const warRankInfo = getRankInfo(warCount);
  const warPassRankInfo = getRankInfo(warPassesCount);
  
  const stats = [
    {
      title: "Challenges",
      value: challengeCount,
      rank: challengeRankInfo.rank,
      remaining: challengeRankInfo.remaining,
      nextRank: challengeRankInfo.nextRank,
      icon: <FolderPlus className="text-primary" />,
      dropdown: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="cursor-pointer w-full h-full absolute inset-0 flex items-center justify-center opacity-0">
              <span>Open menu</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Challenges You Created</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userPolls.length > 0 ? (
              userPolls.map((poll: any) => {
                const createdDate = poll.createdAt ? new Date(poll.createdAt).toLocaleDateString() : '';
                return (
                  <DropdownMenuItem key={poll.id} asChild>
                    <Link 
                      href={`/polls/${poll.id}`} 
                      className="cursor-pointer flex items-center"
                    >
                      <FolderPlus className="h-4 w-4 mr-2 text-primary" />
                      <span className="truncate">{poll.question} <span className="text-xs text-muted-foreground">({createdDate})</span></span>
                    </Link>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                You haven't created any challenges yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    {
      title: "Wars",
      value: warCount,
      rank: warRankInfo.rank,
      remaining: warRankInfo.remaining,
      nextRank: warRankInfo.nextRank,
      icon: <Trophy className="text-primary" />,
      dropdown: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="cursor-pointer w-full h-full absolute inset-0 flex items-center justify-center opacity-0">
              <span>Open menu</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Wars You've Won</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userWonBattles.length > 0 ? (
              userWonBattles.map((race: any) => {
                const battleTime = race.racedAt ? new Date(race.racedAt).toLocaleDateString() : '';
                
                // Use formatted title based on the specified pattern
                let displayTitle = race.title || "";
                if (!displayTitle) {
                  if (race.pollId) {
                    // Find the matching poll for challenge battles
                    const poll = allPolls.find((p: any) => p.id === race.pollId);
                    const pollTitle = poll ? poll.question : `Challenge #${race.pollId}`;
                    displayTitle = `Battle of ${pollTitle} (${battleTime})`;
                  } else {
                    // Standalone battles
                    displayTitle = `Battle of Standalone Challenge (${battleTime})`;
                  }
                }
                
                return (
                  <DropdownMenuItem key={race.id}>
                    {race.pollId ? (
                      <Link 
                        href={`/polls/${race.pollId}`} 
                        className="cursor-pointer flex items-center w-full"
                      >
                        <Trophy className="h-4 w-4 mr-2 text-primary" />
                        <span className="truncate">
                          {displayTitle}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({battleTime}) - {race.time / 1000}s
                          </span>
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 mr-2 text-primary" />
                        <span className="truncate">
                          {displayTitle}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({battleTime}) - {race.time / 1000}s
                          </span>
                        </span>
                      </div>
                    )}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                You haven't won any battles yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    {
      title: "Votes",
      value: voteCount,
      rank: voteRankInfo.rank,
      remaining: voteRankInfo.remaining,
      nextRank: voteRankInfo.nextRank,
      icon: <CheckSquare className="text-primary" />,
      dropdown: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="cursor-pointer w-full h-full absolute inset-0 flex items-center justify-center opacity-0">
              <span>Open menu</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Challenges You Voted In</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userVotes.length > 0 ? (
              userVotes.map((vote: any) => {
                const poll = userPolls.find(p => p.id === vote.pollId) || { question: `Challenge #${vote.pollId}` };
                const voteTime = vote.votedAt ? new Date(vote.votedAt).toLocaleDateString() : '';
                return (
                  <DropdownMenuItem key={vote.id} asChild>
                    <Link 
                      href={`/polls/${vote.pollId}`} 
                      className="cursor-pointer flex items-center"
                    >
                      <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                      <span className="truncate">{poll.question} <span className="text-xs text-muted-foreground">({voteTime})</span></span>
                    </Link>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                You haven't voted in any challenges yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    {
      title: "War Passes",
      value: warPassesCount,
      rank: warPassRankInfo.rank,
      remaining: warPassRankInfo.remaining,
      nextRank: warPassRankInfo.nextRank,
      icon: <Award className="text-primary" />,
      dropdown: (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="cursor-pointer w-full h-full absolute inset-0 flex items-center justify-center opacity-0">
              <span>Open menu</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Available War Passes</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activeWarPolls.length > 0 ? (
              activeWarPolls.map((poll: any) => (
                <DropdownMenuItem key={poll.id} asChild>
                  <Link 
                    href={`/polls/${poll.id}`} 
                    className="cursor-pointer flex items-center"
                  >
                    <Award className="h-4 w-4 mr-2 text-primary" />
                    <span className="truncate">{poll.question}</span>
                  </Link>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No active War passes available
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];
  
  if (isGuest) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-card border-primary/30 relative group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{stat.title}</p>
                <h3 className="text-3xl font-montserrat font-bold mt-1">
                  {stat.value.toLocaleString()}
                </h3>
                <p className="text-xs text-primary mt-1">Rank: {stat.rank} {stat.remaining > 0 ? `(${stat.remaining} to ${stat.nextRank})` : ""}</p>
              </div>
              <div className="bg-primary/20 rounded-full w-10 h-10 flex items-center justify-center">
                {stat.icon}
              </div>
            </div>
            {stat.dropdown}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}