// Contract addresses
export const DISPUTE_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_DISPUTE_ESCROW_ADDRESS;

// Network configuration
export const NETWORK_CONFIG = {
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '11155111', // Sepolia testnet
  name: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Sepolia',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.org',
}; 