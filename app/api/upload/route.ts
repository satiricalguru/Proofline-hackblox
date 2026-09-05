import { isAddress, type Address, type Hex } from 'viem';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { getRegistryConfig } from '@/lib/server-config';
import { localStore } from '@/lib/local-storage';
import {
  digest,
  parseMetadata,
  uploadMessage,
  MAX_METADATA_BYTES,
  validateCid,
} from '@/lib/metadata';
import { registryClient, requireDeployment } from '@/lib/registry';
import { credentialAbi as abi } from '@/lib/generated/abi';
const quota = new Map<string, { start: number; count: number }>();
const results = new Map<string, string>();
export async function POST(request: Request) {
  try {
    const config = getRegistryConfig();
    const contract = requireDeployment(config);
    const origin = request.headers.get('origin');
    const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
    if (!origin || origin !== expected)
      return Response.json(
        { error: 'Unrecognized request origin' },
        { status: 403 },
      );
    if (Number(request.headers.get('content-length') || 0) > 50000)
      return Response.json({ error: 'Request too large' }, { status: 413 });
    // Bound bytes while reading; Content-Length is not a security boundary.
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing request');
    let length = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > 50000) throw new Error('Request too large');
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
    }
    const bodyBytes = new Uint8Array(length);
    let position = 0;
    for (const chunk of chunks) {
      bodyBytes.set(chunk, position);
      position += chunk.length;
    }
    const body = JSON.parse(new TextDecoder().decode(bodyBytes));
    if (
      typeof body.metadata !== 'string' ||
      !isAddress(body.address) ||
      typeof body.signature !== 'string' ||
      !/^0x[0-9a-fA-F]+$/.test(body.signature)
    )
      throw new Error('Invalid signed upload');
    const bytes = new TextEncoder().encode(body.metadata);
    if (bytes.length > MAX_METADATA_BYTES)
      throw new Error('Metadata exceeds 32 KB');
    const m = parseMetadata(bytes);
    const now = Math.floor(Date.now() / 1000);
    if (
      !Number.isInteger(body.expires) ||
      body.expires < now ||
      body.expires > now + 300
    )
      throw new Error('Upload authorization expired');
    if (
      m.chainId !== config.chainId ||
      m.contract.toLowerCase() !== contract.toLowerCase() ||
      m.issuer.toLowerCase() !== body.address.toLowerCase()
    )
      throw new Error('Metadata does not match issuer or deployment');
    const client = registryClient(config);
    const account = body.address as Address;
    const hash = digest(bytes);
    const verified = await client.verifyMessage({
      address: account,
      message: uploadMessage(expected, config, hash, body.expires),
      signature: body.signature as Hex,
    });
    if (!verified)
      return Response.json(
        { error: 'Invalid issuer signature' },
        { status: 403 },
      );
    const block = await client.getBlockNumber();
    const [allowed, issuer] = await Promise.all([
      client.readContract({
        address: contract,
        abi,
        functionName: 'canIssue',
        args: [account],
        blockNumber: block,
      }),
      client.readContract({
        address: contract,
        abi,
        functionName: 'issuerInfo',
        args: [account],
        blockNumber: block,
      }),
    ]);
    if (!allowed || issuer.parent.toLowerCase() !== m.institution.toLowerCase())
      return Response.json(
        { error: 'Wallet is not an active issuer for this institution' },
        { status: 403 },
      );
    const key = `${account.toLowerCase()}:${hash}`;
    if (results.has(key)) return Response.json({ cid: results.get(key), hash });
    const count = quota.get(account.toLowerCase());
    for (const [key, entry] of quota) {
      if (now - entry.start >= 3600) quota.delete(key);
    }
    if (count && now - count.start < 3600 && count.count >= 30)
      return Response.json(
        { error: 'Upload limit reached. Reuse an existing CID or try later.' },
        { status: 429 },
      );
    quota.set(
      account.toLowerCase(),
      count && now - count.start < 3600
        ? { start: count.start, count: count.count + 1 }
        : { start: now, count: 1 },
    );
    let cid: string;
    if (config.local) {
      cid = CID.createV1(0x55, await sha256.digest(bytes)).toString();
      if (localStore().size > 500)
        localStore().delete(localStore().keys().next().value!);
      localStore().set(cid, bytes);
    } else {
      if (!process.env.PINATA_JWT)
        return Response.json(
          {
            error:
              'IPFS uploads need a server-side Pinata token. Use the existing CID option.',
          },
          { status: 503 },
        );
      const data = new FormData();
      data.append('network', 'public');
      data.append(
        'file',
        new File([bytes], 'credential.json', { type: 'application/json' }),
      );
      const response = await fetch('https://uploads.pinata.cloud/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
        body: data,
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error('IPFS upload provider is unavailable');
      cid = validateCid(
        ((await response.json()) as { data: { cid: string } }).data.cid,
      );
    }
    if (results.size > 500) results.delete(results.keys().next().value!);
    results.set(key, cid);
    return Response.json(
      { cid, hash },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 },
    );
  }
}
