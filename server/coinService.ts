import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createInitializeMintInstruction, createAssociatedTokenAccountInstruction, createMintToInstruction, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
// Enhanced metadata support will be added in future iterations
// import { createCreateMetadataAccountV3Instruction, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { storage } from './storage';
import { conversionService } from './conversionService';
import { crossChainBridge } from './crossChainBridge';
import type { InsertGeneratedCoin } from '../shared/schema';

export class CoinService {
  private connection: Connection;
  private payerKeypair: Keypair;
  private polygonWalletKey?: string;

  constructor() {
    // Use mainnet for production - real SPL tokens
    this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Load platform wallet - gas fees paid from USDT in PLATFORM_POLYGON_WALLET
    // We'll convert USDT → SOL as needed for Solana transactions
    const platformWalletSecret = process.env.PLATFORM_POLYGON_WALLET;
    if (platformWalletSecret) {
      try {
        // Store the Polygon wallet private key for USDT operations
        // For now, generate a Solana keypair for gas fees (will be funded via USDT→SOL conversion)
        this.polygonWalletKey = platformWalletSecret.trim();
        this.payerKeypair = Keypair.generate(); // Generate dedicated Solana wallet for gas
        console.log(`Platform Polygon wallet configured for USDT revenue`);
        console.log(`Solana gas wallet: ${this.payerKeypair.publicKey.toString()}`);
        console.log(`Gas fees will be paid from USDT revenue via automatic USDT→SOL conversion`);
      } catch (error) {
        console.error('Failed to configure platform wallet, using demo mode:', error);
        this.payerKeypair = Keypair.generate();
        console.log(`Demo wallet: ${this.payerKeypair.publicKey.toString()} (0 SOL)`);
      }
    } else {
      // Fallback for development
      this.payerKeypair = Keypair.generate();
      console.log(`No platform wallet configured, using demo: ${this.payerKeypair.publicKey.toString()}`);
      console.log(`To enable real meme coins, set PLATFORM_POLYGON_WALLET environment variable`);
    }
  }

