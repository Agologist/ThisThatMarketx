import { isBaseWalletLowOnGas } from './gasMonitor';
import { swapUsdtToEth } from './polygonToBaseConversionService';
import { bridgeEthToBase } from './bridgePolygonEthToBase';

export async function autoFundGasIfNeeded() {
  const lowOnGas = await isBaseWalletLowOnGas();
  if (!lowOnGas) {
    console.log('✅ Base wallet has enough ETH');
    return;
  }

  console.log('⚠️ Base gas is low. Funding...');

  try {
    await swapUsdtToEth(10); // $10 USDT → ETH on Polygon
    await bridgeEthToBase(0.005); // Bridge ETH to Base
    console.log('✅ Base gas wallet funded successfully');
  } catch (err) {
    console.error('❌ Failed to fund gas wallet:', err);
  }
}