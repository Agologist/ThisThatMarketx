import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Coins, Wallet, X } from "lucide-react";

interface CoinDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  coinName: string;
  coinSymbol: string;
  option: string;
  pollId: number;
  onDeliveryChoice: (walletAddress: string | null) => void;
}

export default function CoinDeliveryModal({
  isOpen,
  onClose,
  coinName,
  coinSymbol,
  option,
  pollId,
  onDeliveryChoice
}: CoinDeliveryModalProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  console.log("🔄 CoinDeliveryModal render:", { isOpen, coinName, coinSymbol, option, pollId });

  const validateSolanaAddress = (address: string): boolean => {
    // Basic Solana address validation - should be 32-44 characters, alphanumeric + specific chars
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
  };

  const handleReceiveInWallet = async () => {
    if (!walletAddress.trim()) {
      toast({
        title: "Wallet Address Required",
        description: "Please enter your Solana wallet address to receive the coin.",
        variant: "destructive",
      });
      return;
    }

    if (!validateSolanaAddress(walletAddress.trim())) {
      toast({
        title: "Invalid Wallet Address",
        description: "Please enter a valid Solana wallet address.",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      await onDeliveryChoice(walletAddress.trim());
      onClose();
    } catch (error) {
      console.error('Error delivering coin:', error);
      toast({
        title: "Delivery Failed",
        description: "Failed to deliver coin to your wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkipDelivery = async () => {
    try {
      await onDeliveryChoice(null); // null means use demo wallet
      onClose();
    } catch (error) {
      console.error('Error skipping delivery:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            Congratulations! You earned a coin!
          </DialogTitle>
          <DialogDescription>
            You've earned <strong>{coinName} ({coinSymbol})</strong> for voting on "{option}"!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">{coinName}</span>
              <span className="text-sm text-yellow-600">({coinSymbol})</span>
            </div>
            <p className="text-sm text-yellow-700">
              Choose where you'd like to receive your new meme coin:
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="wallet-address" className="text-sm font-medium">
                Your Solana Wallet Address (Optional)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="wallet-address"
                  placeholder="Enter your Solana wallet address..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Don't have a wallet? Try <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:underline">Phantom</a> or <a href="https://solflare.com" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:underline">Solflare</a>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={handleReceiveInWallet}
              disabled={isValidating}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isValidating ? "Delivering..." : "Send to My Wallet"}
            </Button>
            
            <Button 
              onClick={handleSkipDelivery}
              variant="outline"
              className="border-gray-300"
            >
              Skip (Use Demo Mode)
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Demo mode stores coins in a test wallet for display purposes only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}