import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PaymentInfo {
  polygonWallet: string;
  packagePrice: string;
  packagePolls: number;
  paymentToken: string;
  paymentChain: string;
  instructions: string[];
}

interface ManualPaymentProps {
  onPaymentComplete?: () => void;
}

export default function ManualPayment({ onPaymentComplete }: ManualPaymentProps) {
  const { toast } = useToast();
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("1.00");

  // Fetch payment information
  const { data: paymentInfo, isLoading: paymentLoading } = useQuery<PaymentInfo>({
    queryKey: ["/api/packages/payment-info"],
  });

  // Purchase package mutation
  const purchasePackage = useMutation({
    mutationFn: async (data: { paymentTxHash: string; paymentAmount: string }) =>
      apiRequest("/api/packages/purchase", "POST", data),
    onSuccess: () => {
      toast({
        title: "Package Activated!",
        description: "Your package has been activated successfully. You now have 3 poll credits.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/packages"] });
      setTxHash("");
      onPaymentComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate package. Please check your transaction hash.",
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

  return (
    <Card className="bg-gray-900 border-yellow-400/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-400">
          <CreditCard className="h-5 w-5" />
          Manual Payment
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
  );
}