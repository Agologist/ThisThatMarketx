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
import WalletConnect from "@/components/WalletConnect";
import ManualPayment from "@/components/ManualPayment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // Fetch user packages
  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/user/packages"],
    enabled: !!user,
  });

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
          {/* Purchase Package Options */}
          <Tabs defaultValue="wallet" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="wallet" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
                Wallet Connect
              </TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
                Manual Payment
              </TabsTrigger>
            </TabsList>
            <TabsContent value="wallet" className="mt-6">
              <WalletConnect onPaymentComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/user/packages"] });
              }} />
            </TabsContent>
            <TabsContent value="manual" className="mt-6">
              <ManualPayment onPaymentComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/user/packages"] });
              }} />
            </TabsContent>
          </Tabs>

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