# Proofline

Wallet-bound credentials with independently inspectable issuer provenance, metadata integrity and revocation. Built for HackBlox 2026, Web3 problem 02: Soulbound Certificates.

## What works

- One non-upgradeable ERC-721 / ERC-5192 contract. Transfers, approvals and burns are blocked.
- Registry owner approves institutions; institutions approve departments. A disabled parent blocks future issuance by its departments.
- Authorized issuers mint credentials containing an IPFS CID and an immutable SHA-256 fingerprint of the exact metadata bytes.
- Public wallet/token lookup, issuer hierarchy, QR verification links, printable certificates and local-file tamper comparison.
- Issuer or parent can revoke without erasing the original recipient, metadata or issuance history.
- Wallet signatures authorize bounded metadata uploads; the server checks the live issuer registry before pinning.

**Current delivery status:** the local chain and integration workflow work. Sepolia deployment is pending test ETH; `deployments/sepolia.json` intentionally has no address until deployment succeeds. Public IPFS pinning needs a server-side Pinata token, or a previously pinned file supplied through the existing-CID flow. Local metadata storage is explicitly labelled and is not IPFS. Do not submit a private preview as the public testnet demo.

## Run locally

Requires Node.js 22.13+ and npm. The lockfile pins dependencies; Foundry binaries are installed through npm.

```sh
npm ci
npm run compile:contract
npm run chain
```

In another terminal:

```sh
npm run deploy:local
npm run dev -- --host 0.0.0.0
```

Open http://localhost:3000. The seed creates three synthetic credentials; token 3 is revoked. `deployments/local-roles.json` lists the four development role addresses. Local deployment writes `.env.local`; preserve any custom environment settings before reseeding. A fresh Anvil process starts an empty chain and needs another local deployment.

Anvil uses its standard public development mnemonic, which is already present in the local-only scripts. Use these accounts exclusively on chain 31337. For wallet UI testing, add RPC `http://127.0.0.1:8545`, chain ID `31337`, currency ETH, then use the matching development role account. No wallet is required for reading credentials.

## Validate

```sh
npm run test:contract
npm run test:verify
npm run typecheck
npm run lint
npm run build
# Requires seeded Anvil and the development server:
npm run test:integration
```

The integration test uses synthetic data, mints a new local credential and revokes it. The contract suite covers transfer overloads, approvals, authorization, hierarchy, duplicate serials, suspension, revocation, receiver reentrancy/rollback and two-step administration. Metadata tests cover tampering, provenance and byte limits. These checks are not an independent security audit.

## Sepolia deployment

1. Run `npm run wallet:setup`. This creates `.secrets/deployer.json` with restrictive permissions and prints only the public address. Back up this local key securely; it controls the registry. Never commit or paste it into a website.
2. Fund the printed address with Sepolia test ETH; allow approximately 0.01 test ETH for deployment and setup. The script requires at least 0.005 and refuses to redeploy over an existing Sepolia manifest.
3. Run `npm run compile:contract`, then `npm run deploy:sepolia`. Optional `SEPOLIA_RPC_URL` is used only by the deployment script. The script checks the network and writes the transaction/address to `deployments/sepolia.json` after confirmation.
4. Verify source at the Sepolia explorer using `contracts/out/standard-input.json`, Solidity `v0.8.36+commit.8a079791`, contract `ProoflineCredential.sol:ProoflineCredential`, optimizer 200, EVM Cancun. Obtain the exact installed compiler version with `node -e "import('solc').then(m=>console.log(m.default.version()))"`; use that value if it differs from the example. Constructor argument is the ABI-encoded owner address. Use the standard-JSON input, including all imports, rather than manually flattened code.
5. Rebuild after the manifest changes. Optionally override the address/block with the environment settings in `.env.example`. The production build always uses Sepolia and ignores local-chain address/RPC settings.
6. Set `PINATA_JWT` as a server secret and `APP_ORIGIN` to the exact hosted origin. Never expose a secret RPC key through `SEPOLIA_PUBLIC_RPC_URL`, which the browser receives. Without the Pinata token, externally pin the exact JSON, retain its bytes and use **Existing IPFS CID**.
7. Register an institution from the owner wallet, then a department from the institution wallet. Use synthetic names for the public demonstration. Transfer ownership via `transferOwnership` / `acceptOwnership` if another wallet should administer the registry.
8. Repeat issuance, verification, tamper and revocation checks on Sepolia. Publish the frontend and source publicly before submitting. The private Sites source repository is not the required public GitHub repository.

## Design and trust boundaries

The chain is the status database. A verifier reads owner, issuer hierarchy and revocation at one block, downloads at most 32 KB from IPFS gateways, hashes the exact bytes, then checks recipient, issuer, institution, serial, chain and contract bindings. A reserialized JSON file has a different fingerprint. A CID is a content reference, not a substitute for the independent fingerprint check.

Disabling an issuer blocks future issuance; existing credentials remain valid unless explicitly revoked. Revocation is permanent. The registry owner vets institutions; the software does not prove that an institution is legitimate or that a student actually completed a course. Wallet ownership is not real-world identity. Metadata is public; do not put private student records into the demo.

See [SECURITY.md](SECURITY.md), [DEMO.md](DEMO.md), and [SUBMISSION.md](SUBMISSION.md). The original research and implementation plan are in the parent Hackblox workspace. No claim of W3C Verifiable Credentials or Blockcerts compatibility is made.

## Stack

Solidity, OpenZeppelin, Foundry, React, TypeScript, viem, wagmi, vinext/Vite, Cloudflare Workers and Pinata/IPFS. The interface uses shadcn primitives and Lucide icons. Dependencies retain their own licenses.
