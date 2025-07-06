// Manual test of coin creation system
import { coinService } from './server/coinService.js';
import { storage } from './server/storage.js';

async function testCoinCreation() {
  console.log('🧪 Testing coin creation system...');
  
  try {
    const result = await coinService.createMemeCoin({
      userId: 1,
      pollId: 54,
      option: 'B',
      optionText: 'rome that',
      userWallet: 'CoVNnCukzQY1Ta1jpyrtBmFkqURDMc71Bqt24RG24AwN'
    });
    
    console.log('✅ Coin creation successful:', result);
    
    // Check database
    const coin = await storage.getUserCoinForPoll(1, 54, 'B');
    console.log('✅ Coin stored in database:', coin);
    
  } catch (error) {
    console.error('❌ Coin creation failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCoinCreation().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});