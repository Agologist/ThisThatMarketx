import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Trophy, 
  Award, 
  Vote as VoteIcon
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
  const { data: userWonBattles = [] } = useQuery({
    queryKey: ["/api/user/battles/won"],
    queryFn: async () => {
      if (!user) return [];
      // Filter races that have pollId (only battles from challenges), and user won
      return userRaces.filter((race: any) => race.pollId && race.won);
    },
    enabled: !!user && !isGuest
  });
  
  // Calculate stats
  const challengeCount = userPolls.length;
  const voteCount = (user?.id && !isGuest) ? userVotes.length : 0;
  const warCount = userWonBattles.length; // Only count wars from challenge-related battles
  const warPassesCount = activeWarPolls.length;
  
  // Calculate ranks based on count
  const getRank = (count: number): string => {
    if (count < 100) return "Egg";
    if (count < 1000) return "Jack";
    if (count < 10000) return "Queen";
    if (count < 100000) return "King";
    if (count < 1000000) return "Ace";
    return "Jester";
  };
  
  const challengeRank = getRank(challengeCount);
  const voteRank = getRank(voteCount);
  const warRank = getRank(warCount);
  const warPassRank = getRank(warPassesCount);
  
  const stats = [
    {
      title: "Challenges",
      value: challengeCount,
      rank: challengeRank,
      icon: <FileText className="text-primary" />,
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
                      <FileText className="h-4 w-4 mr-2 text-primary" />
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
      rank: warRank,
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
                return (
                  <DropdownMenuItem key={race.id} asChild>
                    <Link 
                      href={`/polls/${race.pollId}`} 
                      className="cursor-pointer flex items-center"
                    >
                      <Trophy className="h-4 w-4 mr-2 text-primary" />
                      <span className="truncate">
                        Battle Won 
                        <span className="text-xs text-muted-foreground ml-1">
                          ({battleTime}) - {race.time / 1000}s
                        </span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              })
            ) : (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                You haven't won any challenge battles yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    {
      title: "Votes",
      value: voteCount,
      rank: voteRank,
      icon: <VoteIcon className="text-primary" />,
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
                      <VoteIcon className="h-4 w-4 mr-2 text-primary" />
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
      rank: warPassRank,
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
                <p className="text-xs text-primary mt-1">Rank: {stat.rank}</p>
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