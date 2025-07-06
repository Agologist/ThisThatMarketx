import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface WalletConnectProps {
  onWalletUpdate?: (wallet: string) => void;
}

export default function WalletConnect({ onWalletUpdate }: WalletConnectProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [savedWallet, setSavedWallet] = useState(localStorage.getItem("solana_wallet") || "");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSaveWallet = async () => {
    if (!walletAddress.trim()) {
      toast({
        title: "Invalid Wallet",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for Solana address format (base58, 32-44 characters)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      toast({
        title: "Invalid Format",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Save to localStorage for immediate use
      localStorage.setItem("solana_wallet", walletAddress);
      setSavedWallet(walletAddress);
      
      // Optionally save to user profile if authenticated
      if (user) {
        try {
          await apiRequest("/api/user/wallet", "POST", { 
            walletAddress: walletAddress 
          });
        } catch (error) {
          // Don't fail if backend save fails, localStorage is sufficient
          console.log("Could not save to backend, using localStorage only");
        }
      }

      toast({
        title: "Wallet Connected!",
        description: "Your future meme coins will be sent to this wallet",
      });

      onWalletUpdate?.(walletAddress);
      setWalletAddress("");
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(savedWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Wallet address copied to clipboard",
    });
  };

  const disconnectWallet = () => {
    localStorage.removeItem("solana_wallet");
    setSavedWallet("");
    onWalletUpdate?.("");
    toast({
      title: "Wallet Disconnected",
      description: "You'll need to reconnect to receive future coins",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Solana Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedWallet ? (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Connected Wallet:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background p-1 rounded flex-1 truncate">
                  {savedWallet.slice(0, 8)}...{savedWallet.slice(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-8 w-8 p-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://solscan.io/account/${savedWallet}`, '_blank')}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your meme coins will be sent to this wallet when you vote on polls.
            </p>
            <Button 
              variant="outline" 
              onClick={disconnectWallet}
              className="w-full"
            >
              Disconnect Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Solana wallet to receive meme coins when you vote.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your Solana wallet address..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSaveWallet}
                disabled={isConnecting || !walletAddress.trim()}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Don't have a Solana wallet? Try{" "}
              <a 
                href="https://phantom.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Phantom
              </a>{" "}
              or{" "}
              <a 
                href="https://solflare.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Solflare
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}