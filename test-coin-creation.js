// Test cross-chain bridge system
import { crossChainBridge } from './server/crossChainBridge.js';
import { PublicKey } from '@solana/web3.js';

async function testCrossChainBridge() {
  console.log('🧪 Testing cross-chain USDT→SOL bridge...');
  
  try {
    const testAmount = 0.1; // Test with $0.10 USDT
    const destinationWallet = new PublicKey('CoVNnCukzQY1Ta1jpyrtBmFkqURDMc71Bqt24RG24AwN');
    
    const result = await crossChainBridge.bridgeUsdtToSol(testAmount, destinationWallet);
    
    console.log('✅ Cross-chain bridge result:', result);
    
    if (result.success) {
      console.log(`✅ Successfully converted ${testAmount} USDT → ${result.solReceived.toFixed(4)} SOL`);
      console.log(`✅ Bridge used: ${result.bridgeUsed}`);
      console.log(`✅ Transaction: ${result.transactionHash}`);
    } else {
      console.log('❌ Bridge failed, but system handled gracefully');
    }
    
  } catch (error) {
    console.error('❌ Bridge test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCrossChainBridge().then(() => {
  console.log('Bridge test completed');
  process.exit(0);
}).catch(err => {
  console.error('Bridge test failed:', err);
  process.exit(1);
});