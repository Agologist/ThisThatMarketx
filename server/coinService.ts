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

      // Generate unique coin name and symbol
      const coinName = await this.generateCoinName(params.optionText, params.pollId);
      const coinSymbol = this.generateSymbol(coinName);
      
      // Create mint keypair (this represents the new token)
      const mintKeypair = Keypair.generate();
      
      // For demo mode, generate a valid wallet address
      let userPublicKey: PublicKey;
      if (params.userWallet.startsWith('demo_wallet_')) {
        // Generate a deterministic keypair for demo wallets
        userPublicKey = Keypair.generate().publicKey;
      } else {
        userPublicKey = new PublicKey(params.userWallet);
      }
      
      // For demo purposes, we'll create a mock transaction
      // In production, this would create an actual Solana token
      const mockSignature = `demo_tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      // Store in database
      const coinData: InsertGeneratedCoin = {
        userId: params.userId,
        pollId: params.pollId,
        option: params.option,
        coinName,
        coinSymbol,
        coinAddress: mintKeypair.publicKey.toBase58(),
        userWallet: params.userWallet,
        transactionHash: mockSignature,
        status: 'created'
      };
      
      await storage.createGeneratedCoin(coinData);
      
      return {
        coinAddress: mintKeypair.publicKey.toBase58(),
        transactionHash: mockSignature,
        coinName,
        coinSymbol
      };
      
    } catch (error) {
      console.error('Failed to create meme coin:', error);
      throw new Error('Coin creation failed');
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