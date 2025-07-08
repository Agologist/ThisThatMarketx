import { ethers } from 'ethers';
import tokenFactoryABI from './abis/TokenFactory.json';
import { storage } from './storage';

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org');
const wallet = new ethers.Wallet(process.env.BASE_PRIVATE_KEY || process.env.PLATFORM_POLYGON_WALLET!, provider);
const tokenFactory = new ethers.Contract(
  process.env.FACTORY_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  tokenFactoryABI,
  wallet
);

// Format: `${pollId}:${choice}`
export async function ensureMemeToken(pollId: string, choice: string): Promise<string> {
  const tokenKey = `${pollId}:${choice}`;
  let tokenAddress = await storage.getTokenAddress(tokenKey);
  if (tokenAddress) return tokenAddress;

  const name = `${choice} Voter Token`;
  const symbol = `${pollId.slice(0, 4)}${choice.slice(0, 3)}`.toUpperCase();
  const supply = ethers.parseUnits("1000000", 18); // 1 million

  const tx = await tokenFactory.createToken(name, symbol, supply, wallet.address);
  const receipt = await tx.wait();
  const newTokenAddress = receipt.logs?.[0]?.args?.tokenAddress;

  if (!newTokenAddress) throw new Error("Token creation failed");

  await storage.setTokenAddress(tokenKey, newTokenAddress);
  return newTokenAddress;
}

export async function sendMemeToken(tokenAddress: string, to: string) {
  const token = new ethers.Contract(tokenAddress, [
    "function transfer(address to, uint256 amount) public returns (bool)"
  ], wallet);

  const tx = await token.transfer(to, ethers.parseUnits("1", 18));
  await tx.wait();
}