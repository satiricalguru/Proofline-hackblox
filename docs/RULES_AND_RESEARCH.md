# HackBlox 2026: rules, source inventory and unresolved details

Checked 5 September 2026, roughly 10:45–11:00 IST. This is a research summary, not an organizer-issued rulebook. Official finalist announcements may supplement or supersede public pages. No private Discord/WhatsApp messages or submission portal were accessed.

## Event facts and schedule

Hackers Cult runs a fully online AI/Web3 event with mandatory open-source participation. The official home page advertises a **₹50,000 total prize pool**, free entry and global participation. It does not publish a reliable per-track/per-place split, payment schedule or tie-break policy in the inspected sections. Do not treat the Unstop “Refer & Win” prizes as HackBlox awards. [Official home](https://www.hackblox.xyz/)

| Milestone | Published IST schedule |
|---|---|
| Registration window on website | August 1–31 |
| Round 1 Phase 1 | Completed in August |
| Round 1 Phase 2 contribution deadline | September 4 |
| Round 2 starts | September 5, 2026, 10:00 |
| Code freeze | September 6, 2026, 10:00 |
| Submission/judging | September 6, RDM app; asynchronous review |
| Winner announcement | September 6 on website timeline; AI PDF says after offline evaluation |

Repositories must be finalized by code freeze; the site describes tags/locked repositories and no commits afterward. The AI PDF independently confirms the same 24-hour start/end. Treat **September 6, 10:00 IST** as the hard deadline and submit early; the timeline does not authorize extra coding time during judging. [Timeline](https://www.hackblox.xyz/#timeline), [AI rulebook](https://www.hackblox.xyz/HACKBLOX_2026_AI_Track_3LC_Scene_Classification.pdf)

## General participation and contribution rules

The organizer's Unstop listing allows 1–4 members, students and professionals, including inter-college/inter-specialization teams. Each person needs a GitHub account and individual registration. Every participant must make a meaningful CORSAIR OSS contribution and submit its PR through the tracking form. Use your own GitHub account, proper forks/branches/commits/PRs and repository guidelines. AI coding assistance is permitted; participants remain responsible for correctness, originality and licensing. Work belongs inside the event window. Plagiarism, duplicates, spam PRs, history/reviewer manipulation and misconduct risk disqualification; judges/maintainers have final discretion. Track choice governs category/prizes; shared repository eligibility does not establish permission to switch the final track. [Organizer listing](https://unstop.com/hackathons/hackblox-open-source-hackathon-hackers-cult-1731738/amp)

- [CORSAIR contribution platform](https://corsair.dev/oss)
- [Round 1 PR tracking form](https://forms.gle/9D3mZnbsEL5MdooLA)
- [Organizer-linked contribution tutorial](https://www.youtube.com/watch?v=h8XIpR95qSA)

Links above were discovered in the listing; the form/tutorial/platform workflows were not completed. Preserve the participant's existing qualification and PR evidence. Do not assume that publishing a new dApp alone replaces the OSS requirement.

## Web3: all three statements

The official PDF supplies five core requirements and three bonuses per option. The following condenses those specifications; consult the linked PDF for exact wording. [Web3 rulebook, pages 1–3](https://www.hackblox.xyz/web3-hackathon-problem-statements.pdf)

| Statement | Core scope | Listed stretch features |
|---|---|---|
| 01 Freelance Escrow | Client locks ETH/test token for a job; 2–3 independently approved milestones; freelancer delivery; client dispute; arbitrator payout/refund; wallet UI | IPFS details/evidence; completion reputation; stablecoin token payments |
| 02 Soulbound Certificates | Non-transferable NFT; approved issuers; IPFS metadata and on-chain reference; wallet/token lookup with issuer information; mint dashboard | Revocation without transfer; verification QR; institution/sub-issuer hierarchy |
| 03 Milestone Crowdfunding | Goal/deadline/milestones; pledges; contribution-weighted majority releases; remaining-fund refunds after failed vote or unmet goal; campaign/voting UI | Discovery filters; quadratic voting; creator reputation |

The website's background descriptions are simplified motivations, not verified market research. In particular, do not repeat claims that all crowdfunding platforms release all funds identically, quadratic voting by itself eliminates whales/Sybil attacks, or an escrow arbitrator eliminates all trust.

## Web3 scoring and submission

| Criterion | Weight |
|---|---:|
| Working testnet demo | 40% |
| Contract correctness and security basics | 25% |
| UI/UX | 20% |
| Creativity and bonuses | 15% |

Required delivery: public GitHub code with contracts/frontend/tests, explorer-verified contract address, live deployed demo URL, and a 2–3 minute video or live walkthrough. Sepolia is an explicitly named choice. The site also lists Polygon Mumbai, which is obsolete; choose Sepolia. Each project is scoped to one core contract, frontend and wallet connection in 24 hours, solo or 2–4 people. [Web3 page](https://www.hackblox.xyz/problem-statements?track=web3), [rubric in PDF, page 4](https://www.hackblox.xyz/web3-hackathon-problem-statements.pdf)

The webpage annotates each stretch item “+5%”; the PDF does not promise separate bonus arithmetic. The planning assumption is a total of 100%, including the 15% creativity category.

## AI: scope, constraints and delivery

This is the **3LC × HackBlox Scene Classification Challenge**. The six labels are buildings 0, forest 1, glacier 2, mountain 3, sea 4 and street 5. Inputs comprise 600 seed-labeled images, 6,000 unlabeled training images, 1,200 validation images, and 1,800 hidden-label test images. ResNet-18 is fixed and must train from scratch. Only supplied data is allowed; 3LC workflow/lineage is required. The final active table has a maximum of 3,000 training rows, including seeds; the rulebook alternates “weight > 0” and “weight = 1,” so use binary 0/1 weights with no ambiguity. Every team member requires a 3LC account and the Kaggle team must match registration. [AI PDF, pages 1–5](https://www.hackblox.xyz/HACKBLOX_2026_AI_Track_3LC_Scene_Classification.pdf)

The test set is split into 900 public and 900 private examples, stratified at 150/class in each half. This **data split** is separate from the webpage's **judging weights**:

| AI webpage criterion | Weight |
|---|---:|
| Kaggle private accuracy | 50% |
| Data-centric method and 3LC exploration | 25% |
| Code quality/reproducibility | 15% |
| Write-up/error analysis | 10% |

The PDF says winners depend on private score and offline evaluation without spelling out those rubric weights. Both sources need to be reconciled with final announcements. [Rendered AI page](https://www.hackblox.xyz/problem-statements?track=ai)

The PDF asks for predictions plus a captain-submitted evaluation form before September 6, 10:00 IST. Repository contents: Python code, MD/PDF methodology, README, zipped 3LC project and dashboard screenshots. It instructs teams to use a **private GitHub repository** and add **Rishikesh-Jadhav** as collaborator, making it public after results. The webpage says public repository instead. Do not silently choose a policy for an AI submission. The form also asks for private rank/accuracy before the stated deadline, although the PDF says that score is hidden until the end; obtain instructions for this field rather than inventing a number. [AI PDF, pages 3, 7–8](https://www.hackblox.xyz/HACKBLOX_2026_AI_Track_3LC_Scene_Classification.pdf)

[Required AI evaluation form](https://docs.google.com/forms/d/e/1FAIpQLSeWCQh6vcc5oigeyDluOf05Nfk5w03dgchasiFVH_TyRos9UQ/viewform). This URL is printed across two lines in the PDF; it was reconstructed from that text and not submitted or independently checked for current access.

Use a CSV with exactly one row for every sample ID, fields `image_id,prediction,confidence`, class integers 0–5 and confidence in [0,1]. The rulebook says missing required IDs/invalid labels fail; missing confidence defaults to 0.5, extra IDs are ignored and duplicate IDs retain their first row. Avoid those lenient cases entirely. Explicitly choose up to two final submissions; otherwise Kaggle selects based on public scores. Exact submission rate limits and starter-kit/Kaggle URLs were not exposed in the inspected public material; obtain them from the registered-participant channel. [AI PDF, pages 6–8](https://www.hackblox.xyz/HACKBLOX_2026_AI_Track_3LC_Scene_Classification.pdf)

## Conflicts, missing information and operating decisions

| Issue | What the research establishes | Action |
|---|---|---|
| Final deadline vs search cache | A cached Unstop response had a September 3 deadline; directly fetched current listing no longer did. Official site/PDF agree September 6, 10:00 IST. | Use current official sprint window; do not propagate cached date. |
| Registration cutoff | Site says Aug 1–31; directly fetched Unstop says registration closed Sep 5, 04:30 IST. | Historical registration discrepancy; does not change the final deadline. |
| Team size | Homepage emphasizes 2–4; Web3 PDF/page and Unstop permit solo; results contain solo entrants. | Solo plan is supported. |
| Final track switching | Unstop allows cross-track OSS repositories, not explicitly switching final judging track. | Confirm eligibility before committing to a Web3 entry. |
| Final OSS requirement | New dApp requirements coexist with general upstream-PR requirements. | Preserve Round 1 evidence; ask if any additional final PR is required. |
| RDM portal | Named on timeline with no working portal URL found. | Retrieve exact URL, fields and closing time from official finalist instructions. |
| AI repository privacy | PDF private until results; page public. | Follow explicit organizer clarification; provisional plan follows detailed PDF. |
| AI private score form field | Asked before deadline despite hidden final score. | Seek placeholder/follow-up instructions; never fabricate score. |
| Mumbai testnet | Listed by HackBlox, deprecated by Polygon. | Deploy Sepolia; no need to request another chain. |
| Bonus arithmetic and AI rubric | Page includes numerical details absent from PDFs. | Treat as published page guidance, flag for organizer confirmation. |
| Prize distribution/ties | Total prize pool published, allocation/tie-breaks not found. | Do not assume one grand prize or track-specific amounts. |
| Results counts | Page shows 57 teams/95 participants in Phase 1 and 57/80 in Phase 2; repeated entries appear. | These are displayed counts, not deduplicated competitor counts or per-track odds. |

No independent rules/terms/FAQ route or additional rulebook was linked from the inspected home, problem statements or results pages. `robots.txt` was available and `sitemap.xml` returned a 404. This inventory covers publicly discoverable information inspected here, not private announcements or an assertion that no other rules exist.

## People, partners and official channels

The homepage identifies **Rishikesh Jadhav (3LC AI)** as AI mentor/judge, **Itachi Uchiha (Payzoll)** as Web3 judge, and **Surya Gupta (India Blockchain Month/BlockOn)** as Web3 mentor. Their published roles can inform clear technical presentation, but provide no evidence of private judging preferences. Partner logos include Corsair, 3 Lines of Code and n8n; no mandatory n8n use or separate n8n award was found. [Judges and partners](https://www.hackblox.xyz/#judges-mentors)

Organizers: Anuj Khan and Arnab Banerjee. Co-organizers: Divyansh, Anushka and Shubham. Team credits: Pawan (tech), Garima Das and Yuvraj Vijay Verma (design), Himanshu Gupta (community). [Organizers](https://www.hackblox.xyz/#people)

- [HackBlox Discord](https://discord.gg/nwmkChsJWk)
- [Official WhatsApp community linked on Unstop](https://chat.whatsapp.com/G3MQhNWucq84iY4KkNuvwG)
- [Support email](mailto:support@hackerscult.online)
- Published contact: Shubham Saini, +91 9671004773.

**Message draft for the participant to send, not sent by this research:** “I am a selected finalist. Please confirm my allowed final track and whether switching to Web3 is permitted; the RDM submission URL and closing time; whether Round 1 CORSAIR PR evidence satisfies the OSS requirement for the final; and whether the Web3 15% bonus category is the full creativity allocation. If I remain in AI, please clarify private/public repository policy, the form's hidden-score fields, the starter kit/Kaggle link and current submission limits.”

## External implementation sources and the decisions they support

| Primary source | Evidence and use in our plan |
|---|---|
| [ERC-5192](https://eips.ethereum.org/EIPS/eip-5192) | Lock interface, event and ERC-165 detection; permanent non-transferability |
| [OpenZeppelin ERC-721 API](https://docs.openzeppelin.com/contracts/5.x/api/token/erc721) | Mint/update/receiver behavior and implementation surface |
| [OpenZeppelin changelog](https://docs.openzeppelin.com/contracts/5.x/changelog) | 5.x `_update` customization replacing older transfer hooks |
| [OpenZeppelin access control](https://docs.openzeppelin.com/contracts/5.x/access-control) | Least privilege and two-step ownership considerations |
| [Wagmi getting started](https://wagmi.sh/react/getting-started) | React wallet/client integration |
| [Pinata uploads](https://docs.pinata.cloud/files/uploading-files) | Server-side upload, public file CID, secret handling and CID/import differences |
| [IPFS persistence](https://docs.ipfs.tech/concepts/persistence/) | Pinning needed for reliable content availability |
| [Polygon Amoy announcement](https://forum.polygon.technology/t/introducing-the-amoy-testnet-for-polygon-pos/13388) | Mumbai deprecation; avoid obsolete chain suggestion |
| [Ethereum development networks](https://ethereum.org/developers/docs/development-networks) | Local development networks and public test-chain context |
| [Blockcerts FAQ](https://www.blockcerts.org/guide/faq.html) | Existing credential verification/identity/revocation approaches; avoid novelty overclaim |
| [W3C VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/) | Issuer/holder/verifier distinction; do not equate any NFT with standards compliance |

Research fetched the HackBlox pages and both PDFs directly because the web search fetcher could not open the domain. The rendered browser confirmed the AI-only rubric and Phase 2 results, which server HTML initially omitted. Official PDFs were text-extracted completely; the Web3 rubric and AI rules pages were also rendered and visually checked. Local source copies are in `research/sources/` for audit. No app code, on-chain transaction, account creation, message or competition submission was performed.
