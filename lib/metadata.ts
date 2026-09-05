import { bytesToHex, isAddress, sha256, type Hex } from 'viem';
import { CID } from 'multiformats/cid';
import type { Metadata, ChainCredential, RegistryConfig } from './types';
export const MAX_METADATA_BYTES = 32768;
export function digest(bytes: Uint8Array): Hex {
  return sha256(bytesToHex(bytes));
}
export function validateCid(value: string): string {
  const cid = CID.parse(value);
  if (value.length > 120) throw new Error('CID is too long');
  if (cid.code !== 0x55 && cid.code !== 0x70) throw new Error('Use a file CID');
  return cid.toString();
}
export function parseMetadata(bytes: Uint8Array): Metadata {
  if (bytes.length > MAX_METADATA_BYTES)
    throw new Error('Metadata exceeds 32 KB');
  const m = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (
    m === null ||
    typeof m !== 'object' ||
    Array.isArray(m) ||
    m.schema !== 'proofline/1'
  )
    throw new Error('Unsupported metadata schema');
  for (const key of ['name', 'course'])
    if (typeof m[key] !== 'string' || !m[key].trim() || m[key].length > 160)
      throw new Error(`Invalid ${key}`);
  if (
    typeof m.completionDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(m.completionDate) ||
    !Number.isFinite(Date.parse(m.completionDate)) ||
    new Date(m.completionDate).toISOString().slice(0, 10) !== m.completionDate
  )
    throw new Error('Invalid completion date');
  for (const key of ['issuer', 'institution', 'recipient', 'contract'])
    if (typeof m[key] !== 'string' || !isAddress(m[key]))
      throw new Error(`Invalid ${key} address`);
  if (
    typeof m.serial !== 'string' ||
    !/^0x[\da-fA-F]{64}$/.test(m.serial) ||
    /^0x0{64}$/.test(m.serial)
  )
    throw new Error('Invalid serial');
  if (!Number.isSafeInteger(m.chainId) || m.chainId <= 0)
    throw new Error('Invalid chain');
  return m as Metadata;
}
export function verifyMetadata(
  bytes: Uint8Array,
  record: ChainCredential,
  config: RegistryConfig,
): Metadata {
  if (digest(bytes).toLowerCase() !== record.metadataHash.toLowerCase())
    throw new Error(
      'The file does not match the issuer’s on-chain fingerprint.',
    );
  const m = parseMetadata(bytes);
  const pairs = [
    [m.issuer, record.issuer],
    [m.institution, record.institution],
    [m.recipient, record.recipient],
    [m.serial, record.serial],
    [m.contract, config.contractAddress || ''],
  ];
  if (
    m.chainId !== config.chainId ||
    pairs.some(([a, b]) => a.toLowerCase() !== b.toLowerCase())
  )
    throw new Error('Metadata provenance does not match the on-chain record.');
  return m;
}
export function encodeMetadata(m: Metadata): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(m));
  parseMetadata(bytes);
  return bytes;
}
export function uploadMessage(
  origin: string,
  config: RegistryConfig,
  hash: Hex,
  expires: number,
): string {
  return `Proofline metadata upload\nOrigin: ${origin}\nChain: ${config.chainId}\nContract: ${config.contractAddress}\nSHA256: ${hash}\nExpires: ${expires}`;
}
export async function limitedBytes(response: Response): Promise<Uint8Array> {
  if (!response.ok) throw new Error('Metadata is unavailable');
  if (Number(response.headers.get('content-length') || 0) > MAX_METADATA_BYTES)
    throw new Error('Metadata exceeds 32 KB');
  if (!response.body) throw new Error('Empty metadata response');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_METADATA_BYTES)
        throw new Error('Metadata exceeds 32 KB');
      parts.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  return bytes;
}
