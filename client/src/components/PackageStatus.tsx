import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Package, Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Package {
  id: number;
  status: string;
  remainingPolls: number;
  totalPolls: number;
}

export default function PackageStatus() {
  const { user } = useAuth();

  const { data: activePackage } = useQuery<Package>({
    queryKey: ["/api/user/packages/active"],
    enabled: !!user,
    retry: false,
  });

  if (!user || !activePackage) {
    return (
      <Badge variant="outline" className="bg-gray-800 border-gray-600 text-gray-400">
        <Package className="h-3 w-3 mr-1" />
        No Credits
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className="bg-green-900/50 border-green-500/50 text-green-400"
    >
      <Coins className="h-3 w-3 mr-1" />
      {activePackage.remainingPolls} Credits
    </Badge>
  );
}