  async checkPlatformWalletBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.payerKeypair.publicKey);
      const solBalance = balance / 1_000_000_000; // Convert lamports to SOL
      console.log(`💰 Platform wallet SOL balance: ${solBalance.toFixed(4)} SOL`);
      return solBalance;
    } catch (error) {
      console.error('Failed to check platform wallet balance:', error);
      return 0;
    }
  }

  async ensureSufficientSOLBalance(): Promise<boolean> {
    try {
      const currentBalance = await this.checkPlatformWalletBalance();
      const requiredBalance = conversionService.calculateRequiredSol(true);
      
      if (currentBalance >= requiredBalance) {
        console.log(`Sufficient SOL balance: ${currentBalance.toFixed(4)} SOL >= ${requiredBalance.toFixed(4)} SOL`);
        return true;
      }
      
      console.log(`Insufficient SOL (${currentBalance.toFixed(4)}), attempting cross-chain conversion...`);
      
      // Calculate exact USDT needed for this single token creation
      const solNeededForOneToken = 0.003; // Exact SOL needed for one token creation  
      const usdtNeeded = solNeededForOneToken * 200; // ~$0.60 worth, but we only convert $0.003 worth
      const actualUsdtToConvert = 0.003; // Convert only $0.003 USDT per token (not $0.60)
      
      console.log(`Converting ${actualUsdtToConvert.toFixed(3)} USDT (Polygon) → ${solNeededForOneToken.toFixed(3)} SOL (Solana)`);
      
      // Execute cross-chain USDT→SOL conversion
      try {
        const bridgeResult = await crossChainBridge.bridgeUsdtToSol(
          actualUsdtToConvert,
          this.payerKeypair.publicKey
        );
        
        if (bridgeResult.success) {
          console.log(`Bridge successful: ${bridgeResult.solReceived.toFixed(4)} SOL via ${bridgeResult.bridgeUsed}`);
          console.log(`Transaction: ${bridgeResult.transactionHash}`);
          
          // Verify we now have sufficient balance
          const newBalance = await this.checkPlatformWalletBalance();
          if (newBalance >= requiredBalance) {
            console.log(`Balance after bridge: ${newBalance.toFixed(4)} SOL - sufficient for token creation`);
            return true;
          } else {
            console.error(`Insufficient balance after bridge: ${newBalance.toFixed(4)} SOL`);
            return false;
          }
        } else {
          console.error('Cross-chain bridge failed, falling back to demo mode');
          return false;
        }
        
      } catch (bridgeError) {
        console.error('Cross-chain conversion failed:', bridgeError.message);
        console.log('Falling back to demo mode for this transaction');
        return false;
      }
      
    } catch (error) {
      console.error('Failed to ensure sufficient SOL balance:', error);
      return false;
    }
  }

  async generateCoinName(baseName: string, pollId: number): Promise<string> {
    const attempts = [
      baseName,
      `${baseName}TTM`,
      `${baseName}2025`,
      `${baseName}_${pollId}`,
      `${baseName}_${Date.now().toString().slice(-6)}`
    ];
    
    for (const name of attempts) {
      const existingCoin = await this.checkCoinNameExists(name);
      if (!existingCoin) {
        return name;
      }
    }
    
    // Fallback with random suffix
    return `${baseName}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private async checkCoinNameExists(name: string): Promise<boolean> {
    try {
      const coins = await storage.getGeneratedCoinsByName(name);
      return coins.length > 0;
    } catch {
      return false;
    }
  }

  generateSymbol(name: string): string {
    const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    return cleaned.slice(0, Math.min(6, Math.max(3, cleaned.length)));
  }

  async createMemeCoin(params: {
    userId: number;
    pollId: number;
    option: 'A' | 'B';
    optionText: string;
    userWallet: string;
  }): Promise<{
    coinAddress: string;
    transactionHash: string;
    coinName: string;
    coinSymbol: string;
  }> {
    console.log(`🚀 CoinService.createMemeCoin called with:`, params);
    try {
      // Check if user already has a coin for this poll/option
      const existingCoin = await storage.getUserCoinForPoll(params.userId, params.pollId, params.option);
      if (existingCoin) {
        console.log(`🔄 Existing coin found for user ${params.userId}, poll ${params.pollId}, option ${params.option}`);
        return {
          coinAddress: existingCoin.coinAddress,
          transactionHash: existingCoin.transactionHash || 'existing',
          coinName: existingCoin.coinName,
          coinSymbol: existingCoin.coinSymbol
        };
      }

      // Check if user has active package for real coin mode
      const activePackage = await storage.getUserActivePackage(params.userId);
      let shouldCreateRealCoin = activePackage && activePackage.remainingPolls > 0;
      
      console.log(`🔍 PACKAGE CHECK for user ${params.userId}:`);
      console.log(`  - Package exists: ${!!activePackage}`);
      console.log(`  - Package details:`, activePackage);
      console.log(`  - Should create real coin: ${shouldCreateRealCoin}`);
      
      if (shouldCreateRealCoin) {
        console.log(`🔋 About to check SOL balance and perform USDT→SOL conversion if needed...`);
      }

      // Generate unique coin name and symbol
      const coinName = await this.generateCoinName(params.optionText, params.pollId);
      const coinSymbol = this.generateSymbol(coinName);
      
      let coinAddress: string;
      let transactionHash: string;
      let status: string;
      
      if (shouldCreateRealCoin) {
        // STEP 1: Convert USDT to SOL for gas fees (0.003 USDT ≈ 0.0000044 SOL)
        console.log('💱 STEP 1: Converting 0.003 USDT to SOL for gas fees...');
        
        try {
          const conversionResult = await crossChainBridge.convertUsdtToSol(0.003);
          
          if (!conversionResult.success) {
            throw new Error(`USDT→SOL conversion failed: ${conversionResult.error}`);
          }
          
          console.log(`✅ USDT→SOL conversion successful: ${conversionResult.solReceived} SOL`);
          console.log(`💰 Conversion details:`, conversionResult);
          
          // Check updated SOL balance after conversion
          const updatedSolBalance = await this.checkPlatformWalletBalance();
          console.log(`💰 Updated SOL balance after conversion: ${updatedSolBalance}`);
          
          if (updatedSolBalance < 0.002) {
            throw new Error(`Insufficient SOL after conversion: ${updatedSolBalance} SOL`);
          }
          
          console.log(`✅ SOL balance sufficient after conversion, proceeding with real token creation`);
          
        } catch (conversionError) {
          console.error(`❌ USDT→SOL conversion failed:`, conversionError.message);
          console.log(`📋 Falling back to demo mode due to conversion failure`);
          shouldCreateRealCoin = false;
        }
      }

      if (shouldCreateRealCoin) {
        try {
          // Create real Solana token with metadata
          const result = await this.createRealSolanaToken(
            coinName, 
            coinSymbol, 
            params.userWallet,
            params.pollId,
            params.optionText
          );
          coinAddress = result.coinAddress;
          transactionHash = result.transactionHash;
          status = 'created';
          
          // Consume package usage
          if (activePackage) {
            await storage.consumePackageUsage(activePackage.id);
            console.log(`Consumed package usage for user ${params.userId}, remaining: ${activePackage.remainingPolls - 1}`);
          }
        } catch (error) {
          console.error('Real token creation failed, falling back to demo mode:', error.message);
          shouldCreateRealCoin = false;
        }
      }

      if (!shouldCreateRealCoin) {
        // Create demo token
        const mintKeypair = Keypair.generate();
        coinAddress = mintKeypair.publicKey.toBase58();
        transactionHash = `demo_tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        status = 'demo';
        
        console.log('Created demo coin - user has no active package or insufficient SOL');
      }
      
      // Store in database
      const coinData: InsertGeneratedCoin = {
        userId: params.userId,
        pollId: params.pollId,
        option: params.option,
        coinName,
        coinSymbol,
        coinAddress,
        userWallet: params.userWallet,
        transactionHash,
        status
      };
      
      await storage.createGeneratedCoin(coinData);
      
      return {
        coinAddress,
        transactionHash,
        coinName,
        coinSymbol
      };
      
    } catch (error) {
      console.error('Failed to create meme coin:', error);
      throw new Error('Coin creation failed');
    }
  }

  private async createRealSolanaToken(
    coinName: string, 
    coinSymbol: string, 
    userWallet: string,
    pollId?: number,
    optionText?: string
  ): Promise<{
    coinAddress: string;
    transactionHash: string;
  }> {
    try {
      // Create mint keypair
      const mintKeypair = Keypair.generate();
      const userPublicKey = new PublicKey(userWallet);
      
      // Get minimum balance for rent exemption
      const mintRent = await getMinimumBalanceForRentExemptMint(this.connection);
      
      // Create transaction
      const transaction = new Transaction();
      
      // Create mint account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: this.payerKeypair.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        })
      );
      
      // Initialize mint
      transaction.add(
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          6, // decimals
          this.payerKeypair.publicKey, // mint authority
          this.payerKeypair.publicKey  // freeze authority
        )
      );
      
      // Get associated token account address
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        userPublicKey
      );
      
      // Create associated token account
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.payerKeypair.publicKey,
          associatedTokenAccount,
          userPublicKey,
          mintKeypair.publicKey
        )
      );
      
      // Mint tokens to user
      const mintAmount = 1000000 * Math.pow(10, 6); // 1 million tokens with 6 decimals
      transaction.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAccount,
          this.payerKeypair.publicKey,
          mintAmount
        )
      );
      
      // TODO: Add enhanced metadata for paying users in future iteration
      // Will include rich metadata with poll references, images, etc.
      if (pollId && optionText) {
        console.log(`Enhanced SPL token for poll ${pollId}: ${coinName} (${coinSymbol})`);
        console.log(`Metadata support will be added in next iteration`);
      }
      
      // Sign and send transaction
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.payerKeypair, mintKeypair],
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      console.log(`Real Solana token created: ${coinName} (${coinSymbol}) - TX: ${signature}`);
      
      return {
        coinAddress: mintKeypair.publicKey.toBase58(),
        transactionHash: signature
      };
      
    } catch (error) {
      console.error('Failed to create real Solana token:', error);
      throw error;
    }
  }

  async getUserCoins(userId: number): Promise<any[]> {
    return await storage.getUserGeneratedCoins(userId);
  }

  async getPollCoins(pollId: number): Promise<any[]> {
    return await storage.getPollGeneratedCoins(pollId);
  }
}

export const coinService = new CoinService();