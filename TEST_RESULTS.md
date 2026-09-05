# Verification record — 5 September 2026

Checks executed on the developer machine. These results establish local behavior, not completion of the public testnet submission.

| Check | Result |
|---|---|
| Foundry contract suite | 17 passed, including 256 fuzz runs |
| Metadata and production configuration suite | 13 passed |
| Local signed-upload / mint / verify / tamper / revoke integration | All eight checks passed |
| TypeScript | Passed |
| Oxlint | Passed |
| Production build | Passed |
| Production Worker configuration endpoint | Sepolia 11155111; local=false; no local RPC/address exposed |
| npm dependency audit after updates | Zero known vulnerabilities reported at installation time |
| Explorer standard-JSON input | Self-contained import graph reproduces deployment bytecode |
| Optional WebMCP | Registration inspected; token 1 verified; token 3 revoked with matching metadata; token 0 intentionally rejected; UI receipts read back |

Latest integration run minted local token 5, then revoked it. Mint transaction: `0x1fe1d297252bb71438b4f33ff89e3ecfe3234a9d5d277f6608002b6adc33a8ef`. Revocation transaction: `0xfbfbe40591d53c27e433358b39fdf39b0dd4607703aa288a3d5ffe304b9a8667`. These are Anvil transactions, not explorer-addressable Sepolia transactions. Local upload data is transient; static seed records 1–3 support repeatable read demonstrations.

Not yet performed: funded Sepolia deployment, explorer verification, production Pinata upload, public-service end-to-end verification, injected-wallet browser issuance/rejection/replacement walkthrough, comprehensive responsive visual/accessibility audit, or final video/submission. Build warnings include a large wallet/client chunk and a future Vite JSON-import compatibility notice; neither prevents this build.
