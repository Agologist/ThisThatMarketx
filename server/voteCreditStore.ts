// Simulated in-memory credit store (replace with DB in prod)
const voteCredits: Record<string, number> = {};

export async function getUserCredits(wallet: string): Promise<number> {
  return voteCredits[wallet.toLowerCase()] || 0;
}

export async function addUserCredits(wallet: string, count: number): Promise<void> {
  const key = wallet.toLowerCase();
  voteCredits[key] = (voteCredits[key] || 0) + count;
}

export async function deductUserCredits(wallet: string, count: number): Promise<void> {
  const key = wallet.toLowerCase();
  if ((voteCredits[key] || 0) < count) throw new Error('Not enough credits');
  voteCredits[key] -= count;
}