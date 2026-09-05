import {
  createPublicClient,
  http,
  defineChain,
  isAddress,
  zeroAddress,
  type Address,
} from 'viem';
import { credentialAbi as abi } from './generated/abi';
import { limitedBytes, validateCid, verifyMetadata } from './metadata';
import type {
  ChainCredential,
  RegistryConfig,
  Issuer,
  Verification,
} from './types';
export function registryChain(c: RegistryConfig) {
  return defineChain({
    id: c.chainId,
    name: c.networkName,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [c.rpcUrl] } },
  });
}
export function registryClient(c: RegistryConfig) {
  return createPublicClient({
    chain: registryChain(c),
    transport: http(c.rpcUrl, { timeout: 12000, retryCount: 1 }),
  });
}
export function requireDeployment(c: RegistryConfig): Address {
  if (!c.contractAddress)
    throw new Error(
      'Sepolia deployment is not configured yet. Connect the registry before using on-chain actions.',
    );
  return c.contractAddress;
}
export async function fetchCredential(
  c: RegistryConfig,
  id: string,
  block?: bigint,
): Promise<ChainCredential> {
  if (!/^[1-9]\d*$/.test(id) || id.length > 78)
    throw new Error('Enter a positive token ID.');
  const record = await registryClient(c).readContract({
    address: requireDeployment(c),
    abi,
    functionName: 'credential',
    args: [BigInt(id)],
    blockNumber: block,
  });
  return { id, ...record };
}
export async function fetchIssuer(
  c: RegistryConfig,
  address: Address,
  block?: bigint,
): Promise<Issuer> {
  return {
    address,
    ...(await registryClient(c).readContract({
      address: requireDeployment(c),
      abi,
      functionName: 'issuerInfo',
      args: [address],
      blockNumber: block,
    })),
  };
}
export async function listCredentials(
  c: RegistryConfig,
  query = '',
  offset = 0,
): Promise<{ records: ChainCredential[]; more: boolean }> {
  const client = registryClient(c),
    address = requireDeployment(c);
  const block = await client.getBlockNumber();
  let ids: bigint[];
  let more = false;
  if (isAddress(query)) {
    const [page, balance] = await Promise.all([
      client.readContract({
        address,
        abi,
        functionName: 'tokensOf',
        args: [query, BigInt(offset), 10n],
        blockNumber: block,
      }),
      client.readContract({
        address,
        abi,
        functionName: 'balanceOf',
        args: [query],
        blockNumber: block,
      }),
    ]);
    ids = [...page];
    more = BigInt(offset + 10) < balance;
  } else if (query) {
    if (!/^[1-9]\d*$/.test(query) || query.length > 78)
      throw new Error('Enter a wallet address or a positive token ID.');
    ids = [BigInt(query)];
  } else {
    const total = Number(
      await client.readContract({
        address,
        abi,
        functionName: 'totalIssued',
        blockNumber: block,
      }),
    );
    ids = Array.from(
      { length: Math.max(0, Math.min(10, total - offset)) },
      (_, i) => BigInt(total - offset - i),
    );
    more = total > offset + 10;
  }
  return {
    records: await Promise.all(
      ids.map((id) => fetchCredential(c, id.toString(), block)),
    ),
    more,
  };
}
export async function listIssuers(c: RegistryConfig, offset = 0) {
  const client = registryClient(c),
    address = requireDeployment(c);
  const block = await client.getBlockNumber();
  const [addresses, total] = await Promise.all([
    client.readContract({
      address,
      abi,
      functionName: 'issuers',
      args: [BigInt(offset), 20n],
      blockNumber: block,
    }),
    client.readContract({
      address,
      abi,
      functionName: 'issuerCount',
      blockNumber: block,
    }),
  ]);
  return {
    issuers: await Promise.all(addresses.map((a) => fetchIssuer(c, a, block))),
    more: total > BigInt(offset + 20),
  };
}
export async function retrieveMetadata(
  c: RegistryConfig,
  cid: string,
): Promise<Uint8Array> {
  const validated = validateCid(cid);
  const urls = c.local
    ? [`/local-metadata/${validated}.json`, `/api/metadata/${validated}`]
    : [
        `https://ipfs.io/ipfs/${validated}`,
        `https://dweb.link/ipfs/${validated}`,
      ];
  let error: unknown;
  for (const url of urls) {
    try {
      return await limitedBytes(
        await fetch(url, {
          signal: AbortSignal.timeout(9000),
          cache: 'no-store',
        }),
      );
    } catch (e) {
      error = e;
    }
  }
  throw error || new Error('IPFS gateways unavailable');
}
export async function verifyCredential(
  c: RegistryConfig,
  id: string,
): Promise<Verification> {
  const client = registryClient(c),
    address = requireDeployment(c);
  const block = await client.getBlockNumber();
  const record = await fetchCredential(c, id, block);
  const [issuer, institution, owner, locked] = await Promise.all([
    fetchIssuer(c, record.issuer, block),
    fetchIssuer(c, record.institution, block),
    client.readContract({
      address,
      abi,
      functionName: 'ownerOf',
      args: [BigInt(id)],
      blockNumber: block,
    }),
    client.readContract({
      address,
      abi,
      functionName: 'locked',
      args: [BigInt(id)],
      blockNumber: block,
    }),
  ]);
  const result: Verification = {
    record,
    issuer,
    institution,
    owner,
    locked,
    block: block.toString(),
    checkedAt: new Date().toISOString(),
    metadata: null,
    integrity: 'unavailable',
    message: 'Metadata could not be retrieved.',
  };
  if (
    owner.toLowerCase() !== record.recipient.toLowerCase() ||
    !locked ||
    issuer.parent === zeroAddress ||
    issuer.parent.toLowerCase() !== record.institution.toLowerCase() ||
    !institution.institution
  ) {
    result.integrity = 'mismatch';
    result.message =
      'The record does not satisfy the registry’s ownership or issuer rules.';
    return result;
  }
  try {
    const bytes = await retrieveMetadata(c, record.cid);
    result.originalBytes = bytes;
    try {
      result.metadata = verifyMetadata(bytes, record, c);
      result.integrity = 'verified';
      result.message = 'Contents match the immutable on-chain fingerprint.';
    } catch (e) {
      result.integrity = 'mismatch';
      result.message = e instanceof Error ? e.message : 'Metadata mismatch';
    }
  } catch {
    result.message =
      'The on-chain record was read, but its metadata is unavailable. Try again.';
  }
  return result;
}
export function shortAddress(s: string) {
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}
export function errorMessage(error: unknown): string {
  const e = error as { shortMessage?: string; message?: string };
  return e.shortMessage || e.message || 'The request failed. Please try again.';
}
