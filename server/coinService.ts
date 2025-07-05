import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createInitializeMintInstruction, createAssociatedTokenAccountInstruction, createMintToInstruction, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { storage } from './storage';
import type { InsertGeneratedCoin } from '../shared/schema';

export class CoinService {
  private connection: Connection;
  private payerKeypair: Keypair;

  constructor() {
    // Use devnet for testing - change to mainnet for production
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // For demo purposes, create a random keypair
    // In production, load from secure environment variable
    this.payerKeypair = Keypair.generate();
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
    try {
      // Check if user already has a coin for this poll/option
      const existingCoin = await storage.getUserCoinForPoll(params.userId, params.pollId, params.option);
      if (existingCoin) {
        return {
          coinAddress: existingCoin.coinAddress,
          transactionHash: existingCoin.transactionHash || 'existing',
          coinName: existingCoin.coinName,
          coinSymbol: existingCoin.coinSymbol
        };
      }

      // Check if user has active package for real coin mode
      const activePackage = await storage.getUserActivePackage(params.userId);
      const shouldCreateRealCoin = activePackage && activePackage.remainingPolls > 0;
      
      console.log(`User ${params.userId} has active package: ${!!activePackage}, should create real coin: ${shouldCreateRealCoin}`);

      // Generate unique coin name and symbol
      const coinName = await this.generateCoinName(params.optionText, params.pollId);
      const coinSymbol = this.generateSymbol(coinName);
      
      let coinAddress: string;
      let transactionHash: string;
      let status: string;
      
      if (shouldCreateRealCoin) {
        // Create real Solana token (devnet for now)
        const result = await this.createRealSolanaToken(coinName, coinSymbol, params.userWallet);
        coinAddress = result.coinAddress;
        transactionHash = result.transactionHash;
        status = 'created';
        
        // Consume package usage
        await storage.consumePackageUsage(activePackage.id);
        console.log(`Consumed package usage for user ${params.userId}, remaining: ${activePackage.remainingPolls - 1}`);
      } else {
        // Create demo token
        const mintKeypair = Keypair.generate();
        coinAddress = mintKeypair.publicKey.toBase58();
        transactionHash = `demo_tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        status = 'demo';
        
        console.log('Created demo coin - user has no active package');
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

  private async createRealSolanaToken(coinName: string, coinSymbol: string, userWallet: string): Promise<{
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
      
      // Sign and send transaction
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.payerKeypair, mintKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`Real Solana token created: ${coinName} (${coinSymbol}) - TX: ${signature}`);
      
      return {
        coinAddress: mintKeypair.publicKey.toBase58(),
        transactionHash: signature
      };
      
    } catch (error) {
      console.error('Failed to create real Solana token:', error);
      // Fallback to demo mode if real transaction fails
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