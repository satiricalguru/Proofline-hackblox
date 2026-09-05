import type { Address, Hex } from 'viem';
export type RegistryConfig = {
  chainId: number;
  contractAddress: Address | null;
  rpcUrl: string;
  explorer: string | null;
  deploymentBlock: string;
  networkName: string;
  uploadEnabled: boolean;
  local: boolean;
};
export type Issuer = {
  address: Address;
  label: string;
  parent: Address;
  enabled: boolean;
  institution: boolean;
};
export type ChainCredential = {
  id: string;
  recipient: Address;
  issuer: Address;
  institution: Address;
  serial: Hex;
  cid: string;
  metadataHash: Hex;
  issuedAt: bigint;
  revoked: boolean;
  reason: number;
};
export type Metadata = {
  schema: 'proofline/1';
  name: string;
  course: string;
  completionDate: string;
  issuer: Address;
  institution: Address;
  recipient: Address;
  serial: Hex;
  chainId: number;
  contract: Address;
};
export type Verification = {
  record: ChainCredential;
  issuer: Issuer;
  institution: Issuer;
  block: string;
  checkedAt: string;
  owner: Address;
  locked: boolean;
  metadata: Metadata | null;
  integrity: 'verified' | 'mismatch' | 'unavailable';
  message: string;
  originalBytes?: Uint8Array;
};
