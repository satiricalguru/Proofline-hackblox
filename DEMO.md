# Three-minute judging walkthrough

Use the real Sepolia deployment for the submitted video. The local demonstration is a development fallback and must be labelled as such. Prepare an issuer wallet, recipient wallet, an active credential, its exact metadata JSON, and a copy with a changed course name. Use synthetic names.

| Time | Show | Say |
|---|---|---|
| 0:00–0:20 | Registry and an active credential | “A certificate image is easy to copy. Proofline lets an employer inspect who issued a wallet-bound credential and whether the issuer has revoked it.” |
| 0:20–0:45 | Institutions view | “The registry approves institutions. Institutions authorize departments. The contract checks this hierarchy when issuing.” |
| 0:45–1:15 | Issue form, wallet confirmation, receipt | “The issuer publishes metadata to IPFS. We store its CID and a separate fingerprint on-chain, then mint a permanently non-transferable credential.” |
| 1:15–1:45 | QR link in a second browser, disconnected wallet | “Anyone can verify without connecting a wallet. This receipt checks the recognized deployment, issuer, recipient, metadata bytes and current revocation state.” |
| 1:45–2:10 | Compare altered JSON | “Changing the course name breaks the fingerprint. An unavailable file is reported as unavailable, never as verified.” |
| 2:10–2:35 | Revoke from issuer, refresh public receipt | “Revocation changes status while preserving the original record. Disabling a department blocks future issuance separately.” |
| 2:35–3:00 | Explorer source, tests, public repository | “Transfers, approvals, unauthorized actions and receiver reentrancy are tested. The institution remains responsible for the achievement claim; the chain makes that claim inspectable.” |

Keep transaction links ready if a wallet/RPC is slow. Show existing confirmed receipts while explaining the delay honestly. Do not edit the video to imply a pending transaction confirmed. The code suite is evidence for transfer rejection; a separate owner transfer attempt against the deployed contract is stronger live evidence if time allows.

## Local rehearsal

Start Anvil, run the local deployment script, then start the app. Token 1 is active; token 3 is revoked. Search by the recipient in `deployments/local-roles.json`. Download token 1's metadata, change one character and use the compare control. `npm run test:integration` exercises a fresh signed upload, mint and revocation against the running local API and real local EVM.

## Before recording

- Verify all roles and balances; pre-register the synthetic institution and department.
- Pin at least one active and one revoked sample and confirm their public URLs from another browser.
- Confirm the submitted frontend is public, the contract is explorer-verified and QR URLs use the public origin.
- Open the public source repository and latest successful checks.
- Record a readable 2–3 minute video with the final testnet contract visible.
