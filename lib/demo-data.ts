import type {
  ChainCredential,
  Issuer,
  RegistryConfig,
  Verification,
} from './types';

export const DEMO_CONFIG: RegistryConfig = {
  chainId: 11155111,
  contractAddress: null,
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  explorer: 'https://sepolia.etherscan.io',
  deploymentBlock: '0',
  networkName: 'Ethereum Sepolia',
  local: false,
  uploadEnabled: false,
};

export const DEMO_ISSUERS: Issuer[] = [
  {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    label: 'Example Academy (demo)',
    parent: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    enabled: true,
    institution: true,
  },
  {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    label: 'School of Engineering (demo)',
    parent: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    enabled: true,
    institution: false,
  },
];

export const DEMO_CREDENTIALS: (ChainCredential & {
  name: string;
  course: string;
})[] = [
  {
    id: '1',
    name: 'Alex Morgan (demo)',
    course: 'Applied Smart Contract Engineering',
    recipient: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    issuer: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    institution: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    serial:
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    cid: 'bafkreiexw2ebq7ec4w5am2ay2qvirsde555qvmyhfacoxu6rby3rc7ofbi',
    metadataHash:
      '0x97b688187c82e5ba066818d42a88c864ef7b0ab3072804ebd3d10e37117dc50a',
    issuedAt: 1757088000n,
    revoked: false,
    reason: 0,
  },
  {
    id: '2',
    name: 'Sam Rivera (demo)',
    course: 'Data Systems & Architecture',
    recipient: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    issuer: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    institution: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    serial:
      '0x0000000000000000000000000000000000000000000000000000000000000002',
    cid: 'bafkreib7uqccgroxkv64tbq7d2eg6wdcjbgzql7v2owh63c4uxos4hp34a',
    metadataHash:
      '0x3fa4042345d7557dc9861f1e886f5862484d982ff5d3ac7f6c5ca5dd2e1dfbe0',
    issuedAt: 1757088000n,
    revoked: false,
    reason: 0,
  },
  {
    id: '3',
    name: 'Alex Morgan (demo)',
    course: 'Introduction to Web3',
    recipient: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    issuer: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    institution: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    serial:
      '0x0000000000000000000000000000000000000000000000000000000000000003',
    cid: 'bafkreigmt5kidozw56syckal3tfraamjh74uakiw2vh6hnxchonuigeqne',
    metadataHash:
      '0xcc9f5481bb36efa581280bdccb1001893ff9402916d54fe3b6e23b9b44189069',
    issuedAt: 1757088000n,
    revoked: true,
    reason: 1,
  },
];

export function getDemoVerification(id: string): Verification | null {
  const cred = DEMO_CREDENTIALS.find((c) => c.id === id);
  if (!cred) return null;
  const institution = DEMO_ISSUERS[0];
  const issuer = DEMO_ISSUERS[1];
  return {
    record: cred,
    issuer,
    institution,
    block: '1',
    checkedAt: new Date().toISOString(),
    owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    locked: true,
    metadata: {
      schema: 'proofline/1',
      name: cred.name,
      course: cred.course,
      completionDate: '2026-09-05',
      issuer: cred.issuer,
      institution: cred.institution,
      recipient: cred.recipient,
      serial: cred.serial,
      chainId: 11155111,
      contract: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    },
    integrity: 'verified',
    message: cred.revoked
      ? 'Credential was permanently revoked by the issuing institution. Revocation reason code and provenance are recorded on-chain.'
      : 'Authentic soulbound credential. The cryptographic hash of the off-chain metadata matches the on-chain registry record.',
  };
}
