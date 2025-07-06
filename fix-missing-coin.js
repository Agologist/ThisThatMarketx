// Fix missing coin for Vote ID 60
import { coinService } from './server/coinService.ts';

async function fixMissingCoin() {
  try {
    console.log('🔧 Generating missing coin for Vote ID 60...');
    
    // Vote details: User 1, Poll 60, Option A, OptionAText: "bzzfdbdfb" 
    const result = await coinService.createMemeCoin({
      userId: 1,
      pollId: 60,
      option: 'A',
      optionText: 'bzzfdbdfb',
      userWallet: 'demo_mode_no_wallet'
    });
    
    console.log('✅ Missing coin generated successfully:', result);
  } catch (error) {
    console.error('❌ Failed to generate missing coin:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
  }
}

fixMissingCoin();