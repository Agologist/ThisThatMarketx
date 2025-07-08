import { ethers } from 'ethers';
import axios from 'axios';

const polygonProvider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.POLYGON_PRIVATE_KEY!, polygonProvider);

export async function swapUsdtToEth(amountInUsd: number) {
  const amountInWei = ethers.utils.parseUnits(amountInUsd.toString(), 6);

  const quoteRes = await axios.get('https://api.1inch.dev/swap/v5.2/137/swap', {
    params: {
      fromTokenAddress: process.env.USDT_POLYGON_ADDRESS!,
      toTokenAddress: process.env.WETH_POLYGON_ADDRESS!,
      amount: amountInWei.toString(),
      fromAddress: wallet.address,
      slippage: 1
    },
    headers: {
      Authorization: `Bearer ${process.env.ONE_INCH_API_KEY}`
    }
  });

  const { tx } = quoteRes.data;
  const txHash = await wallet.sendTransaction({
    to: tx.to,
    data: tx.data,
    value: ethers.BigNumber.from(tx.value),
    gasLimit: 800000
  });

  return txHash.hash;
}