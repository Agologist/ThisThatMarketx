import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, ExternalLink, Package, Coins, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PaymentInfo {
  polygonWallet: string;
  packagePrice: string;
  packagePolls: number;
  paymentToken: string;
  paymentChain: string;
  instructions: string[];
}

interface Package {
  id: number;
  userId: number;
  status: string;
  packageType: string;
  totalPolls: number;
  usedPolls: number;
  remainingPolls: number;
  paymentTxHash: string;
  paymentAmount: string;
  paymentToken: string;
  paymentChain: string;
  purchasedAt: string | null;
  expiresAt: string | null;
}

export default function PackagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("1.00");

  // Fetch payment information
  const { data: paymentInfo, isLoading: paymentLoading } = useQuery<PaymentInfo>({
    queryKey: ["/api/packages/payment-info"],
  });

  // Fetch user packages
  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/user/packages"],
    enabled: !!user,
  });

  // Purchase package mutation
  const purchasePackage = useMutation({
    mutationFn: async (data: { paymentTxHash: string; paymentAmount: string }) =>
      apiRequest("/api/packages/purchase", "POST", data),
    onSuccess: () => {
      toast({
        title: "Package Purchased!",
        description: "Your package has been activated successfully. You now have 3 poll credits.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/packages"] });
      setTxHash("");
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase package. Please check your transaction hash.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash.trim()) {
      toast({
        title: "Transaction Hash Required",
        description: "Please enter your payment transaction hash",
        variant: "destructive",
      });
      return;
    }
    purchasePackage.mutate({
      paymentTxHash: txHash.trim(),
      paymentAmount: amount,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "used_up": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-bold mb-4">Login Required</h2>
              <p>Please log in to manage your packages.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Package className="h-8 w-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-yellow-400">MemeCoin Packages</h1>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Purchase Package */}
          <Card className="bg-gray-900 border-yellow-400/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <CreditCard className="h-5 w-5" />
                Purchase Package
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {paymentLoading ? (
                <div className="text-center py-4">Loading payment info...</div>
              ) : paymentInfo ? (
                <>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                      <div className="text-sm text-yellow-400 font-medium mb-2">Package Details</div>
                      <div className="space-y-1 text-sm">
                        <div>Price: <span className="font-bold">${paymentInfo.packagePrice} {paymentInfo.paymentToken}</span></div>
                        <div>Credits: <span className="font-bold">{paymentInfo.packagePolls} polls</span></div>
                        <div>Network: <span className="font-bold capitalize">{paymentInfo.paymentChain}</span></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Payment Address</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={paymentInfo.polygonWallet}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(paymentInfo.polygonWallet)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-red-400">Instructions</Label>
                      <div className="text-xs space-y-1 text-gray-300">
                        {paymentInfo.instructions.map((instruction, index) => (
                          <div key={index}>• {instruction}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <form onSubmit={handlePurchase} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="txHash">Transaction Hash</Label>
                      <Input
                        id="txHash"
                        placeholder="0x..."
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (USDT)</Label>
                      <Input
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        readOnly
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
                      disabled={purchasePackage.isPending}
                    >
                      {purchasePackage.isPending ? "Processing..." : "Activate Package"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4 text-red-400">Failed to load payment information</div>
              )}
            </CardContent>
          </Card>

          {/* Package Status */}
          <Card className="bg-gray-900 border-yellow-400/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <Coins className="h-5 w-5" />
                Your Packages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {packagesLoading ? (
                <div className="text-center py-4">Loading packages...</div>
              ) : packages && packages.length > 0 ? (
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={`${getStatusColor(pkg.status)} text-white`}>
                          {pkg.status.toUpperCase()}
                        </Badge>
                        <div className="text-sm text-gray-400">
                          {pkg.purchasedAt ? new Date(pkg.purchasedAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Credits Remaining:</span>
                          <span className="font-bold text-yellow-400">{pkg.remainingPolls}/{pkg.totalPolls}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount Paid:</span>
                          <span>{pkg.paymentAmount} {pkg.paymentToken}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Transaction:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">
                              {pkg.paymentTxHash.slice(0, 6)}...{pkg.paymentTxHash.slice(-4)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`https://polygonscan.com/tx/${pkg.paymentTxHash}`, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No packages purchased yet</p>
                  <p className="text-sm">Purchase a package to create real meme coins!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Information Section */}
        <Card className="mt-8 bg-gray-900 border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-yellow-400">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-300">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl mb-2">💰</div>
                <div className="font-medium mb-1">Pay $1 USDT</div>
                <div>Send USDT on Polygon network to our wallet address</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-medium mb-1">Get 3 Credits</div>
                <div>Each package gives you 3 poll credits for real meme coins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🪙</div>
                <div className="font-medium mb-1">Create Real Coins</div>
                <div>Vote on MemeCoin-enabled polls to receive tradeable Solana tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}