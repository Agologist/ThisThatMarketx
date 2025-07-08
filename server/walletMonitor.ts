import { ethers } from 'ethers';
import { addUserCredits } from './voteCreditStore';
import { storage } from './storage';

const polygonProvider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const usdtAddress = process.env.USDT_POLYGON_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

// Polling configuration
const POLLING_ENABLED = process.env.POLLING_ENABLED === 'true';
const POLLING_INTERVAL_MS = parseInt(process.env.POLLING_INTERVAL_MS || '6000');
const POLLING_RETRIES = parseInt(process.env.POLLING_RETRIES || '3');

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

const backendWallet = process.env.POLYGON_BACKEND_WALLET?.toLowerCase() ||
  (process.env.PLATFORM_POLYGON_WALLET 
    ? getWalletAddressFromPrivateKey(process.env.PLATFORM_POLYGON_WALLET)
    : '0x742d35Cc6636C0532925a3b6F45bb678E9E9cD81'.toLowerCase());

const usdtAbi = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

let isMonitoring = false;

export function startUsdtMonitor() {
  if (isMonitoring) return;
  
  isMonitoring = true;
  console.log(`👀 USDT Monitor initialized for wallet: ${backendWallet}`);
  console.log(`🔧 Polling enabled: ${POLLING_ENABLED}`);
  console.log(`⏱️  Polling interval: ${POLLING_INTERVAL_MS}ms`);
  console.log(`🔄 Polling retries: ${POLLING_RETRIES}`);
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
    console.log(`🔍 Manually verifying USDT payment - txHash: ${txHash}, sender: ${senderWallet}`);
    
    // Anti-replay protection: Check if transaction already processed
    const existingTransaction = await storage.getProcessedTransaction(txHash);
    if (existingTransaction) {
      return { 
        success: false, 
        message: `Transaction ${txHash} already processed. Credits were previously allocated.` 
      };
    }
    
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
        // Record transaction to prevent replay attacks
        await storage.createProcessedTransaction({
          txHash,
          fromWallet: senderWallet.toLowerCase(),
          toWallet: backendWallet,
          usdtAmount: usd.toString(),
          creditsGranted: credits,
          blockNumber: receipt.blockNumber,
          chain: "polygon"
        });
        
        await addUserCredits(senderWallet, credits);
        console.log(`💰 Credited ${credits} credits to wallet ${senderWallet} for ${usd} USDT (tx: ${txHash}) - Anti-replay protection applied`);
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