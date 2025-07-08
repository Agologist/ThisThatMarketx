import { evmCoinService } from './evmCoinService';
import { voteCreditStore } from './voteCreditStore';
import { verifyUsdtPayment } from './walletMonitor';
import { storage } from './storage';

export interface VoteParams {
  userId: number;
  pollId: number;
  option: string;
  optionText: string;
  userWallet: string;
}

export interface VoteResult {
  success: boolean;
  message: string;
  tokenAddress?: string;
  txHash?: string;
  creditsUsed?: number;
  remainingCredits?: number;
}

export class VoteHandler {
  /**
   * Process a vote with automatic credit checking and token generation
   */
  async processVote(params: VoteParams): Promise<VoteResult> {
    const { userId, pollId, option, optionText, userWallet } = params;
    
    try {
      console.log(`🗳️ Processing vote: User ${userId}, Poll ${pollId}, Option ${option}`);
      
      // 1. Check if user has sufficient credits
      const userCredits = await voteCreditStore.getUserCredits(userWallet);
      if (userCredits < 1) {
        return {
          success: false,
          message: `Insufficient credits. You have ${userCredits} credits, but need 1 to vote. Purchase credits with USDT payments.`
        };
      }
      
      // 2. Check if user already voted on this poll
      const existingVote = await storage.getUserVoteForPoll(userId, pollId);
      if (existingVote) {
        return {
          success: false,
          message: 'You have already voted on this poll'
        };
      }
      
      // 3. Deduct credit before processing
      await voteCreditStore.deductCredits(userWallet, 1);
      console.log(`💳 Deducted 1 credit from ${userWallet}`);
      
      // 4. Create the vote record
      const vote = await storage.createVote({
        userId,
        pollId,
        option
      });
      
      // 5. Generate EVM token on Base network
      const tokenResult = await evmCoinService.ensureMemeToken(
        pollId.toString(),
        option
      );
      
      if (!tokenResult) {
        // Refund credit if token creation fails
        await voteCreditStore.addCredits(userWallet, 1);
        return {
          success: false,
          message: 'Failed to generate meme token. Credit refunded.'
        };
      }
      
      // 6. Send token to user wallet
      const sendResult = await evmCoinService.sendMemeToken(
        tokenResult,
        userWallet
      );
      
      // 7. Get remaining credits
      const remainingCredits = await voteCreditStore.getUserCredits(userWallet);
      
      console.log(`✅ Vote processed successfully: Token ${tokenResult} sent to ${userWallet}`);
      
      return {
        success: true,
        message: `Vote recorded! Token sent to your wallet.`,
        tokenAddress: tokenResult,
        txHash: sendResult?.txHash,
        creditsUsed: 1,
        remainingCredits
      };
      
    } catch (error) {
      console.error(`❌ Vote processing failed:`, error);
      
      // Attempt to refund credit on any error
      try {
        await voteCreditStore.addCredits(userWallet, 1);
        console.log(`🔄 Refunded 1 credit to ${userWallet} due to error`);
      } catch (refundError) {
        console.error(`❌ Failed to refund credit:`, refundError);
      }
      
      return {
        success: false,
        message: `Vote processing failed: ${error.message}`
      };
    }
  }
  
  /**
   * Manual credit addition for USDT payments
   */
  async processUsdtPayment(txHash: string, senderWallet: string): Promise<VoteResult> {
    try {
      console.log(`💰 Processing USDT payment: ${txHash} from ${senderWallet}`);
      
      const result = await verifyUsdtPayment(txHash, senderWallet);
      
      if (result.success && result.credits) {
        return {
          success: true,
          message: result.message,
          creditsUsed: 0,
          remainingCredits: result.credits
        };
      } else {
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      console.error(`❌ USDT payment processing failed:`, error);
      return {
        success: false,
        message: `Payment verification failed: ${error.message}`
      };
    }
  }
  
  /**
   * Get user's current credit balance
   */
  async getUserCredits(userWallet: string): Promise<number> {
    return await voteCreditStore.getUserCredits(userWallet);
  }
  
  /**
   * Check if poll allows meme coin generation
   */
  async canGenerateTokens(pollId: number): Promise<boolean> {
    const poll = await storage.getPoll(pollId);
    return poll?.memeCoinMode === true;
  }
}

export const voteHandler = new VoteHandler();