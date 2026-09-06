# HackBlox delivery checklist

Selected statement: **Web3 02 — Soulbound Certificates**. Track eligibility remains a participant/organizer fact; choosing this build does not establish permission to switch tracks.

Official references: [problem statements](https://www.hackblox.xyz/problem-statements), [Web3 rulebook](https://www.hackblox.xyz/web3-hackathon-problem-statements.pdf). The research snapshot in the parent workspace records the published freeze as **6 September 2026, 10:00 IST**. Follow any newer finalist announcement.

## Completed implementation

- Non-transferable token, approved issuers, metadata reference/fingerprint, wallet/token verification and mint dashboard.
- All three listed stretch features: revocation, verification QR and issuer hierarchy.
- Contract and metadata tests, local end-to-end integration, reproducible scripts and security notes.

## Required before final submission

- [x] Confirm Web3 eligibility and retrieve the official RDM submission URL from finalist instructions.
- [ ] Fund and deploy on Sepolia; preserve deployment receipt (`npm run deploy:sepolia`).
- [ ] Verify complete contract source on the explorer.
- [ ] Configure production IPFS pinning or use successfully retrieved existing CIDs.
- [x] Publish source on GitHub (`https://github.com/satiricalguru/Proofline-hackblox.git` - Private with `Rishikesh-Jadhav` invited).
- [x] Publish a public frontend on GitHub Pages (https://satiricalguru.github.io/Proofline-hackblox/).
- [ ] Repeat the full demo against public services with an injected wallet.
- [x] Record and produce demo walkthrough video (saved in docs/demo-walkthrough.mp4 with young Indian male voice narration).
- [x] Retain required Round 1 CORSAIR PR/qualification evidence.
- [x] Tag/finalize the repository before code freeze (September 6, 10:00 AM IST); do not make post-freeze changes.

Team: Team Rize  
Member: Jatin Pandey (Solo)  
GitHub Repo: https://github.com/satiricalguru/Proofline-hackblox  
Sepolia contract/explorer: pending (funded deployer required: 0xA8c88f3901F5abFc6F5A63947873dbf7AA8d9A79)  
Public demo URL: https://satiricalguru.github.io/Proofline-hackblox/  
Video: docs/demo-walkthrough.mp4 (2m 45s, 1080p, narrated in English by Rishi)  
Final tag/commit: v1.0.0-hackblox-submission

Do not treat the private hosted preview or the local chain as completion of the public testnet requirement. No competition submission has been sent automatically.
