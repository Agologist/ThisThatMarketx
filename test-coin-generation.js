import { coinService } from './server/coinService.js';
import { storage } from './server/storage.js';

async function testCoinGeneration() {
  console.log('🧪 Testing coin generation...');
  
  try {
    // Test 1: Check if user has active package
    console.log('\n📦 TEST 1: Checking active package...');
    const activePackage = await storage.getUserActivePackage(1);
    console.log('Active package result:', activePackage);
    
    // Test 2: Check platform wallet balance
    console.log('\n💰 TEST 2: Checking platform wallet balance...');
    const balance = await coinService.checkPlatformWalletBalance();
    console.log('Platform wallet balance:', balance);
    
    // Test 3: Attempt to create a coin
    console.log('\n🪙 TEST 3: Creating test coin...');
    const coinResult = await coinService.createMemeCoin({
      userId: 1,
      pollId: 57,
      option: 'B',
      optionText: 'gvcgfcg',
      userWallet: 'CoVNnCukzQY1Ta1jpyrtBmFkqURDMc71Bqt24RG24AwN'
    });
    
    console.log('Coin creation result:', coinResult);
    
    // Test 4: Check if coin was stored in database
    console.log('\n🔍 TEST 4: Checking generated coins in database...');
    const userCoins = await storage.getUserGeneratedCoins(1);
    console.log('User coins:', userCoins);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCoinGeneration();