// Test script for Base network coin generation
import { baseCoinService } from './server/baseCoinService.js';

async function testBaseCoinService() {
  console.log('🧪 Testing Base Coin Service...\n');
  
  try {
    // Test 1: Check wallet balance
    console.log('1️⃣ Checking Base wallet balance...');
    const balance = await baseCoinService.checkWalletBalance();
    console.log(`   ETH: ${balance.eth.toFixed(6)}`);
    console.log(`   USDT: ${balance.usdt.toFixed(2)}\n`);
    
    // Test 2: Check ETH balance sufficiency  
    console.log('2️⃣ Checking ETH balance sufficiency...');
    const hasBalance = await baseCoinService.ensureSufficientETHBalance();
    console.log(`   Sufficient ETH: ${hasBalance ? '✅ Yes' : '❌ No'}\n`);
    
    // Test 3: Generate coin name
    console.log('3️⃣ Testing coin name generation...');
    const coinName = await baseCoinService.generateCoinName('TestCoin', 999);
    console.log(`   Generated name: ${coinName}`);
    
    // Test 4: Generate symbol
    const symbol = baseCoinService.generateSymbol(coinName);
    console.log(`   Generated symbol: ${symbol}\n`);
    
    // Test 5: Simulate coin creation (without actual blockchain transaction)
    console.log('4️⃣ Testing coin creation parameters...');
    const params = {
      coinName: 'TestCoin',
      userId: 1,
      pollId: 999,
      optionVoted: 'A',
      userWallet: '0x742d35Cc6631C0532925a3b8D23f1E1e14a2d1db' // Test wallet
    };
    console.log(`   Params ready:`, params);
    
    console.log('\n✅ Base Coin Service tests completed!');
    console.log('🔗 Ready for real token creation when user votes with packages');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testBaseCoinService();