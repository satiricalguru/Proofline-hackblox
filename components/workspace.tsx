'use client';
/* oxlint-disable react/react-compiler -- Permission and verification effects deliberately clear stale state before asynchronous chain reads; this app does not enable React Compiler. */
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useConnection,
  useConnectors,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWalletClient,
} from 'wagmi';
import {
  isAddress,
  zeroAddress,
  decodeEventLog,
  type Address,
  type Hex,
} from 'viem';
import QRCode from 'qrcode';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  Search,
  ShieldCheck,
  Layers3,
  FileCheck2,
  Building2,
  Wallet,
  Plus,
  ExternalLink,
  RefreshCw,
  Check,
  Copy,
  Download,
  LockKeyhole,
  TriangleAlert,
  LoaderCircle,
  X,
  ShieldX,
  ChevronRight,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Providers from './providers';
import { credentialAbi as abi } from '@/lib/generated/abi';
import {
  registryClient,
  requireDeployment,
  listCredentials,
  listIssuers,
  fetchIssuer,
  verifyCredential,
  retrieveMetadata,
  shortAddress,
  errorMessage,
} from '@/lib/registry';
import {
  encodeMetadata,
  digest,
  parseMetadata,
  verifyMetadata,
  uploadMessage,
  validateCid,
  MAX_METADATA_BYTES,
} from '@/lib/metadata';
import type {
  RegistryConfig,
  ChainCredential,
  Issuer,
  Verification,
  Metadata,
} from '@/lib/types';
import {
  DEMO_CONFIG,
  DEMO_ISSUERS,
  DEMO_CREDENTIALS,
  getDemoVerification,
} from '@/lib/demo-data';
const navigation: [string, string, LucideIcon][] = [
  ['registry', 'Registry', FileCheck2],
  ['issue', 'Issue credential', Plus],
  ['institutions', 'Institutions', Building2],
  ['settings', 'Deployment', ShieldCheck],
];
const reasons = [
  '',
  'Record issued in error',
  'Superseded by a corrected record',
  'Issuer withdrawal',
];
type Row = ChainCredential & { name?: string; course?: string };
type Initial = {
  tokenId?: string;
  chainId?: string;
  contract?: string;
  wallet?: string;
};
export default function Workspace(initial: Initial) {
  const [config, setConfig] = useState<RegistryConfig | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const isGhPages =
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/Proofline-hackblox');
    const basePath = isGhPages ? '/Proofline-hackblox' : '';
    fetch(`${basePath}/api/config`)
      .then((r) => {
        if (!r.ok) throw new Error('Configuration unavailable');
        return r.json() as Promise<RegistryConfig>;
      })
      .then(setConfig)
      .catch(() => {
        // Fallback for static hosting / GitHub Pages
        setConfig(DEMO_CONFIG);
      });
  }, []);
  if (!config)
    return (
      <div className="boot-state">
        <Layers3 size={34} />
        <h1>Proofline.</h1>
        <p>{error || 'Connecting to the credential workspace…'}</p>
        {error && (
          <Button onClick={() => window.location.reload()}>Try again</Button>
        )}
      </div>
    );
  return (
    <Providers config={config}>
      <RegistryWorkspace config={config} initial={initial} />
    </Providers>
  );
}
function RegistryWorkspace({
  config,
  initial,
}: {
  config: RegistryConfig;
  initial: Initial;
}) {
  const [view, setView] = useState(initial.tokenId ? 'credential' : 'registry');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('proofline-theme', nextTheme);
    } catch {
      // localStorage may be unavailable
    }
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };
  const [query, setQuery] = useState(initial.wallet || '');
  const [activeQuery, setActiveQuery] = useState(initial.wallet || '');
  const [rows, setRows] = useState<Row[]>([]),
    [issuers, setIssuers] = useState<Issuer[]>([]),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [issuerOffset, setIssuerOffset] = useState(0),
    [issuerMore, setIssuerMore] = useState(false);
  const [selected, setSelected] = useState(initial.tokenId || ''),
    [verification, setVerification] = useState<Verification | null>(null),
    [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [transaction, setTransaction] = useState<{
      hash?: Hex;
      stage: string;
    } | null>(null);
  const [stats, setStats] = useState({
      issued: '—',
      revoked: '—',
      issuers: '—',
    }),
    [owner, setOwner] = useState<Address | null>(null),
    [myIssuer, setMyIssuer] = useState<Issuer | null>(null),
    [mayIssue, setMayIssue] = useState(false),
    [mayRevoke, setMayRevoke] = useState(false);
  const [filter, setFilter] = useState('all'),
    [minting, setMinting] = useState(false),
    [compare, setCompare] = useState(''),
    [copied, setCopied] = useState(false),
    [reason, setReason] = useState('1'),
    [confirmRevoke, setConfirmRevoke] = useState(false);
  const [issuerType, setIssuerType] = useState('institution');
  const [form, setForm] = useState({
      name: '',
      course: '',
      recipient: '',
      date: '2026-09-05',
    }),
    [issuerForm, setIssuerForm] = useState({ address: '', label: '' });
  const [existing, setExisting] = useState(false),
    [existingCid, setExistingCid] = useState(''),
    [existingBytes, setExistingBytes] = useState<Uint8Array | null>(null);
  const [pendingMetadata, setPendingMetadata] = useState<{
    bytes: Uint8Array;
    metadata: Metadata;
    cid?: string;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestId = useRef(0);
  const { address, chainId, isConnected } = useConnection();
  const connect = useConnect();
  const connectors = useConnectors();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const { data: wallet } = useWalletClient();
  const wrongChain = isConnected && chainId !== config.chainId;
  const client = registryClient(config);
  const setPage = (page: string) => {
    requestId.current++;
    setView(page);
    setError('');
    setNotice('');
    setCompare('');
    setConfirmRevoke(false);
    setTransaction(null);
  };
  const refresh = () => setRefreshKey((k) => k + 1);
  const openCredential = useCallback((id: string) => {
    setSelected(id);
    setVerification(null);
    setView('credential');
    setError('');
    setCompare('');
    setConfirmRevoke(false);
  }, []);
  const linkFor = useCallback(
    (id: string) => {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
      const isGhPages =
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/Proofline-hackblox');
      const prefix = isGhPages ? '/Proofline-hackblox' : '';
      return `${origin}${prefix}/verify/${config.chainId}/${config.contractAddress || '0x5fbdb2315678afecb367f032d93f642f64180aa3'}/${id}`;
    },
    [config.chainId, config.contractAddress],
  );
  useEffect(() => {
    if (!config.contractAddress) {
      setStats({
        issued: '3',
        revoked: '1',
        issuers: '2',
      });
      setOwner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      return;
    }
    let cancelled = false;
    const c = registryClient(config);
    const args = { address: config.contractAddress, abi };
    Promise.all([
      c.readContract({ ...args, functionName: 'totalIssued' }),
      c.readContract({ ...args, functionName: 'totalRevoked' }),
      c.readContract({ ...args, functionName: 'issuerCount' }),
      c.readContract({ ...args, functionName: 'owner' }),
    ])
      .then(([a, b, d, o]) => {
        if (!cancelled) {
          setStats({
            issued: a.toString(),
            revoked: b.toString(),
            issuers: d.toString(),
          });
          setOwner(o);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [config, refreshKey]);
  useEffect(() => {
    setMyIssuer(null);
    setMayIssue(false);
    setMayRevoke(false);
    setPendingMetadata(null);
    setConfirmRevoke(false);
    if (!address || !config.contractAddress) return;
    let cancelled = false;
    Promise.all([
      fetchIssuer(config, address),
      registryClient(config).readContract({
        address: config.contractAddress,
        abi,
        functionName: 'canIssue',
        args: [address],
      }),
    ])
      .then(([i, enabled]) => {
        if (!cancelled) {
          setMyIssuer(i.parent !== zeroAddress ? i : null);
          setMayIssue(enabled);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, chainId, config, refreshKey]);
  useEffect(() => {
    setMayRevoke(false);
    if (!address || !selected || !config.contractAddress || !verification)
      return;
    let cancelled = false;
    registryClient(config)
      .readContract({
        address: config.contractAddress,
        abi,
        functionName: 'canRevoke',
        args: [BigInt(selected), address],
      })
      .then((ok) => {
        if (!cancelled) setMayRevoke(ok);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, chainId, selected, verification, config, refreshKey]);
  useEffect(() => {
    const current = ++requestId.current;
    setBusy(true);
    setError('');
    if (!config.contractAddress) {
      if (view === 'registry') {
        let list = [...DEMO_CREDENTIALS];
        if (activeQuery) {
          const q = activeQuery.toLowerCase().trim();
          list = list.filter(
            (c) =>
              c.id === q ||
              c.recipient.toLowerCase().includes(q) ||
              c.name.toLowerCase().includes(q) ||
              c.course.toLowerCase().includes(q),
          );
        }
        if (current === requestId.current) {
          setRows(list);
          setMore(false);
          setBusy(false);
        }
      } else if (view === 'credential') {
        const v = getDemoVerification(selected);
        if (current === requestId.current) {
          setVerification(v);
          QRCode.toDataURL(linkFor(selected), {
            margin: 1,
            width: 160,
            color: { dark: '#234932', light: '#ffffff' },
          })
            .then(setQr)
            .catch(() => setQr(''));
          setBusy(false);
        }
      } else if (view === 'institutions') {
        if (current === requestId.current) {
          setIssuers(DEMO_ISSUERS);
          setIssuerMore(false);
          setBusy(false);
        }
      } else {
        setBusy(false);
      }
      return;
    }
    const load = async () => {
      if (view === 'registry') {
        const data = await listCredentials(config, activeQuery, offset);
        const enriched = await Promise.all(
          data.records.map(async (r) => {
            try {
              const m = verifyMetadata(
                await retrieveMetadata(config, r.cid),
                r,
                config,
              );
              return { ...r, name: m.name, course: m.course };
            } catch {
              return r;
            }
          }),
        );
        if (current === requestId.current) {
          setRows(enriched);
          setMore(data.more);
        }
      } else if (view === 'credential') {
        if (
          initial.tokenId === selected &&
          ((initial.chainId && initial.chainId !== String(config.chainId)) ||
            (initial.contract &&
              initial.contract.toLowerCase() !==
                config.contractAddress!.toLowerCase()))
        )
          throw new Error(
            'Unsupported deployment. This link does not point to the recognized registry.',
          );
        setVerification(null);
        const v = await verifyCredential(config, selected);
        if (current === requestId.current) {
          setVerification(v);
          QRCode.toDataURL(linkFor(selected), {
            margin: 1,
            width: 160,
            color: { dark: '#234932', light: '#ffffff' },
          })
            .then(setQr)
            .catch(() => setQr(''));
        }
      } else if (view === 'institutions') {
        const data = await listIssuers(config, issuerOffset);
        if (current === requestId.current) {
          setIssuers(data.issuers);
          setIssuerMore(data.more);
        }
      }
    };
    load()
      .catch((e) => {
        if (current === requestId.current) {
          setError(errorMessage(e));
          setRows([]);
        }
      })
      .finally(() => {
        if (current === requestId.current) setBusy(false);
      });
  }, [
    view,
    activeQuery,
    offset,
    issuerOffset,
    selected,
    config,
    refreshKey,
    initial.chainId,
    initial.contract,
    initial.tokenId,
    linkFor,
  ]);
  // Public verification refreshes on focus and periodically; stale success is removed while rechecking.
  useEffect(() => {
    if (view !== 'credential') return;
    const fn = () => refresh();
    window.addEventListener('focus', fn);
    const interval = setInterval(fn, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fn);
    };
  }, [view]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      context.registerTool(
        {
          name: 'verify_credential',
          description:
            'Read a credential from the configured blockchain, inspect metadata integrity, and open its verification receipt. Does not sign a transaction.',
          inputSchema: {
            type: 'object',
            properties: {
              tokenId: { type: 'string', pattern: '^[1-9][0-9]*$' },
            },
            required: ['tokenId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute: async (input: unknown) => {
            const id = (input as { tokenId?: string })?.tokenId;
            if (typeof id !== 'string' || !/^\d+$/.test(id) || id === '0')
              throw new Error('Positive token ID required');
            const v = await verifyCredential(config, id);
            openCredential(id);
            setVerification(v);
            return {
              tokenId: id,
              revoked: v.record.revoked,
              integrity: v.integrity,
              issuer: v.record.issuer,
              recipient: v.record.recipient,
              block: v.block,
            };
          },
        },
        { signal: lifecycle.signal },
      );
    } catch {}
    return () => lifecycle.abort();
  }, [config, openCredential]);
  async function connectWallet() {
    setError('');
    try {
      const connector = connectors[0];
      if (!connector)
        throw new Error(
          'Install MetaMask or another injected Ethereum wallet.',
        );
      await connect.mutateAsync({ connector });
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function transact(functionName: string, args: unknown[]) {
    if (!wallet || !address)
      throw new Error('Connect an authorized wallet first.');
    if (wrongChain)
      throw new Error(`Switch your wallet to ${config.networkName}.`);
    const deployment = requireDeployment(config);
    setTransaction({ stage: 'Checking transaction…' });
    await client.simulateContract({
      address: deployment,
      abi,
      functionName,
      args,
      account: address,
    } as never);
    setTransaction({ stage: 'Waiting for wallet signature…' });
    const hash = await wallet.writeContract({
      address: deployment,
      abi,
      functionName,
      args,
      account: address,
      chain: wallet.chain,
    } as never);
    setTransaction({ hash, stage: 'Submitted · waiting for confirmation…' });
    let changedTransaction = false;
    const receipt = await client.waitForTransactionReceipt({
      hash,
      timeout: 120000,
      onReplaced: (replacement) => {
        changedTransaction = replacement.reason !== 'repriced';
        setTransaction({
          hash: replacement.transaction.hash,
          stage: 'Transaction replaced · waiting for confirmation…',
        });
      },
    });
    if (changedTransaction)
      throw new Error(
        'The wallet cancelled or changed this transaction. Refresh the registry before trying again.',
      );
    if (receipt.status !== 'success')
      throw new Error(
        'The transaction reverted. No credential state was changed.',
      );
    setTransaction({
      hash: receipt.transactionHash,
      stage: 'Confirmed on-chain',
    });
    refresh();
    return receipt;
  }
  async function issue(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    setMinting(true);
    try {
      if (!address || !myIssuer || !mayIssue || wrongChain)
        throw new Error('Connect an active issuer on the correct network.');
      let bytes: Uint8Array, metadata: Metadata, cid: string | undefined;
      if (existing) {
        if (!existingBytes)
          throw new Error('Select the original metadata JSON.');
        bytes = existingBytes;
        metadata = parseMetadata(bytes);
        cid = validateCid(existingCid);
        if (
          metadata.issuer.toLowerCase() !== address.toLowerCase() ||
          metadata.institution.toLowerCase() !==
            myIssuer.parent.toLowerCase() ||
          metadata.chainId !== config.chainId ||
          metadata.contract.toLowerCase() !==
            requireDeployment(config).toLowerCase()
        )
          throw new Error(
            'The file must reference this issuer, institution and deployment.',
          );
        setTransaction({ stage: 'Checking the supplied IPFS file…' });
        const pinnedBytes = await retrieveMetadata(config, cid);
        if (digest(pinnedBytes) !== digest(bytes))
          throw new Error(
            'The IPFS content does not match the selected JSON. No transaction was sent.',
          );
      } else {
        if (!isAddress(form.recipient) || form.recipient === zeroAddress)
          throw new Error('Enter a valid recipient wallet.');
        if (pendingMetadata) {
          ({ bytes, metadata, cid } = pendingMetadata);
        } else {
          const random = crypto.getRandomValues(new Uint8Array(32));
          const serial =
            `0x${Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('')}` as Hex;
          metadata = {
            schema: 'proofline/1',
            name: form.name.trim(),
            course: form.course.trim(),
            completionDate: form.date,
            issuer: address,
            institution: myIssuer.parent,
            recipient: form.recipient,
            serial,
            chainId: config.chainId,
            contract: requireDeployment(config),
          };
          bytes = encodeMetadata(metadata);
          setPendingMetadata({ bytes, metadata });
        }
      }
      if (!cid) {
        setTransaction({ stage: 'Authorize metadata upload in your wallet…' });
        const expires = Math.floor(Date.now() / 1000) + 300;
        const signature = await wallet!.signMessage({
          message: uploadMessage(
            window.location.origin,
            config,
            digest(bytes),
            expires,
          ),
        });
        const isGhPages =
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/Proofline-hackblox');
        const basePath = isGhPages ? '/Proofline-hackblox' : '';
        const response = await fetch(`${basePath}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            expires,
            signature,
            metadata: new TextDecoder().decode(bytes),
          }),
        });
        const data = (await response.json()) as { cid: string; error?: string };
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        cid = validateCid(data.cid);
        setPendingMetadata({ bytes, metadata, cid });
      }
      const receipt = await transact('issue', [
        metadata.recipient,
        metadata.serial,
        cid,
        digest(bytes),
      ]);
      const event = receipt.logs
        .filter(
          (log) =>
            log.address.toLowerCase() ===
            requireDeployment(config).toLowerCase(),
        )
        .map((log) => {
          try {
            return decodeEventLog({ abi, data: log.data, topics: log.topics });
          } catch {
            return null;
          }
        })
        .find((x) => x?.eventName === 'CredentialIssued');
      if (event?.eventName !== 'CredentialIssued')
        throw new Error(
          'No credential issuance event was found. Refresh the registry and inspect the transaction before retrying.',
        );
      setPendingMetadata(null);
      if (event?.eventName === 'CredentialIssued') {
        openCredential(event.args.tokenId.toString());
        setNotice('Credential issued successfully.');
      }
    } catch (e) {
      setError(errorMessage(e));
      setTransaction(null);
    } finally {
      setMinting(false);
    }
  }
  async function registerIssuer(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMinting(true);
    try {
      if (!isAddress(issuerForm.address) || issuerForm.address === zeroAddress)
        throw new Error('Enter a valid issuer address.');
      if (!issuerForm.label.trim())
        throw new Error('Enter the institution or department name.');
      await transact(
        issuerType === 'institution'
          ? 'registerInstitution'
          : 'registerDepartment',
        [issuerForm.address, issuerForm.label.trim()],
      );
      setIssuerForm({ address: '', label: '' });
      setNotice('Issuer registered on-chain.');
    } catch (e) {
      setError(errorMessage(e));
      setTransaction(null);
    } finally {
      setMinting(false);
    }
  }
  async function revoke() {
    setMinting(true);
    setError('');
    try {
      await transact('revoke', [BigInt(selected), Number(reason)]);
      setConfirmRevoke(false);
      setVerification(null);
      setNotice('Revocation confirmed. The original record is preserved.');
    } catch (e) {
      setError(errorMessage(e));
      setTransaction(null);
    } finally {
      setMinting(false);
    }
  }
  async function setEnabled(issuer: Issuer) {
    setMinting(true);
    setError('');
    try {
      await transact('setIssuerEnabled', [issuer.address, !issuer.enabled]);
      setNotice(
        issuer.enabled
          ? 'Future issuance disabled. Existing credentials retain their status.'
          : 'Issuer enabled.',
      );
    } catch (e) {
      setError(errorMessage(e));
      setTransaction(null);
    } finally {
      setMinting(false);
    }
  }
  function download(bytes: Uint8Array, name: string) {
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(bytes)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function compareFile(file: File) {
    setCompare('');
    try {
      if (file.size > MAX_METADATA_BYTES)
        throw new Error('File exceeds 32 KB.');
      if (!verification) throw new Error('Verify a credential first.');
      verifyMetadata(
        new Uint8Array(await file.arrayBuffer()),
        verification.record,
        config,
      );
      setCompare('match');
    } catch (e) {
      setCompare(errorMessage(e));
    }
  }
  const state = verification?.record.revoked
    ? 'revoked'
    : verification?.integrity === 'verified'
      ? 'verified'
      : verification?.integrity === 'mismatch'
        ? 'mismatch'
        : 'unavailable';
  const canAdmin = !!address && owner?.toLowerCase() === address.toLowerCase();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Layers3 size={24} />
          </span>
          Proofline<span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">CREDENTIAL WORKSPACE</div>
        <nav>
          {navigation.map(([id, label, Icon]) => (
            <button
              key={id}
              className={
                view === id || (view === 'credential' && id === 'registry')
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => setPage(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {view === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-label">
            <span />
            {config.local ? 'Local development' : config.networkName}
          </div>
          <p>
            Public proof.
            <br />
            Lasting confidence.
          </p>
          <a
            href="https://eips.ethereum.org/EIPS/eip-5192"
            target="_blank"
            rel="noreferrer"
          >
            About soulbound credentials <ArrowUpRight size={15} />
          </a>
          <a
            href="https://www.hackblox.xyz/"
            target="_blank"
            rel="noreferrer"
            className="build-label"
          >
            HACKBLOX 2026 <span>↗</span>
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>
              {view === 'credential'
                ? 'Verification'
                : navigation.find((x) => x[0] === view)?.[1]}
            </strong>
          </div>
          <div className="top-actions">
            <span className="network-pill">
              <span />
              {config.local ? 'Local chain' : 'Sepolia'}
            </span>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {isConnected ? (
              <Button
                className="wallet-button"
                variant="outline"
                title="Disconnect wallet"
                onClick={() => disconnect.mutate()}
              >
                <Wallet size={16} />
                {shortAddress(address!)}
                <X size={13} />
              </Button>
            ) : (
              <Button
                className="wallet-button"
                variant="outline"
                onClick={connectWallet}
                disabled={connect.isPending}
              >
                <Wallet size={16} />
                {connect.isPending ? 'Connecting…' : 'Connect wallet'}
              </Button>
            )}
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {view === 'credential'
                  ? 'INDEPENDENT VERIFICATION'
                  : 'THE CREDENTIAL REGISTRY'}
              </div>
              <h1>
                {view === 'credential'
                  ? 'Proof you can inspect.'
                  : view === 'issue'
                    ? 'Put achievement on record.'
                    : view === 'institutions'
                      ? 'Authority, with provenance.'
                      : view === 'settings'
                        ? 'A transparent foundation.'
                        : 'Trust, on the record.'}
              </h1>
              <p>
                {view === 'issue'
                  ? 'Issue a permanent, wallet-bound record of achievement.'
                  : view === 'institutions'
                    ? 'Institutions and the departments they authorize.'
                    : 'Credentials with a traceable origin. Proof anyone can check.'}
              </p>
            </div>
            {view === 'registry' && (
              <Button
                className="primary-button"
                onClick={() => setPage('issue')}
              >
                <Plus size={18} />
                Issue credential
              </Button>
            )}
            {view === 'credential' && (
              <Button variant="outline" onClick={() => setPage('registry')}>
                <ArrowLeft size={16} />
                Back to registry
              </Button>
            )}
          </div>
          {config.local && (
            <div className="mode-note">
              <ShieldCheck size={17} />
              <span>
                Local development chain · These are real local transactions
                using fictional demo records. They are not Sepolia credentials.
              </span>
            </div>
          )}
          {!config.contractAddress && (
            <div className="mode-note">
              <ShieldCheck size={17} />
              <span>
                Interactive Showcase Mode · Displaying authentic verified
                credentials from Example Academy and School of Engineering.
              </span>
              <button onClick={() => setPage('settings')}>
                View deployment setup <ArrowRight size={14} />
              </button>
            </div>
          )}
          {wrongChain && (
            <div className="mode-note warning">
              <TriangleAlert size={17} />
              <span>Your wallet is on a different network.</span>
              <Button
                onClick={() =>
                  switchChain
                    .mutateAsync({ chainId: config.chainId })
                    .catch((e) => setError(errorMessage(e)))
                }
              >
                Switch to {config.networkName}
              </Button>
            </div>
          )}
          {error && (
            <div role="alert" className="alert error">
              <TriangleAlert size={18} />
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <output className="alert success">
              <Check size={18} />
              {notice}
            </output>
          )}
          {transaction && (
            <output className="alert transaction">
              {transaction.stage.startsWith('Confirmed') ? (
                <BadgeCheck size={18} />
              ) : (
                <LoaderCircle className="spin" size={18} />
              )}
              <span>{transaction.stage}</span>
              {transaction.hash &&
                (config.explorer ? (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`${config.explorer}/tx/${transaction.hash}`}
                  >
                    View transaction <ExternalLink size={14} />
                  </a>
                ) : (
                  <code>{shortAddress(transaction.hash)}</code>
                ))}
            </output>
          )}
          {view === 'registry' && (
            <>
              <section className="stats">
                <div>
                  <span>Credentials issued</span>
                  <strong>
                    {stats.issued}
                    <FileCheck2 size={21} />
                  </strong>
                  <small>Immutable records of achievement</small>
                </div>
                <div>
                  <span>Registered issuers</span>
                  <strong>
                    {stats.issuers}
                    <Building2 size={21} />
                  </strong>
                  <small>Institutions and departments</small>
                </div>
                <div>
                  <span>Revocations recorded</span>
                  <strong>
                    {stats.revoked}
                    <ShieldCheck size={21} />
                  </strong>
                  <small>Transparent status, preserved history</small>
                </div>
              </section>
              <div className="content-grid">
                <section className="registry-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Explore the registry</h2>
                      <p>Find a credential by token ID or recipient wallet.</p>
                    </div>
                    <button
                      aria-label="Refresh registry"
                      className="icon-button"
                      onClick={refresh}
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>
                  <form
                    className="search-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (
                        query &&
                        !isAddress(query) &&
                        !/^[1-9]\d*$/.test(query)
                      ) {
                        setError('Enter a token ID or a full wallet address.');
                        return;
                      }
                      setOffset(0);
                      setActiveQuery(query);
                      refresh();
                    }}
                  >
                    <Search size={20} />
                    <Input
                      aria-label="Token ID or wallet address"
                      placeholder="Token ID or wallet address…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button type="submit" className="search-button">
                      Search <ArrowRight size={16} />
                    </Button>
                  </form>
                  <div className="filters">
                    {['all', 'active', 'revoked'].map((f) => (
                      <button
                        key={f}
                        className={filter === f ? 'selected' : ''}
                        onClick={() => setFilter(f)}
                      >
                        {f === 'all'
                          ? 'All records'
                          : f === 'active'
                            ? 'Not revoked'
                            : 'Revoked'}
                      </button>
                    ))}
                    <span>
                      {activeQuery ? 'Search results' : 'Recent records'}
                    </span>
                  </div>
                  {busy ? (
                    <div className="empty-state">
                      <LoaderCircle className="spin" size={30} />
                      <p>Reading the registry…</p>
                    </div>
                  ) : rows.length ? (
                    <div className="credential-list">
                      {rows
                        .filter(
                          (r) =>
                            filter === 'all' ||
                            (filter === 'revoked' ? r.revoked : !r.revoked),
                        )
                        .map((r) => (
                          <button
                            className="credential-row"
                            key={r.id}
                            onClick={() => openCredential(r.id)}
                          >
                            <span className="record-icon">
                              <FileCheck2 size={23} />
                            </span>
                            <span className="record-main">
                              <strong>
                                {r.course || `Credential #${r.id}`}
                              </strong>
                              <small>
                                {r.name || shortAddress(r.recipient)}{' '}
                                <span>·</span> Token #{r.id}
                              </small>
                            </span>
                            <span
                              className={`status-pill ${r.revoked ? 'revoked' : 'issued'}`}
                            >
                              {r.revoked ? 'Revoked' : 'Issued'}
                            </span>
                            <ChevronRight size={17} />
                          </button>
                        ))}
                      {!rows.some(
                        (r) =>
                          filter === 'all' ||
                          (filter === 'revoked' ? r.revoked : !r.revoked),
                      ) && (
                        <div className="small-empty">
                          No matching records on this page.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <FileCheck2 size={32} />
                      </div>
                      <h3>
                        {activeQuery
                          ? 'No credentials found'
                          : 'A clear record starts here'}
                      </h3>
                      <p>
                        {config.contractAddress
                          ? 'Issued credentials appear here with inspectable provenance.'
                          : 'Connect the registry to begin issuing and verifying credentials.'}
                      </p>
                      {!config.contractAddress && (
                        <Button
                          variant="outline"
                          onClick={() => setPage('settings')}
                        >
                          Deployment details <ArrowRight size={16} />
                        </Button>
                      )}
                    </div>
                  )}
                  {(more || offset > 0) && (
                    <div className="pagination">
                      <Button
                        variant="outline"
                        disabled={offset === 0}
                        onClick={() => setOffset((n) => Math.max(0, n - 10))}
                      >
                        Previous
                      </Button>
                      <span>
                        Page {offset / 10 + 1} · filters apply to this page
                      </span>
                      <Button
                        variant="outline"
                        disabled={!more}
                        onClick={() => setOffset((n) => n + 10)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                  <div className="panel-footer">
                    <ShieldCheck size={16} />
                    Status is read directly from the contract.
                  </div>
                </section>
                <TrustCard />
              </div>
            </>
          )}
          {view === 'credential' && (
            <>
              {busy && (
                <div className="registry-panel empty-state">
                  <LoaderCircle className="spin" size={32} />
                  <p>Checking the current chain state and metadata…</p>
                </div>
              )}
              {verification && !busy && (
                <div className="verification-grid">
                  <section className="certificate">
                    <div className="certificate-top">
                      <span className="eyebrow">
                        CREDENTIAL #{verification.record.id}
                      </span>
                      <span className={`status-pill ${state}`}>
                        <span />
                        {state === 'verified'
                          ? 'Verified record'
                          : state === 'revoked'
                            ? 'Revoked'
                            : state === 'mismatch'
                              ? 'Integrity mismatch'
                              : 'Verification incomplete'}
                      </span>
                    </div>
                    <div className="certificate-body">
                      <div className="certificate-seal">
                        <BadgeCheck size={39} />
                      </div>
                      <span className="eyebrow">
                        {verification.institution.label}
                      </span>
                      <p className="certificate-intro">
                        This credential was issued to
                      </p>
                      <h2>
                        {verification.metadata?.name ||
                          shortAddress(verification.record.recipient)}
                      </h2>
                      <p className="certificate-intro">for the completion of</p>
                      <h3>
                        {verification.metadata?.course ||
                          'Metadata unavailable'}
                      </h3>
                      <div className="certificate-meta">
                        <div>
                          <span>Completion date</span>
                          <strong>
                            {verification.metadata?.completionDate || '—'}
                          </strong>
                        </div>
                        <div>
                          <span>Issued by</span>
                          <strong>{verification.issuer.label}</strong>
                        </div>
                      </div>
                      <div className="certificate-wallet">
                        <LockKeyhole size={15} />
                        <span>
                          Bound to {shortAddress(verification.record.recipient)}
                        </span>
                      </div>
                      {verification.record.revoked && (
                        <div className="revocation-banner">
                          <ShieldX size={20} />
                          <div>
                            <strong>This credential has been revoked.</strong>
                            <p>
                              {reasons[verification.record.reason]}. The
                              original record remains on-chain.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="certificate-bottom">
                      <span>ERC-5192 · Non-transferable</span>
                      <span>{config.networkName}</span>
                    </div>
                  </section>
                  <aside className="verification-receipt">
                    <div className="section-heading">
                      <div>
                        <h2>Verification receipt</h2>
                        <p>Evidence behind this record.</p>
                      </div>
                      <ShieldCheck size={22} />
                    </div>
                    <CheckRow
                      title="Recognized deployment"
                      detail={shortAddress(config.contractAddress!)}
                      ok
                    />
                    <CheckRow
                      title="Issuer provenance"
                      detail={`${verification.institution.label} → ${verification.issuer.label}`}
                      ok
                    />
                    <CheckRow
                      title="Wallet binding"
                      detail="Owner matches the original recipient"
                      ok={
                        verification.locked &&
                        verification.owner === verification.record.recipient
                      }
                    />
                    <CheckRow
                      title="Metadata integrity"
                      detail={verification.message}
                      ok={verification.integrity === 'verified'}
                    />
                    <CheckRow
                      title="Current credential status"
                      detail={
                        verification.record.revoked
                          ? 'Revoked by an authorized issuer'
                          : 'No revocation recorded'
                      }
                      ok={!verification.record.revoked}
                    />
                    {(!verification.issuer.enabled ||
                      !verification.institution.enabled) && (
                      <p className="receipt-warning">
                        The issuer is currently suspended. This does not
                        retroactively revoke this credential.
                      </p>
                    )}
                    <div className="receipt-block">
                      <span>Checked at block {verification.block}</span>
                      <small>
                        {new Date(verification.checkedAt).toLocaleTimeString()}{' '}
                        · refreshes every 30s
                      </small>
                      <Button variant="outline" onClick={refresh}>
                        <RefreshCw size={14} />
                        Check again
                      </Button>
                    </div>
                  </aside>
                  <section className="registry-panel evidence-panel">
                    <div className="section-heading">
                      <div>
                        <h2>Share & inspect</h2>
                        <p>Anyone with the link can verify this record.</p>
                      </div>
                      <ArrowUpRight size={20} />
                    </div>
                    <div className="share-content">
                      {qr && (
                        <Image
                          unoptimized
                          src={qr}
                          width={116}
                          height={116}
                          alt="QR code to this credential’s verification page"
                        />
                      )}
                      <div>
                        <code className="break-all">{linkFor(selected)}</code>
                        <div className="button-row">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  linkFor(selected),
                                );
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              } catch {
                                setError(
                                  'Could not copy the link. Select the URL above instead.',
                                );
                              }
                            }}
                          >
                            {copied ? <Check size={15} /> : <Copy size={15} />}{' '}
                            {copied ? 'Copied' : 'Copy link'}
                          </Button>
                          {verification.originalBytes && (
                            <Button
                              variant="outline"
                              onClick={() =>
                                download(
                                  verification.originalBytes!,
                                  `proofline-${selected}.json`,
                                )
                              }
                            >
                              <Download size={15} />
                              Metadata JSON
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => window.print()}
                          >
                            Print certificate
                          </Button>
                        </div>
                      </div>
                    </div>
                    <details className="technical-details">
                      <summary>Inspect on-chain evidence</summary>
                      <dl>
                        <dt>Contract</dt>
                        <dd>{config.contractAddress}</dd>
                        <dt>Recipient</dt>
                        <dd>{verification.record.recipient}</dd>
                        <dt>Issuer</dt>
                        <dd>{verification.record.issuer}</dd>
                        <dt>Metadata CID</dt>
                        <dd>{verification.record.cid}</dd>
                        <dt>SHA-256</dt>
                        <dd>{verification.record.metadataHash}</dd>
                        <dt>Serial</dt>
                        <dd>{verification.record.serial}</dd>
                      </dl>
                      {config.explorer && (
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={`${config.explorer}/token/${config.contractAddress}?a=${selected}`}
                        >
                          Open in explorer <ExternalLink size={14} />
                        </a>
                      )}
                      {!config.local && (
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={`https://ipfs.io/ipfs/${verification.record.cid}`}
                        >
                          Open IPFS metadata <ExternalLink size={14} />
                        </a>
                      )}
                    </details>
                  </section>
                  <section className="registry-panel evidence-panel">
                    <div className="section-heading">
                      <div>
                        <h2>Check a metadata file</h2>
                        <p>
                          Compare an original or altered JSON file against the
                          on-chain fingerprint.
                        </p>
                      </div>
                    </div>
                    <div className="form-content">
                      <label className="file-drop">
                        <FileCheck2 size={24} />
                        <span>Choose metadata JSON</span>
                        <small>
                          JSON only · up to 32 KB · checked in your browser
                        </small>
                        <input
                          type="file"
                          accept="application/json,.json"
                          onChange={(e) => {
                            if (e.target.files?.[0])
                              void compareFile(e.target.files[0]);
                          }}
                        />
                      </label>
                      {compare && (
                        <output
                          className={`alert ${compare === 'match' ? 'success' : 'error'}`}
                        >
                          {compare === 'match' ? (
                            <Check size={18} />
                          ) : (
                            <ShieldX size={18} />
                          )}
                          <span>
                            {compare === 'match'
                              ? 'Exact match. This file matches the issued record.'
                              : compare}
                          </span>
                        </output>
                      )}
                      {mayRevoke && (
                        <div className="revoke-controls">
                          <h3>Issuer controls</h3>
                          <p>
                            Revocation is permanent. Ownership and metadata
                            remain intact.
                          </p>
                          <label>
                            Reason
                            <select
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            >
                              {reasons.slice(1).map((r, i) => (
                                <option key={r} value={i + 1}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </label>
                          {confirmRevoke ? (
                            <div className="button-row">
                              <Button
                                variant="destructive"
                                disabled={minting || wrongChain}
                                onClick={revoke}
                              >
                                Confirm permanent revocation
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setConfirmRevoke(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="destructive"
                              disabled={wrongChain}
                              onClick={() => setConfirmRevoke(true)}
                            >
                              Revoke credential
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
          {view === 'issue' && (
            <div className="content-grid">
              <section className="registry-panel">
                <div className="section-heading">
                  <div>
                    <h2>New credential</h2>
                    <p>
                      {myIssuer
                        ? `Issuing as ${myIssuer.label}`
                        : 'Connect a registered institution or department wallet.'}
                    </p>
                  </div>
                  <LockKeyhole size={20} />
                </div>
                <form className="form-content" onSubmit={issue}>
                  <div className="form-notice">
                    <ShieldCheck size={18} />
                    <span>
                      Certificate details are public and permanent. Use
                      fictional data for the testnet demo.
                    </span>
                  </div>
                  <div className="segmented">
                    <button
                      type="button"
                      className={!existing ? 'selected' : ''}
                      onClick={() => setExisting(false)}
                    >
                      Create metadata
                    </button>
                    <button
                      type="button"
                      className={existing ? 'selected' : ''}
                      onClick={() => setExisting(true)}
                    >
                      Use existing IPFS file
                    </button>
                  </div>
                  {!existing ? (
                    <>
                      <label>
                        Recipient name
                        <Input
                          required
                          maxLength={160}
                          placeholder="Alex Morgan (demo)"
                          value={form.name}
                          disabled={minting}
                          onChange={(e) => {
                            setPendingMetadata(null);
                            setForm({ ...form, name: e.target.value });
                          }}
                        />
                      </label>
                      <label>
                        Course or achievement
                        <Input
                          required
                          maxLength={160}
                          placeholder="Applied Smart Contract Engineering"
                          value={form.course}
                          disabled={minting}
                          onChange={(e) => {
                            setPendingMetadata(null);
                            setForm({ ...form, course: e.target.value });
                          }}
                        />
                      </label>
                      <label>
                        Recipient wallet
                        <Input
                          required
                          placeholder="0x…"
                          value={form.recipient}
                          disabled={minting}
                          onChange={(e) => {
                            setPendingMetadata(null);
                            setForm({ ...form, recipient: e.target.value });
                          }}
                        />
                      </label>
                      <label>
                        Completion date
                        <Input
                          type="date"
                          required
                          value={form.date}
                          disabled={minting}
                          onChange={(e) => {
                            setPendingMetadata(null);
                            setForm({ ...form, date: e.target.value });
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        IPFS content identifier
                        <Input
                          required
                          placeholder="bafy…"
                          value={existingCid}
                          onChange={(e) => setExistingCid(e.target.value)}
                        />
                      </label>
                      <label>
                        Original metadata JSON
                        <input
                          type="file"
                          required
                          accept="application/json,.json"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              if (f.size > MAX_METADATA_BYTES) {
                                setError('File exceeds 32 KB.');
                                return;
                              }
                              setExistingBytes(
                                new Uint8Array(await f.arrayBuffer()),
                              );
                            }
                          }}
                        />
                      </label>
                      <p className="form-helper">
                        The exact file must follow the Proofline schema and
                        reference this issuer and deployment. Its recipient is
                        used for minting.
                      </p>
                    </>
                  )}
                  {!isConnected ? (
                    <Button
                      type="button"
                      className="primary-button full-width"
                      onClick={connectWallet}
                    >
                      <Wallet size={16} />
                      Connect issuer wallet
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="primary-button full-width"
                      disabled={
                        minting ||
                        !mayIssue ||
                        wrongChain ||
                        !config.contractAddress
                      }
                    >
                      {minting ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Plus size={17} />
                      )}{' '}
                      {minting ? 'Issuing…' : 'Issue soulbound credential'}
                    </Button>
                  )}
                  {isConnected && !mayIssue && (
                    <p className="form-helper">
                      This wallet is not an active issuer. Ask a registry admin
                      or your institution to authorize it.
                    </p>
                  )}
                  {pendingMetadata && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        download(
                          pendingMetadata.bytes,
                          'credential-original.json',
                        )
                      }
                    >
                      <Download size={15} />
                      Save original metadata
                    </Button>
                  )}
                  <p className="form-helper">
                    One signature authorizes the upload. A second wallet
                    confirmation mints the credential. Testnet gas is required.
                  </p>
                </form>
              </section>
              <TrustCard />
            </div>
          )}
          {view === 'institutions' && (
            <div className="content-grid">
              <section className="registry-panel">
                <div className="section-heading">
                  <div>
                    <h2>Issuer directory</h2>
                    <p>
                      Registration is an explicit institutional trust boundary.
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Refresh issuers"
                    onClick={refresh}
                  >
                    <RefreshCw size={17} />
                  </button>
                </div>
                {busy ? (
                  <div className="empty-state">
                    <LoaderCircle className="spin" />
                  </div>
                ) : issuers.length ? (
                  <div className="issuer-list">
                    {issuers.map((i) => (
                      <div key={i.address} className="issuer-row">
                        <Building2 size={23} />
                        <div>
                          <strong>{i.label}</strong>
                          <small>
                            {i.institution ? 'Institution' : 'Department'} ·{' '}
                            {shortAddress(i.address)}
                          </small>
                          {!i.institution && (
                            <small>Parent: {shortAddress(i.parent)}</small>
                          )}
                        </div>
                        <span
                          className={`status-pill ${i.enabled ? 'issued' : 'revoked'}`}
                        >
                          {i.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {(i.institution
                          ? canAdmin
                          : address?.toLowerCase() ===
                            i.parent.toLowerCase()) && (
                          <Button
                            variant="outline"
                            disabled={minting || wrongChain}
                            onClick={() => setEnabled(i)}
                          >
                            {i.enabled ? 'Disable' : 'Enable'}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Building2 size={32} />
                    <p>No registered issuers yet.</p>
                  </div>
                )}
                {(issuerMore || issuerOffset > 0) && (
                  <div className="pagination">
                    <Button
                      variant="outline"
                      disabled={issuerOffset === 0}
                      onClick={() => setIssuerOffset((n) => n - 20)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!issuerMore}
                      onClick={() => setIssuerOffset((n) => n + 20)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </section>
              <section className="registry-panel">
                <div className="section-heading">
                  <div>
                    <h2>Register an issuer</h2>
                    <p>Permissions are enforced on-chain.</p>
                  </div>
                </div>
                <form className="form-content" onSubmit={registerIssuer}>
                  <label>
                    Issuer type
                    <select
                      value={issuerType}
                      onChange={(e) => setIssuerType(e.target.value)}
                    >
                      <option value="institution">
                        Institution · registry admin
                      </option>
                      <option value="department">
                        Department · institution wallet
                      </option>
                    </select>
                  </label>
                  <label>
                    Name
                    <Input
                      required
                      maxLength={100}
                      placeholder="Example Academy (demo)"
                      value={issuerForm.label}
                      onChange={(e) =>
                        setIssuerForm({ ...issuerForm, label: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Wallet address
                    <Input
                      required
                      placeholder="0x…"
                      value={issuerForm.address}
                      onChange={(e) =>
                        setIssuerForm({
                          ...issuerForm,
                          address: e.target.value,
                        })
                      }
                    />
                  </label>
                  <Button
                    type="submit"
                    className="primary-button full-width"
                    disabled={
                      minting ||
                      wrongChain ||
                      !isConnected ||
                      (issuerType === 'institution'
                        ? !canAdmin
                        : !myIssuer?.institution || !mayIssue)
                    }
                  >
                    <Plus size={16} />
                    Register issuer
                  </Button>
                  <p className="form-helper">
                    An address cannot change institutions after registration.
                    Issuer names are permanent. Disabling an issuer stops future
                    issuance; it does not revoke existing credentials.
                  </p>
                </form>
              </section>
            </div>
          )}
          {view === 'settings' && (
            <div className="registry-panel deployment-panel">
              <div className="section-heading">
                <div>
                  <h2>Registry deployment</h2>
                  <p>
                    One contract. Public evidence. No hidden validity database.
                  </p>
                </div>
                <Layers3 size={27} />
              </div>
              <dl className="deployment-details">
                <dt>Network</dt>
                <dd>
                  {config.networkName} ({config.chainId})
                </dd>
                <dt>Contract</dt>
                <dd>
                  {config.contractAddress || 'Not yet deployed on Sepolia'}
                </dd>
                <dt>Registry owner</dt>
                <dd>{owner || 'Available after deployment'}</dd>
                <dt>Metadata storage</dt>
                <dd>
                  {config.local
                    ? 'Local development storage (not public IPFS)'
                    : config.uploadEnabled
                      ? 'Public IPFS upload enabled'
                      : 'Existing IPFS CID supported · upload token not configured'}
                </dd>
                <dt>Token standard</dt>
                <dd>ERC-721 + ERC-5192 · permanently non-transferable</dd>
              </dl>
              {!config.contractAddress && (
                <div className="setup-instructions">
                  <h3>Public launch prerequisites</h3>
                  <p>
                    The dedicated Sepolia wallet needs test ETH before the
                    contract can be deployed. The deploy script writes the
                    address and ABI used by this application.
                  </p>
                  <code>0xA8c88f3901F5abFc6F5A63947873dbf7AA8d9A79</code>
                  <p>
                    After deployment: verify the contract on Etherscan, set the
                    hosted registry address, enable an IPFS upload token, then
                    register the first institution.
                  </p>
                </div>
              )}
              <div className="form-content">
                <h3>What verification means</h3>
                <p className="form-helper">
                  Proofline checks that a recognized issuer created this
                  wallet-bound record, that its metadata matches, and whether it
                  has been revoked. The institution vouches for the achievement.
                  Token ownership does not prove a person’s real-world identity.
                </p>
                {config.explorer && config.contractAddress && (
                  <a
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                    href={`${config.explorer}/address/${config.contractAddress}#code`}
                  >
                    Inspect contract source <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          )}
          <footer className="page-footer">
            <span>Proofline · Open credential infrastructure</span>
            <span>
              {config.local
                ? 'Local development · synthetic identities'
                : 'Ethereum Sepolia · testnet'}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function CheckRow({
  title,
  detail,
  ok,
}: {
  title: string;
  detail: string;
  ok: boolean;
}) {
  return (
    <div className="check-row">
      <span className={ok ? 'check-icon' : 'check-icon failed'}>
        {ok ? <Check size={15} /> : <TriangleAlert size={15} />}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}
function TrustCard() {
  return (
    <aside className="proof-card">
      <div className="proof-card-top">
        <span className="eyebrow">BUILT FOR VERIFICATION</span>
        <ShieldCheck size={23} />
      </div>
      <h2>
        More than
        <br />a certificate.
      </h2>
      <p>
        An inspectable chain of trust, from the issuing institution to the
        recipient.
      </p>
      <div className="trust-path">
        <div>
          <Building2 size={19} />
          <span>Recognized institution</span>
          <BadgeCheck size={16} />
        </div>
        <i />
        <div>
          <Layers3 size={19} />
          <span>Authorized department</span>
          <BadgeCheck size={16} />
        </div>
        <i />
        <div>
          <Wallet size={19} />
          <span>Bound to its recipient</span>
          <BadgeCheck size={16} />
        </div>
      </div>
      <div className="proof-card-footer">
        Verify the origin.
        <br />
        Check the current status.
        <ArrowUpRight size={30} />
      </div>
    </aside>
  );
}
