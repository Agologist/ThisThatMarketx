import axios from 'axios';
import { Connection, PublicKey, VersionedTransaction, Keypair } from '@solana/web3.js';

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null | any;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
}

export class ConversionService {
  private connection: Connection;
  private jupiterApiUrl = 'https://quote-api.jup.ag/v6';
  private usdtMint = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'; // USDT SPL token
  private solMint = 'So11111111111111111111111111111111111111112'; // Wrapped SOL

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Get real-time USDT to SOL quote
   * @param usdtAmount Amount in USDT (with 6 decimals)
   * @param slippageBps Slippage tolerance in basis points (1000 = 10%)
   */
  async getUsdtToSolQuote(usdtAmount: number, slippageBps: number = 1000): Promise<JupiterQuoteResponse> {
    try {
      // Convert USDT amount to base units (6 decimals)
      const inputAmount = Math.floor(usdtAmount * 1_000_000).toString();
      
      const response = await axios.get(`${this.jupiterApiUrl}/quote`, {
        params: {
          inputMint: this.usdtMint,
          outputMint: this.solMint,
          amount: inputAmount,
          slippageBps,
          onlyDirectRoutes: false,
          asLegacyTransaction: false
        }
      });

      if (!response.data) {
        throw new Error('No quote received from Jupiter API');
      }

      console.log(`💱 Jupiter quote: ${usdtAmount} USDT → ${(parseInt(response.data.outAmount) / 1_000_000_000).toFixed(4)} SOL`);
      return response.data;
    } catch (error) {
      console.error('Failed to get Jupiter quote:', error);
      throw new Error('Failed to get conversion quote');
    }
  }

  /**
   * Execute USDT to SOL swap using Jupiter API
   * @param quote Jupiter quote response
   * @param payerKeypair Keypair to sign the transaction
   */
  async executeUsdtToSolSwap(quote: JupiterQuoteResponse, payerKeypair: Keypair): Promise<string> {
    try {
      // Get swap transaction
      const swapResponse = await axios.post(`${this.jupiterApiUrl}/swap`, {
        quoteResponse: quote,
        userPublicKey: payerKeypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      });

      if (!swapResponse.data || !swapResponse.data.swapTransaction) {
        throw new Error('No swap transaction received from Jupiter API');
      }

      const swapData: JupiterSwapResponse = swapResponse.data;
      
      // Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      // Sign the transaction
      transaction.sign([payerKeypair]);
      
      // Send the transaction
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      console.log(`✅ USDT→SOL swap completed: ${signature}`);
      return signature;
    } catch (error) {
      console.error('Failed to execute USDT→SOL swap:', error);
      throw new Error(`Swap execution failed: ${error.message}`);
    }
  }

  /**
   * Convert USDT to SOL with retry logic
   * @param usdtAmount Amount in USDT to convert
   * @param payerKeypair Keypair with USDT balance
   * @param maxRetries Maximum number of retry attempts
   */
  async convertUsdtToSol(
    usdtAmount: number, 
    payerKeypair: Keypair, 
    maxRetries: number = 3
  ): Promise<{
    signature: string;
    solReceived: number;
    slippageUsed: number;
  }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Conversion attempt ${attempt}/${maxRetries}: ${usdtAmount} USDT → SOL`);
        
        // Get quote with 10% slippage tolerance
        const quote = await this.getUsdtToSolQuote(usdtAmount, 1000);
        
        // Calculate expected SOL amount
        const expectedSol = parseInt(quote.outAmount) / 1_000_000_000;
        const slippageUsed = parseFloat(quote.priceImpactPct);
        
        // Execute swap
        const signature = await this.executeUsdtToSolSwap(quote, payerKeypair);
        
        console.log(`✅ Conversion successful: ${usdtAmount} USDT → ${expectedSol.toFixed(4)} SOL`);
        
        return {
          signature,
          solReceived: expectedSol,
          slippageUsed
        };
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Conversion attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw new Error(`All conversion attempts failed. Last error: ${lastError?.message}`);
  }

  /**
   * Calculate minimum SOL needed for token creation
   * @param includeBuffer Whether to include a buffer for price fluctuations
   */
  calculateRequiredSol(includeBuffer: boolean = true): number {
    // Base costs for SPL token creation:
    // - Mint account rent: ~0.00144 SOL
    // - Associated token account rent: ~0.00204 SOL
    // - Transaction fees: ~0.00001 SOL per instruction
    // - Metadata account rent (if using): ~0.00144 SOL
    
    const baseCost = 0.005; // 0.005 SOL base cost
    const buffer = includeBuffer ? 0.003 : 0; // 0.003 SOL buffer
    
    return baseCost + buffer;
  }

  /**
   * Get current SOL balance for a wallet
   */
  async getSolBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1_000_000_000; // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to get SOL balance:', error);
      return 0;
    }
  }

  /**
   * Get current USDT balance for a wallet
   */
  async getUsdtBalance(publicKey: PublicKey): Promise<number> {
    try {
      // This would require checking the USDT token account
      // For now, we'll assume sufficient USDT balance based on our revenue model
      console.log('📊 USDT balance check not implemented - assuming sufficient balance');
      return 100; // Assume $100 USDT available
    } catch (error) {
      console.error('Failed to get USDT balance:', error);
      return 0;
    }
  }
}

export const conversionService = new ConversionService(new Connection('https://api.mainnet-beta.solana.com', 'confirmed'));