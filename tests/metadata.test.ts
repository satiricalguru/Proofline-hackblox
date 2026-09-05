import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeMetadata,
  digest,
  verifyMetadata,
  parseMetadata,
  validateCid,
  limitedBytes,
  uploadMessage,
} from '../lib/metadata';
import type { Metadata, ChainCredential, RegistryConfig } from '../lib/types';
const a = '0x1111111111111111111111111111111111111111';
const b = '0x2222222222222222222222222222222222222222';
const metadata: Metadata = {
  schema: 'proofline/1',
  name: 'Demo Learner',
  course: 'Contract Engineering',
  completionDate: '2026-09-05',
  issuer: a,
  institution: a,
  recipient: b,
  serial: `0x${'12'.repeat(32)}`,
  chainId: 31337,
  contract: a,
};
const config: RegistryConfig = {
  chainId: 31337,
  contractAddress: a,
  rpcUrl: 'http://localhost:8545',
  explorer: null,
  deploymentBlock: '1',
  networkName: 'Local',
  local: true,
  uploadEnabled: true,
};
const bytes = encodeMetadata(metadata);
const record: ChainCredential = {
  id: '1',
  recipient: b,
  issuer: a,
  institution: a,
  serial: metadata.serial,
  cid: 'bafy-test',
  metadataHash: digest(bytes),
  issuedAt: 1n,
  revoked: false,
  reason: 0,
};
void test('exact original bytes match the record', () =>
  assert.deepEqual(verifyMetadata(bytes, record, config), metadata));
void test('one changed character fails the on-chain hash', () => {
  const modified = new TextEncoder().encode(
    new TextDecoder().decode(bytes).replace('Demo', 'Fake'),
  );
  assert.throws(() => verifyMetadata(modified, record, config), /fingerprint/);
});
void test('reserialization is not silently treated as identical bytes', () =>
  assert.throws(
    () =>
      verifyMetadata(
        new TextEncoder().encode(JSON.stringify(metadata, null, 2)),
        record,
        config,
      ),
    /fingerprint/,
  ));
void test('a valid hash does not excuse a different recipient', () =>
  assert.throws(
    () => verifyMetadata(bytes, { ...record, recipient: a }, config),
    /provenance/,
  ));
void test('a valid hash does not excuse the wrong deployment', () =>
  assert.throws(
    () => verifyMetadata(bytes, record, { ...config, contractAddress: b }),
    /provenance/,
  ));
void test('a valid hash does not excuse the wrong chain', () =>
  assert.throws(
    () => verifyMetadata(bytes, record, { ...config, chainId: 11155111 }),
    /provenance/,
  ));
void test('metadata rejects malformed and oversized input', () => {
  assert.throws(() => parseMetadata(new Uint8Array(32769)));
  assert.throws(() => parseMetadata(new TextEncoder().encode('null')));
  assert.throws(() => parseMetadata(new Uint8Array([255])));
});
void test('metadata rejects impossible dates, missing labels and zero serial', () => {
  for (const patch of [
    { completionDate: '2026-02-30' },
    { name: '' },
    { serial: `0x${'0'.repeat(64)}` },
    { chainId: 0 },
  ])
    assert.throws(() => encodeMetadata({ ...metadata, ...patch } as Metadata));
});
void test('CID parser rejects paths and arbitrary external URLs', () => {
  assert.throws(() => validateCid('https://evil.example/test'));
  assert.throws(() => validateCid('../admin'));
});
void test('stream reader enforces limits even without content-length', async () => {
  await assert.rejects(
    limitedBytes(new Response(new Uint8Array(32769))),
    /32 KB/,
  );
});
void test('gateway failures do not return valid metadata bytes', async () => {
  await assert.rejects(
    limitedBytes(new Response('Unavailable', { status: 503 })),
    /unavailable/,
  );
});
void test('upload signature binds origin, hash, expiry, chain and contract', () => {
  const message = uploadMessage(
    'https://example.com',
    config,
    record.metadataHash,
    123,
  );
  for (const value of [
    'https://example.com',
    '31337',
    a,
    record.metadataHash,
    '123',
  ])
    assert.ok(message.includes(value));
  assert.notEqual(
    message,
    uploadMessage('https://attacker.com', config, record.metadataHash, 123),
  );
});
