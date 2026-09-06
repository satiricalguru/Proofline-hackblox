import os
import subprocess
import json
import shutil

segments = [
    {
        "id": "01_intro",
        "image": "docs/screenshots/01_registry_dashboard.png",
        "title": "Proofline — Soulbound Credential Registry",
        "subtitle": "HackBlox 2026 | Web3 Problem 02 | Team Rize (Jatin Pandey)",
        "text": "Hello judges, I am Jatin Pandey from Team Rize, presenting Proofline for HackBlox 2026 under the Web3 Track, Problem Statement 02: Soulbound Certificates. Proofline is an on-chain academic and professional credential registry that replaces easily forgeable digital certificates with permanently non-transferable soulbound tokens backed by exact cryptographic proof."
    },
    {
        "id": "02_verification",
        "image": "docs/screenshots/02_credential_verification.png",
        "title": "Zero-Wallet Verification & Dynamic QR Codes",
        "subtitle": "Bonus Feature 2: Independent Byte Matching & Mobile QR Receipts",
        "text": "Verification in Proofline requires zero crypto setup. Anyone—including employers and academic verifiers—can inspect a certificate without connecting a wallet. Our engine independently retrieves the IPFS metadata, hashes the exact bytes, and confirms the SHA-256 fingerprint matches the on-chain digest. Every certificate features a dynamic QR code for instant mobile verification."
    },
    {
        "id": "03_revocation",
        "image": "docs/screenshots/03_revocation_status.png",
        "title": "Permanent On-Chain Revocation with Reason Codes",
        "subtitle": "Bonus Feature 1: Status Flagged Without Token Burning or Audit Loss",
        "text": "Crucially, Proofline solves certificate revocation. If a degree was issued in error or revoked due to disciplinary action, the authorized issuer flags it on-chain with a standardized reason code. Rather than burning the token or destroying the record, Proofline preserves the full audit trail and metadata provenance while clearly alerting verifiers that the credential is no longer valid."
    },
    {
        "id": "04_hierarchy",
        "image": "docs/screenshots/04_institution_hierarchy.png",
        "title": "Two-Tier Institutional Issuer Hierarchy",
        "subtitle": "Bonus Feature 3: Owner -> Accredited Institution -> Department",
        "text": "To prevent unauthorized issuance, Proofline implements a strict two-tier governance hierarchy. The registry owner accredits trusted institutions, like universities, which in turn authorize specific departments. If an institution is ever compromised or disabled, all departmental minting permissions are instantly suspended across the entire chain."
    },
    {
        "id": "05_issuance",
        "image": "docs/screenshots/06_issue_credential.png",
        "title": "Decentralized Issuance & IPFS Integrity",
        "subtitle": "ERC-721 + ERC-5192 Compliant Soulbound Minting",
        "text": "When an accredited department issues a certificate, the recipient's achievement data is formatted according to our canonical JSON schema and pinned to IPFS. The contract binds the recipient's wallet address, credential serial number, and CID permanently into an ERC-721 and ERC-5192 compliant soulbound token."
    },
    {
        "id": "06_theme",
        "image": "docs/screenshots/07_light_mode.png",
        "title": "Polished Responsive UI & Dark/Light Themes",
        "subtitle": "Accessible Design System with Instant Theme Switching",
        "text": "Proofline is designed with a premium user experience in mind, featuring responsive layouts, custom SVG branding, and seamless one-click toggling between dark and light themes with persistent user preferences."
    },
    {
        "id": "07_security",
        "image": "docs/screenshots/05_deployment_status.png",
        "title": "Complete Test Suite & Production GitHub Pages",
        "subtitle": "17 Foundry Fuzz Tests | 13 Security Tests | 8 E2E Tests",
        "text": "All transfer paths, approval mechanisms, and reentrancy vectors are rigorously blocked and verified across seventeen Foundry unit and fuzz tests, thirteen security tests, and automated integration tests. Proofline is completely open-source, fully documented, and live on GitHub Pages. Thank you!"
    }
]

temp_dir = "dist/video_temp"
os.makedirs(temp_dir, exist_ok=True)
concat_list = os.path.join(temp_dir, "concat.txt")

clip_files = []

for i, seg in enumerate(segments):
    audio_aiff = os.path.join(temp_dir, f"{seg['id']}.aiff")
    audio_wav = os.path.join(temp_dir, f"{seg['id']}.wav")
    clip_mp4 = os.path.join(temp_dir, f"{seg['id']}.mp4")

    # 1. Generate Voice with Rishi (Indian male)
    subprocess.run(["say", "-v", "Rishi", "-r", "175", seg["text"], "-o", audio_aiff], check=True)
    subprocess.run(["ffmpeg", "-y", "-i", audio_aiff, audio_wav], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 2. Get audio duration
    probe = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", audio_wav
    ])
    duration = float(json.loads(probe)["format"]["duration"]) + 1.2  # Add brief buffer

    # 3. Create video slide scaled to 1920x1080 with 25fps
    filter_complex = "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black[v]"

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", seg["image"],
        "-i", audio_wav,
        "-filter_complex", filter_complex,
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-t", str(duration),
        clip_mp4
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    clip_files.append(clip_mp4)
    print(f"Rendered segment {i+1}/{len(segments)}: {seg['id']} ({duration:.1f}s)")

# 4. Concatenate all clips into final video
with open(concat_list, "w") as f:
    for clip in clip_files:
        f.write(f"file '{os.path.abspath(clip)}'\n")

output_mp4 = "docs/demo-walkthrough.mp4"
root_output_mp4 = "../docs/demo-walkthrough.mp4"
subprocess.run([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
    "-c", "copy", output_mp4
], check=True)

shutil.copy(output_mp4, root_output_mp4)
print(f"Successfully generated final video walkthrough: {output_mp4}")
