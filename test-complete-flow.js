// Test complete voting flow with coin creation
import { coinService } from './server/coinService.js';
import { storage } from './server/storage.js';

async function testCompleteVotingFlow() {
  console.log('🧪 Testing complete voting flow with coin creation...');
  
  try {
    // Test the exact scenario: user 1 voting on poll 54 with MemeCoin mode
    const result = await coinService.createMemeCoin({
      userId: 1,
      pollId: 54,
      option: 'B',
      optionText: 'rome that',
      userWallet: 'CoVNnCukzQY1Ta1jpyrtBmFkqURDMc71Bqt24RG24AwN'
    });
    
    console.log('✅ Complete flow result:', result);
    
    // Verify coin was stored
    const storedCoin = await storage.getUserCoinForPoll(1, 54, 'B');
    console.log('✅ Coin stored in database:', storedCoin);
    
    // Check package consumption
    const activePackage = await storage.getUserActivePackage(1);
    console.log('✅ Package status after creation:', activePackage);
    
  } catch (error) {
    console.error('❌ Complete flow failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCompleteVotingFlow().then(() => {
  console.log('Complete flow test finished');
  process.exit(0);
}).catch(err => {
  console.error('Complete flow test failed:', err);
  process.exit(1);
});