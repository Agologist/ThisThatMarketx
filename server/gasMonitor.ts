import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
const gasWalletAddress = process.env.BASE_GAS_WALLET_ADDRESS!;

export async function isBaseWalletLowOnGas(thresholdEth = '0.003'): Promise<boolean> {
  const balance = await provider.getBalance(gasWalletAddress);
  const eth = ethers.utils.formatEther(balance);
  return parseFloat(eth) < parseFloat(thresholdEth);
}