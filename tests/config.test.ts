import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRegistryConfig } from '../lib/server-config';

void test('production ignores development chain, contract and RPC settings', () => {
  const original = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      REGISTRY_NETWORK: 'local',
      REGISTRY_ADDRESS: '0x1111111111111111111111111111111111111111',
      PUBLIC_RPC_URL: 'http://127.0.0.1:8545',
      SEPOLIA_REGISTRY_ADDRESS: '0x2222222222222222222222222222222222222222',
      SEPOLIA_PUBLIC_RPC_URL: 'https://rpc.example.test',
    });
    const config = getRegistryConfig();
    assert.equal(config.local, false);
    assert.equal(config.chainId, 11155111);
    assert.equal(config.contractAddress, process.env.SEPOLIA_REGISTRY_ADDRESS);
    assert.equal(config.rpcUrl, 'https://rpc.example.test');
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});
