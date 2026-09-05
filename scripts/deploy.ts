import fs from 'node:fs';
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseEther,
  type Hex,
} from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { credentialAbi as abi } from '../lib/generated/abi';
import { encodeMetadata, digest } from '../lib/metadata';
const local = process.argv[2] === 'local';
const devMnemonic =
  'test test test test test test test test test test test junk';
const account = local
  ? mnemonicToAccount(devMnemonic)
  : privateKeyToAccount(
      JSON.parse(fs.readFileSync('.secrets/deployer.json', 'utf8')).privateKey,
    );
const rpc = local
  ? 'http://127.0.0.1:8545'
  : process.env.SEPOLIA_RPC_URL ||
    'https://ethereum-sepolia-rpc.publicnode.com';
const chain = defineChain({
  id: local ? 31337 : 11155111,
  name: local ? 'Local development chain' : 'Ethereum Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
});
const client = createPublicClient({
  chain,
  transport: http(rpc, { timeout: 15000, retryCount: 1 }),
});
const wallet = createWalletClient({
  account,
  chain,
  transport: http(rpc, { timeout: 15000, retryCount: 0 }),
});
if ((await client.getChainId()) !== chain.id)
  throw new Error('RPC chain does not match the selected deployment network.');
const manifestPath = `deployments/${local ? 'local' : 'sepolia'}.json`;
if (
  !local &&
  fs.existsSync(manifestPath) &&
  JSON.parse(fs.readFileSync(manifestPath, 'utf8')).address
)
  throw new Error(
    'A Sepolia deployment already exists. Inspect its manifest before intentionally deploying a replacement.',
  );
const balance = await client.getBalance({ address: account.address });
console.log(`Owner ${account.address}; balance ${balance} wei`);
if (!local && balance < parseEther('0.005')) {
  console.error(
    'Deployment needs Sepolia test ETH. Fund the address above, then rerun npm run deploy:sepolia.',
  );
  process.exit(2);
}
const artifact = JSON.parse(
  fs.readFileSync('contracts/out/ProoflineCredential.json', 'utf8'),
);
const hash = await wallet.deployContract({
  abi,
  bytecode: `0x${artifact.evm.bytecode.object}`,
  args: [account.address],
});
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status !== 'success' || !receipt.contractAddress)
  throw new Error('Deployment failed');
const address = receipt.contractAddress;
const manifest = {
  address,
  chainId: chain.id,
  blockNumber: receipt.blockNumber.toString(),
  transactionHash: hash,
  owner: account.address,
  compiler: '0.8.36',
  optimizerRuns: 200,
  evmVersion: 'cancun',
  deployedAt: new Date().toISOString(),
};
fs.writeFileSync(
  `deployments/${local ? 'local' : 'sepolia'}.json`,
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(`Deployed registry ${address}`);
async function tx(w: typeof wallet, functionName: string, args: unknown[]) {
  const h = await w.writeContract({
    address,
    abi,
    functionName,
    args,
  } as never);
  const r = await client.waitForTransactionReceipt({ hash: h });
  if (r.status !== 'success') throw new Error(`${functionName} reverted`);
  return h;
}
if (local) {
  const institution = mnemonicToAccount(devMnemonic, { addressIndex: 1 }),
    department = mnemonicToAccount(devMnemonic, { addressIndex: 2 }),
    student = mnemonicToAccount(devMnemonic, { addressIndex: 3 });
  await tx(wallet, 'registerInstitution', [
    institution.address,
    'Example Academy (demo)',
  ]);
  const institutionalWallet = createWalletClient({
    account: institution,
    chain,
    transport: http(rpc),
  }) as typeof wallet;
  await tx(institutionalWallet, 'registerDepartment', [
    department.address,
    'School of Engineering (demo)',
  ]);
  const deptWallet = createWalletClient({
    account: department,
    chain,
    transport: http(rpc),
  }) as typeof wallet;
  fs.mkdirSync('public/local-metadata', { recursive: true });
  const courses = [
    'Applied Smart Contract Engineering',
    'Data Systems & Architecture',
    'Introduction to Web3',
  ];
  for (let i = 0; i < courses.length; i++) {
    const metadata = encodeMetadata({
      schema: 'proofline/1',
      name: ['Alex Morgan (demo)', 'Sam Rivera (demo)', 'Alex Morgan (demo)'][
        i
      ],
      course: courses[i],
      completionDate: '2026-09-05',
      issuer: department.address,
      institution: institution.address,
      recipient: student.address,
      serial: `0x${(i + 1).toString(16).padStart(64, '0')}` as Hex,
      chainId: chain.id,
      contract: address,
    });
    const cid = CID.createV1(0x55, await sha256.digest(metadata)).toString();
    fs.writeFileSync(`public/local-metadata/${cid}.json`, metadata);
    await tx(deptWallet, 'issue', [
      student.address,
      `0x${(i + 1).toString(16).padStart(64, '0')}`,
      cid,
      digest(metadata),
    ]);
  }
  await tx(deptWallet, 'revoke', [3n, 1]);
  fs.writeFileSync(
    '.env.local',
    `REGISTRY_NETWORK=local\nREGISTRY_ADDRESS=${address}\nPUBLIC_RPC_URL=${rpc}\nDEPLOYMENT_BLOCK=${receipt.blockNumber}\n`,
  );
  fs.writeFileSync(
    'deployments/local-roles.json',
    JSON.stringify(
      {
        admin: account.address,
        institution: institution.address,
        department: department.address,
        recipient: student.address,
      },
      null,
      2,
    ),
  );
  console.log(
    'Seeded 3 real local-chain credentials (one revoked). Development roles saved in deployments/local-roles.json.',
  );
} else {
  console.log(`Explorer: https://sepolia.etherscan.io/address/${address}`);
  console.log(
    'Next: verify source on Etherscan and configure this deployment in the hosted application.',
  );
}
