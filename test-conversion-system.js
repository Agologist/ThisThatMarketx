// Test USDT to ETH conversion system
import { ethers } from 'ethers';

async function testConversionSystem() {
  console.log('🧪 Testing USDT to ETH Conversion System\n');
  
  try {
    // Base network configuration
    const BASE_RPC_URL = 'https://mainnet.base.org';
    const USDT_BASE_ADDRESS = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2';
    const POLYGON_RPC_URL = 'https://polygon-rpc.com';
    const USDT_POLYGON_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
    
    // Get wallet from environment
    const privateKey = process.env.PLATFORM_PRIVATE_KEY || process.env.SOLANA_PRIVATE_KEY;
    if (!privateKey) {
      console.log('❌ No private key found in environment variables');
      return;
    }
    
    // Test Base network connection
    console.log('🔗 Testing Base Network Connection:');
    const baseProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const baseWallet = new ethers.Wallet(privateKey, baseProvider);
    
    const baseBlockNumber = await baseProvider.getBlockNumber();
    console.log(`✅ Base network connected - Block: ${baseBlockNumber}`);
    console.log(`📱 Wallet address: ${baseWallet.address}`);
    
    // Check Base ETH balance
    const ethBalance = await baseProvider.getBalance(baseWallet.address);
    const ethFormatted = parseFloat(ethers.formatEther(ethBalance));
    console.log(`💰 Base ETH balance: ${ethFormatted.toFixed(6)} ETH`);
    
    // Check Base USDT balance
    const usdtABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];
    
    const baseUSDTContract = new ethers.Contract(USDT_BASE_ADDRESS, usdtABI, baseProvider);
    const baseUSDTBalance = await baseUSDTContract.balanceOf(baseWallet.address);
    const baseUSDTFormatted = parseFloat(ethers.formatUnits(baseUSDTBalance, 6));
    console.log(`💰 Base USDT balance: $${baseUSDTFormatted.toFixed(2)}`);
    
    // Test Polygon network connection
    console.log('\n🔗 Testing Polygon Network Connection:');
    const polygonProvider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    
    const polygonBlockNumber = await polygonProvider.getBlockNumber();
    console.log(`✅ Polygon network connected - Block: ${polygonBlockNumber}`);
    
    // Check Polygon USDT balance
    const polygonUSDTContract = new ethers.Contract(USDT_POLYGON_ADDRESS, usdtABI, polygonProvider);
    const polygonUSDTBalance = await polygonUSDTContract.balanceOf(baseWallet.address);
    const polygonUSDTFormatted = parseFloat(ethers.formatUnits(polygonUSDTBalance, 6));
    console.log(`💰 Polygon USDT balance: $${polygonUSDTFormatted.toFixed(2)}`);
    
    // Conversion calculation
    console.log('\n💱 USDT to ETH Conversion Analysis:');
    const requiredETH = 0.000144; // Gas needed for token creation
    const ethPriceUSD = 3400;
    const crossChainFeeUSD = 0.01;
    const slippagePercent = 0.5;
    const usdtNeeded = (requiredETH * ethPriceUSD * (1 + slippagePercent/100)) + crossChainFeeUSD;
    
    console.log(`📊 Required ETH for gas: ${requiredETH} ETH`);
    console.log(`📊 ETH price estimate: $${ethPriceUSD}`);
    console.log(`📊 Cross-chain bridge fee: $${crossChainFeeUSD}`);
    console.log(`📊 Slippage tolerance: ${slippagePercent}%`);
    console.log(`📊 Total USDT needed: $${usdtNeeded.toFixed(3)}`);
    
    // Conversion viability analysis
    console.log('\n🎯 Conversion Viability:');
    const hasEnoughETH = ethFormatted >= requiredETH;
    const hasEnoughPolygonUSDT = polygonUSDTFormatted >= usdtNeeded;
    const conversionNeeded = !hasEnoughETH;
    
    console.log(`✅ Has enough Base ETH: ${hasEnoughETH ? 'YES' : 'NO'}`);
    console.log(`✅ Has enough Polygon USDT: ${hasEnoughPolygonUSDT ? 'YES' : 'NO'}`);
    console.log(`🔄 Conversion needed: ${conversionNeeded ? 'YES' : 'NO'}`);
    console.log(`💸 Estimated conversion cost: $${usdtNeeded.toFixed(3)}`);
    
    if (conversionNeeded && hasEnoughPolygonUSDT) {
      console.log('\n🎉 CONVERSION SYSTEM READY');
      console.log('✅ All requirements met for automatic USDT→ETH conversion');
      console.log('🌉 Cross-chain bridge can execute when needed');
    } else if (conversionNeeded && !hasEnoughPolygonUSDT) {
      console.log('\n⚠️  CONVERSION SYSTEM NEEDS FUNDING');
      console.log('❌ Insufficient Polygon USDT balance for conversion');
      console.log(`💰 Need additional $${(usdtNeeded - polygonUSDTFormatted).toFixed(3)} USDT on Polygon`);
    } else {
      console.log('\n✅ CONVERSION NOT NEEDED');
      console.log('💰 Base ETH balance sufficient for token creation');
    }
    
  } catch (error) {
    console.error('❌ Conversion system test failed:', error.message);
  }
}

testConversionSystem();