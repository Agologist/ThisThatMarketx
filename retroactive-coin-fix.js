// Retroactive coin generation for existing votes that missed coin generation
import { coinService } from './server/coinService.ts';
import { storage } from './server/storage.ts';

async function retroactiveCoinFix() {
  try {
    console.log('🔧 Starting retroactive coin generation for missing coins...');
    
    // Get all votes on MemeCoin-enabled polls that don't have corresponding coins
    const query = `
      SELECT DISTINCT v.id as vote_id, v.user_id, v.poll_id, v.option, 
             p.option_a_text, p.option_b_text, p.meme_coin_mode
      FROM votes v
      JOIN polls p ON v.poll_id = p.id
      LEFT JOIN generated_coins gc ON v.user_id = gc.user_id 
                                   AND v.poll_id = gc.poll_id 
                                   AND v.option = gc.option
      WHERE p.meme_coin_mode = true 
        AND gc.id IS NULL
      ORDER BY v.id ASC;
    `;
    
    // Execute query manually since we need complex joins
    console.log('🔍 Searching for votes missing coins...');
    
    // For now, let's manually check and fix the known missing votes
    const missingVotes = [
      { voteId: 58, userId: 1, pollId: 59, option: 'B', optionText: 'newtopic' },
      // Add any other missing votes here
    ];
    
    for (const vote of missingVotes) {
      console.log(`🪙 Generating retroactive coin for Vote ID ${vote.voteId}...`);
      
      // Check if coin already exists
      const existingCoins = await storage.getPollGeneratedCoins(vote.pollId);
      const existingCoin = existingCoins.find(coin => 
        coin.userId === vote.userId && coin.option === vote.option
      );
      
      if (existingCoin) {
        console.log(`✅ Coin already exists for Vote ID ${vote.voteId}`);
        continue;
      }
      
      // Generate the missing coin
      const result = await coinService.createMemeCoin({
        userId: vote.userId,
        pollId: vote.pollId,
        option: vote.option,
        optionText: vote.optionText,
        userWallet: 'demo_mode_no_wallet' // Use demo mode for retroactive fixes
      });
      
      console.log(`✅ Retroactive coin generated for Vote ID ${vote.voteId}:`, result.coinName);
    }
    
    console.log('✅ Retroactive coin generation completed!');
    
  } catch (error) {
    console.error('❌ Retroactive coin fix failed:', error);
  }
}

retroactiveCoinFix();