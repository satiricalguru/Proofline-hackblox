# Security model and limitations

Proofline is a hackathon prototype, not audited production credential infrastructure.

## Contract invariants

- Token recipient and metadata are immutable after issuance. All ERC-721 transfer overloads, approvals and burns are blocked.
- An enabled institution may issue directly or register departments. A department requires both its own and its parent's enabled status to issue.
- Issuer parentage is immutable; addresses cannot be registered again under another parent. A serial can be used only once per issuer, including after revocation.
- Only the enabled original issuer or enabled parent institution may revoke. The root owner does not have an unrelated-issuer override. Revocation cannot be reversed.
- State and indexes are written before safe-mint callbacks. Mutations are non-reentrant; rejected callbacks roll the transaction back.
- Administrative ownership uses a two-step handoff. Renouncing ownership is disabled.

## Verifier and upload boundaries

The verifier recognizes one configured chain and contract. QR/deep links with a different deployment fail. Same-block reads avoid mixing chain status across calls. IPFS content is treated as untrusted, size-limited and checked against both the on-chain SHA-256 and provenance fields. No HTML from metadata is rendered. Public gateways and RPC remain availability/trust dependencies; this is not a light-client proof verifier. Thirty-second refreshes are not a guarantee of instantaneous revocation or chain finality.

Metadata uploads bind a wallet signature to exact bytes, origin, chain, contract and an expiry no more than five minutes away. The server verifies issuer status and parentage. Request bodies are bounded to 50 KB; metadata to 32 KB. The per-issuer upload quota and deduplication caches are in-memory and reset across worker instances/restarts. They are cost controls, not durable global abuse prevention. A failed pin can consume quota. Add durable rate limits, provider budgets and monitoring before production use.

Public metadata cannot reliably be deleted. Use synthetic identities. Tokens have no recipient consent or recovery mechanism. Loss of a holder key does not allow transfer; revoke and reissue to a new address under an institution's external identity process. Loss of the administrator key requires the operational backup/handoff process. An enabled compromised issuer can issue false achievements; suspend the issuer and inspect/revoke affected records.

Local development uses intentionally public Anvil keys and transient upload storage. These keys are never used for Sepolia. The dedicated testnet owner key is stored outside source in `.secrets/` and must be backed up by the operator. Testnet assets have no intended monetary value.

## Known verification gaps

Public Sepolia receipts, explorer source verification, the production Pinata path and a real injected-wallet browser walkthrough remain pending until deployment credentials/funding are configured. Optional WebMCP integration is feature-detected; unsupported browsers retain the normal UI. Record actual test results in the submission, without presenting unperformed checks as passes.
