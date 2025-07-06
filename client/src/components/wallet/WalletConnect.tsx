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

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function WalletConnect({ onWalletUpdate }: WalletConnectProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [savedWallet, setSavedWallet] = useState(localStorage.getItem("eth_wallet") || "");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask Required",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const address = accounts[0];
      setWalletAddress(address);
      setSavedWallet(address);
      localStorage.setItem("eth_wallet", address);
      
      if (onWalletUpdate) {
        onWalletUpdate(address);
      }

      toast({
        title: "Wallet Connected",
        description: `Connected ${address.slice(0, 8)}...${address.slice(-6)}`,
      });
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      
      if (error.code === 4001) {
        toast({
          title: "Connection Cancelled",
          description: "Please approve the connection in MetaMask",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Please try connecting again",
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualWallet = async () => {
    if (!walletAddress.trim()) {
      toast({
        title: "Invalid Wallet",
        description: "Please enter a valid Ethereum wallet address",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for Ethereum address format (0x + 40 hex characters)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      toast({
        title: "Invalid Format", 
        description: "Please enter a valid Ethereum wallet address (0x...)",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Save to localStorage for immediate use
      localStorage.setItem("eth_wallet", walletAddress);
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
    localStorage.removeItem("eth_wallet");
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
          Ethereum Wallet
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
                  onClick={() => window.open(`https://basescan.org/address/${savedWallet}`, '_blank')}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Base network ERC-20 tokens will be sent to this wallet when you vote on polls.
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
              Connect your Ethereum wallet to receive Base network tokens when you vote.
            </p>
            
            {window.ethereum ? (
              <div className="space-y-2">
                <Button 
                  onClick={connectMetaMask}
                  disabled={isConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isConnecting ? "Connecting..." : "Connect with MetaMask"}
                </Button>
                <div className="text-center text-xs text-muted-foreground">or</div>
              </div>
            ) : (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-orange-400 mb-2">MetaMask not detected</p>
                <a 
                  href="https://metamask.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  Install MetaMask
                </a>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                placeholder="Enter your Ethereum wallet address (0x...)..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleManualWallet}
                disabled={isConnecting || !walletAddress.trim()}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your Ethereum wallet address or use MetaMask for automatic connection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}