import deployed from '@/deployments/sepolia.json';
import { isAddress, type Address } from 'viem';
import type { RegistryConfig } from './types';
export function getRegistryConfig(): RegistryConfig {
  const local =
    process.env.NODE_ENV !== 'production' &&
    process.env.REGISTRY_NETWORK === 'local';
  const configured = local
    ? process.env.REGISTRY_ADDRESS
    : process.env.SEPOLIA_REGISTRY_ADDRESS || deployed.address;
  return {
    chainId: local ? 31337 : 11155111,
    contractAddress:
      configured && isAddress(configured) ? (configured as Address) : null,
    rpcUrl: local
      ? process.env.PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
      : process.env.SEPOLIA_PUBLIC_RPC_URL ||
        'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: local ? null : 'https://sepolia.etherscan.io',
    deploymentBlock:
      (local
        ? process.env.DEPLOYMENT_BLOCK
        : process.env.SEPOLIA_DEPLOYMENT_BLOCK) || deployed.blockNumber,
    networkName: local ? 'Local development chain' : 'Ethereum Sepolia',
    local,
    uploadEnabled: local || !!process.env.PINATA_JWT,
  };
}
