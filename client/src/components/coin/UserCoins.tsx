import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, ExternalLink } from "lucide-react";
import { GeneratedCoin } from "@shared/schema";

export default function UserCoins() {
  const { user } = useAuth();
  
  const { data: coins, isLoading } = useQuery<GeneratedCoin[]>({
    queryKey: ["/api/user/coins"],
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Your Meme Coins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading your coins...</p>
        </CardContent>
      </Card>
    );
  }

  if (!coins || coins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Your Meme Coins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No coins yet! Vote on polls to automatically receive meme coins.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Your Meme Coins ({coins.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {coins.map((coin) => (
            <div
              key={coin.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{coin.coinName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {coin.coinSymbol}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Coin Address: {coin.coinAddress.slice(0, 8)}...{coin.coinAddress.slice(-8)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Your Wallet: {coin.userWallet ? coin.userWallet.slice(0, 8) + '...' + coin.userWallet.slice(-8) : 'Demo Mode'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {coin.createdAt ? new Date(coin.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={coin.status === 'created' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {coin.status}
                </Badge>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}