import { ethers } from 'ethers';
import { addUserCredits } from './voteCreditStore';

const polygonProvider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const usdtAddress = process.env.USDT_POLYGON_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

// Get backend wallet address from private key
function getWalletAddressFromPrivateKey(privateKey: string): string {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address.toLowerCase();
  } catch (error) {
    console.error('Failed to derive wallet address from private key:', error);
    return '0x742d35Cc6636C0532925a3b6F45bb678E9E9cD81'.toLowerCase(); // fallback
  }
}

const backendWallet = process.env.PLATFORM_POLYGON_WALLET 
  ? getWalletAddressFromPrivateKey(process.env.PLATFORM_POLYGON_WALLET)
  : '0x742d35Cc6636C0532925a3b6F45bb678E9E9cD81'.toLowerCase();

const usdtAbi = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

let isMonitoring = false;

export function startUsdtMonitor() {
  if (isMonitoring) return;
  
  // Skip event listeners due to RPC limitations, use manual verification instead
  isMonitoring = true;
  console.log(`👀 USDT Monitor initialized for wallet: ${backendWallet}`);
  console.log(`📋 Use POST /api/verify-payment to process USDT payments manually`);
  console.log(`💡 Use POST /api/admin/add-credits for testing credit allocation`);
}

export function stopUsdtMonitor() {
  if (!isMonitoring) return;
  
  // Remove all listeners when stopping
  const contract = new ethers.Contract(usdtAddress, usdtAbi, polygonProvider);
  contract.removeAllListeners("Transfer");
  isMonitoring = false;
  console.log(`🛑 Stopped watching USDT transfers`);
}

// Alternative: Manual transaction verification endpoint
export async function verifyUsdtPayment(txHash: string, senderWallet: string): Promise<{ success: boolean; credits?: number; message: string }> {
  try {
    const receipt = await polygonProvider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { success: false, message: "Transaction not found" };
    }

    // Parse transfer events from the transaction logs
    const contract = new ethers.Contract(usdtAddress, usdtAbi, polygonProvider);
    const transferEvents = receipt.logs
      .filter(log => log.address.toLowerCase() === usdtAddress.toLowerCase())
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(event => event !== null);

    // Find transfer to our wallet
    const relevantTransfer = transferEvents.find(event => 
      event?.args?.to?.toLowerCase() === backendWallet &&
      event?.args?.from?.toLowerCase() === senderWallet.toLowerCase()
    );

    if (relevantTransfer) {
      const usd = Number(ethers.formatUnits(relevantTransfer.args.value, 6));
      const credits = Math.floor(usd * 3);
      
      if (credits > 0) {
        await addUserCredits(senderWallet, credits);
        return { 
          success: true, 
          credits, 
          message: `Payment verified: $${usd} USDT → ${credits} credits added` 
        };
      }
    }

    return { success: false, message: "No valid USDT transfer found in transaction" };
  } catch (error: any) {
    return { success: false, message: `Verification failed: ${error?.message || 'Unknown error'}` };
  }
}