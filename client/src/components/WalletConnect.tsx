import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WalletConnectProps {
  onPaymentComplete?: () => void;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function WalletConnect({ onPaymentComplete }: WalletConnectProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const { toast } = useToast();

  // Polygon network configuration
  const POLYGON_NETWORK = {
    chainId: '0x89', // 137 in hex
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorerUrls: ['https://polygonscan.com/'],
  };

  // USDT contract on Polygon
  const USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
  const USDT_DECIMALS = 6;

  useEffect(() => {
    fetchPaymentInfo();
    checkWalletConnection();
  }, []);

  const fetchPaymentInfo = async () => {
    try {
      const response = await fetch('/api/packages/payment-info');
      const data = await response.json();
      setPaymentInfo(data);
    } catch (error) {
      console.error('Failed to fetch payment info:', error);
    }
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setNetworkId(chainId);
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
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
      // This should automatically trigger MetaMask popup
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      setAccount(accounts[0]);
      
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setNetworkId(chainId);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      
      if (error.code === 4001) {
        toast({
          title: "Connection Cancelled",
          description: "Wallet connection was cancelled by user",
          variant: "destructive",
        });
      } else if (error.code === -32002) {
        toast({
          title: "Connection Pending",
          description: "MetaMask is already processing a connection request",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect wallet",
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToPolygon = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_NETWORK.chainId }],
      });
      setNetworkId(POLYGON_NETWORK.chainId);
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added, add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [POLYGON_NETWORK],
          });
          setNetworkId(POLYGON_NETWORK.chainId);
        } catch (addError) {
          toast({
            title: "Network Addition Failed",
            description: "Failed to add Polygon network",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Network Switch Failed",
          description: "Failed to switch to Polygon network",
          variant: "destructive",
        });
      }
    }
  };

  const purchasePackage = useMutation({
    mutationFn: async (txHash: string) =>
      apiRequest("/api/packages/purchase", "POST", {
        paymentTxHash: txHash,
        paymentAmount: "1.00"
      }),
    onSuccess: () => {
      toast({
        title: "Package Activated!",
        description: "Your package has been activated successfully. You now have 3 poll credits.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/packages"] });
      onPaymentComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate package",
        variant: "destructive",
      });
    },
  });

  const payWithUSDT = async () => {
    if (!account || !paymentInfo) return;

    setIsPaymentPending(true);
    
    try {
      // Ensure MetaMask is active and ready
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Amount in USDT (1.00 USDT with 6 decimals)
      const amount = BigInt(1000000); // 1.00 USDT
      
      // USDT transfer function signature: transfer(address,uint256)
      const transferFunction = '0xa9059cbb';
      const paddedRecipient = paymentInfo.polygonWallet.slice(2).padStart(64, '0');
      const paddedAmount = amount.toString(16).padStart(64, '0');
      const data = transferFunction + paddedRecipient + paddedAmount;

      // Enhanced transaction parameters for better MetaMask popup
      const txParams = {
        from: account,
        to: USDT_CONTRACT,
        data: data,
        value: '0x0',
        gas: '0x186A0', // 100000 gas limit
      };

      console.log('Initiating USDT payment...');

      // This should trigger MetaMask popup automatically
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      toast({
        title: "Payment Sent",
        description: "Processing your payment...",
      });

      // Activate package with transaction hash
      purchasePackage.mutate(txHash);

    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.code === 4001) {
        toast({
          title: "Payment Cancelled",
          description: "Transaction was cancelled by user",
          variant: "destructive",
        });
      } else if (error.code === -32603) {
        toast({
          title: "Transaction Failed",
          description: "Please check your USDT balance and try again",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Failed",
          description: error.message || "Failed to send payment",
          variant: "destructive",
        });
      }
    } finally {
      setIsPaymentPending(false);
    }
  };

  const isPolygonNetwork = networkId === POLYGON_NETWORK.chainId;

  if (!paymentInfo) {
    return (
      <Card className="bg-gray-900 border-yellow-400/20">
        <CardContent className="p-6 text-center">
          <div>Loading payment information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-yellow-400/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-400">
          <Wallet className="h-5 w-5" />
          Wallet Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
          <div className="text-sm text-yellow-400 font-medium mb-2">Package Details</div>
          <div className="space-y-1 text-sm">
            <div>Price: <span className="font-bold">${paymentInfo.packagePrice} USDT</span></div>
            <div>Credits: <span className="font-bold">{paymentInfo.packagePolls} polls</span></div>
            <div>Network: <span className="font-bold">Polygon</span></div>
          </div>
        </div>

        {!account ? (
          <Button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="text-sm">
                <div className="text-gray-400">Connected Wallet</div>
                <div className="font-mono">{account.slice(0, 6)}...{account.slice(-4)}</div>
              </div>
              <Badge variant="outline" className="bg-green-900/50 border-green-500/50 text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>

            {!isPolygonNetwork ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-orange-400">
                  <AlertCircle className="h-4 w-4" />
                  Switch to Polygon network to continue
                </div>
                <Button
                  onClick={switchToPolygon}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Switch to Polygon
                </Button>
              </div>
            ) : (
              <Button
                onClick={payWithUSDT}
                disabled={isPaymentPending || purchasePackage.isPending}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
              >
                {isPaymentPending ? "Opening MetaMask..." : 
                 purchasePackage.isPending ? "Activating Package..." : 
                 "Pay 1.00 USDT"}
              </Button>
            )}
          </div>
        )}

        <div className="text-xs text-gray-400 space-y-1">
          <div>• Secure payment through your connected wallet</div>
          <div>• Transaction automatically verified on blockchain</div>
          <div>• Package activated immediately after confirmation</div>
        </div>
      </CardContent>
    </Card>
  );
}