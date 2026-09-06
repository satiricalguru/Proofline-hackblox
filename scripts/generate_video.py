import os
import subprocess
import json
import shutil
import urllib.request
import base64
import time

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "sk_1yt5wsnq_Teow2pejTm1BZhLh0qFEjBxI")
SARVAM_URL = "https://api.sarvam.ai/text-to-speech"
SPEAKER = "aditya"  # Young Indian male voice
MODEL = "bulbul:v3"

segments = [
    {
        "id": "01_intro",
        "image": "docs/screenshots/01_registry_dashboard.png",
        "text": "Hello judges, I am Jatin Pandey from Team Rize, presenting Proofline for HackBlox 2026 under the Web3 Track, Problem Statement 02: Soulbound Certificates. Proofline is an on-chain academic and professional credential registry that replaces easily forgeable digital certificates with permanently non-transferable soulbound tokens backed by exact cryptographic proof."
    },
    {
        "id": "02_verification",
        "image": "docs/screenshots/02_credential_verification.png",
        "text": "Verification in Proofline requires zero crypto setup. Anyone, including employers and academic verifiers, can inspect a certificate without connecting a wallet. Our engine independently retrieves the IPFS metadata, hashes the exact bytes, and confirms the SHA-256 fingerprint matches the on-chain digest. Every certificate features a dynamic QR code for instant mobile verification."
    },
    {
        "id": "03_revocation",
        "image": "docs/screenshots/03_revocation_status.png",
        "text": "Crucially, Proofline solves certificate revocation. If a degree was issued in error or revoked due to disciplinary action, the authorized issuer flags it on-chain with a standardized reason code. Rather than burning the token or destroying the record, Proofline preserves the full audit trail and metadata provenance while clearly alerting verifiers that the credential is no longer valid."
    },
    {
        "id": "04_hierarchy",
        "image": "docs/screenshots/04_institution_hierarchy.png",
        "text": "To prevent unauthorized issuance, Proofline implements a strict two-tier governance hierarchy. The registry owner accredits trusted institutions, like universities, which in turn authorize specific departments. If an institution is ever compromised or disabled, all departmental minting permissions are instantly suspended across the entire chain."
    },
    {
        "id": "05_issuance",
        "image": "docs/screenshots/06_issue_credential.png",
        "text": "When an accredited department issues a certificate, the recipient's achievement data is formatted according to our canonical JSON schema and pinned to IPFS. The contract binds the recipient's wallet address, credential serial number, and CID permanently into an ERC-721 and ERC-5192 compliant soulbound token."
    },
    {
        "id": "06_theme",
        "image": "docs/screenshots/07_light_mode.png",
        "text": "Proofline is designed with a premium user experience in mind, featuring responsive layouts, custom SVG branding, and seamless one-click toggling between dark and light themes with persistent user preferences."
    },
    {
        "id": "07_security",
        "image": "docs/screenshots/05_deployment_status.png",
        "text": "All transfer paths, approval mechanisms, and reentrancy vectors are rigorously blocked and verified across seventeen Foundry unit and fuzz tests, thirteen security tests, and automated integration tests. Proofline is completely open-source, fully documented, and live on GitHub Pages. Thank you!"
    }
]

temp_dir = "dist/video_temp_sarvam"
os.makedirs(temp_dir, exist_ok=True)
concat_list = os.path.join(temp_dir, "concat.txt")

clip_files = []

def generate_sarvam_audio(text, output_wav):
    payload = {
        "inputs": [text],
        "target_language_code": "en-IN",
        "speaker": SPEAKER,
        "model": MODEL
    }
    req = urllib.request.Request(
        SARVAM_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    audio_base64 = res["audios"][0]
    with open(output_wav, "wb") as f:
        f.write(base64.b64decode(audio_base64))

for i, seg in enumerate(segments):
    audio_wav = os.path.join(temp_dir, f"{seg['id']}.wav")
    clip_mp4 = os.path.join(temp_dir, f"{seg['id']}.mp4")

    # 1. Call Sarvam AI API
    print(f"Generating Sarvam AI voiceover for segment {i+1}/{len(segments)}: {seg['id']}...")
    generate_sarvam_audio(seg["text"], audio_wav)
    time.sleep(0.5)

    # 2. Get audio duration
    probe = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", audio_wav
    ])
    duration = float(json.loads(probe)["format"]["duration"]) + 0.8  # Brief pause between slides

    # 3. Create video slide scaled to 1920x1080
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
    print(f"  Rendered clip {seg['id']} ({duration:.1f}s)")

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
print(f"Successfully generated Sarvam AI dubbed video: {output_mp4}")
