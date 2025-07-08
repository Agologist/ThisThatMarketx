// Test coin generation issue
import { baseCoinService } from './server/baseCoinService.js';
import { storage } from './server/storage.js';

async function testCoinGeneration() {
  console.log('🧪 Testing coin generation directly...');
  
  try {
    // Test 1: Check if user has active package
    console.log('\n📦 TEST 1: Checking active package for user 1...');
    const activePackage = await storage.getUserActivePackage(1);
    console.log('Active package result:', activePackage);
    
    if (!activePackage || activePackage.remainingPolls <= 0) {
      console.log('❌ No active package found, coin generation will fail');
      return;
    }
    
    // Test 2: Check poll details
    console.log('\n📊 TEST 2: Checking poll 80 details...');
    const poll = await storage.getPoll(80);
    console.log('Poll details:', {
      id: poll?.id,
      memeCoinMode: poll?.memeCoinMode,
      optionAText: poll?.optionAText,
      optionBText: poll?.optionBText
    });
    
    if (!poll || !poll.memeCoinMode) {
      console.log('❌ Poll not found or MemeCoin mode disabled');
      return;
    }
    
    // Test 3: Directly test coin creation
    console.log('\n🪙 TEST 3: Creating coin directly...');
    const coinResult = await baseCoinService.createMemeCoin({
      coinName: poll.optionAText,
      userId: 1,
      pollId: 80,
      optionVoted: 'A',
      userWallet: '0x4f63c97e13b21f3De51B301De1f7F2bf8f4187F3' // Valid ETH wallet
    });
    
    console.log('✅ Coin creation result:', coinResult);
    
    // Test 4: Check if coin was stored
    console.log('\n🔍 TEST 4: Checking stored coins...');
    const userCoins = await storage.getUserGeneratedCoins(1);
    console.log('User coins:', userCoins);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCoinGeneration().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});