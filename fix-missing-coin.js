// Fix missing coin for Vote ID 60
import { coinService } from './server/coinService.ts';

async function fixMissingCoin() {
  try {
    console.log('🔧 Generating missing coin for Vote ID 60...');
    
    // Vote details: User 1, Poll 59, Option A, OptionAText: "Option A Test"
    const result = await coinService.createMemeCoin({
      userId: 1,
      pollId: 59,
      option: 'A',
      optionText: 'Option A Test',
      userWallet: 'demo_mode_no_wallet'
    });
    
    console.log('✅ Missing coin generated successfully:', result);
  } catch (error) {
    console.error('❌ Failed to generate missing coin:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
  }
}

fixMissingCoin();