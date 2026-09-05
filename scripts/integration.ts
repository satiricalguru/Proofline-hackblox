import assert from 'node:assert/strict';
import { createWalletClient, http, type Hex } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { credentialAbi as abi } from '../lib/generated/abi';
import {
  registryClient,
  registryChain,
  fetchCredential,
} from '../lib/registry';
import {
  encodeMetadata,
  digest,
  uploadMessage,
  verifyMetadata,
} from '../lib/metadata';
import type { RegistryConfig } from '../lib/types';
const origin = 'http://localhost:3000';
const config = (await (
  await fetch(`${origin}/api/config`)
).json()) as RegistryConfig;
assert.equal(
  config.local,
  true,
  'Integration may only mutate the local development chain',
);
assert.ok(config.contractAddress);
const mnemonic = 'test test test test test test test test test test test junk';
const issuer = mnemonicToAccount(mnemonic, { addressIndex: 2 }),
  institution = mnemonicToAccount(mnemonic, { addressIndex: 1 }),
  recipient = mnemonicToAccount(mnemonic, { addressIndex: 3 }),
  stranger = mnemonicToAccount(mnemonic, { addressIndex: 4 });
const serial =
  `0x${crypto.randomUUID().replaceAll('-', '').padEnd(64, '0')}` as Hex;
const metadata = encodeMetadata({
  schema: 'proofline/1',
  name: 'Integration Learner (demo)',
  course: 'End-to-End Verification',
  completionDate: '2026-09-05',
  issuer: issuer.address,
  institution: institution.address,
  recipient: recipient.address,
  serial,
  chainId: config.chainId,
  contract: config.contractAddress,
});
const expires = Math.floor(Date.now() / 1000) + 240;
const hash = digest(metadata);
const signature = await issuer.signMessage({
  message: uploadMessage(origin, config, hash, expires),
});
const body = {
  address: issuer.address,
  expires,
  signature,
  metadata: new TextDecoder().decode(metadata),
};
async function post(value: unknown, requestOrigin = origin) {
  return fetch(`${origin}/api/upload`, {
    method: 'POST',
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}
let response = await post(body, 'https://wrong.example');
assert.equal(response.status, 403);
console.log('PASS wrong upload origin rejected');
response = await post({ ...body, expires: expires - 1000 });
assert.equal(response.status, 400);
console.log('PASS expired upload signature rejected');
response = await post({
  ...body,
  signature: await stranger.signMessage({
    message: uploadMessage(origin, config, hash, expires),
  }),
});
assert.equal(response.status, 403);
console.log('PASS wrong signer rejected');
response = await post(body);
const uploaded = (await response.json()) as {
  cid: string;
  hash: Hex;
  error?: string;
};
assert.equal(response.status, 200, uploaded.error);
assert.equal(uploaded.hash, hash);
console.log('PASS authorized exact-byte upload');
const repeated = (await (await post(body)).json()) as typeof uploaded;
assert.equal(repeated.cid, uploaded.cid);
console.log('PASS repeated upload is idempotent');
const wallet = createWalletClient({
  account: issuer,
  chain: registryChain(config),
  transport: http(config.rpcUrl),
});
const client = registryClient(config);
const next =
  (await client.readContract({
    address: config.contractAddress,
    abi,
    functionName: 'totalIssued',
  })) + 1n;
const tx = await wallet.writeContract({
  address: config.contractAddress,
  abi,
  functionName: 'issue',
  args: [recipient.address, serial, uploaded.cid, hash],
});
assert.equal(
  (await client.waitForTransactionReceipt({ hash: tx })).status,
  'success',
);
const record = await fetchCredential(config, next.toString());
assert.equal(record.recipient, recipient.address);
assert.equal(record.revoked, false);
const fetched = new Uint8Array(
  await (await fetch(`${origin}/api/metadata/${uploaded.cid}`)).arrayBuffer(),
);
verifyMetadata(fetched, record, config);
console.log('PASS mint -> retrieve -> verify exact metadata');
const altered = new Uint8Array(fetched);
altered[20] ^= 1;
assert.throws(() => verifyMetadata(altered, record, config));
console.log('PASS altered metadata rejected');
const revokeTx = await wallet.writeContract({
  address: config.contractAddress,
  abi,
  functionName: 'revoke',
  args: [next, 1],
});
assert.equal(
  (await client.waitForTransactionReceipt({ hash: revokeTx })).status,
  'success',
);
const revoked = await fetchCredential(config, next.toString());
assert.equal(revoked.revoked, true);
assert.equal(revoked.metadataHash, hash);
assert.equal(revoked.recipient, recipient.address);
console.log('PASS revocation preserves owner and metadata');
console.log(
  `Local integration complete. Credential #${next}; mint ${tx}; revoke ${revokeTx}`,
);
