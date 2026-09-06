import subprocess
import time
import os

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

targets = [
    {
        "url": "http://localhost:3002/?tab=registry",
        "output": "docs/screenshots/01_registry_dashboard.png"
    },
    {
        "url": "http://localhost:3002/verify/31337/0x5fbdb2315678afecb367f032d93f642f64180aa3/1",
        "output": "docs/screenshots/02_credential_verification.png"
    },
    {
        "url": "http://localhost:3002/verify/31337/0x5fbdb2315678afecb367f032d93f642f64180aa3/3",
        "output": "docs/screenshots/03_revocation_status.png"
    },
    {
        "url": "http://localhost:3002/?tab=institutions",
        "output": "docs/screenshots/04_institution_hierarchy.png"
    },
    {
        "url": "http://localhost:3002/?tab=settings",
        "output": "docs/screenshots/05_deployment_status.png"
    },
    {
        "url": "http://localhost:3002/?tab=issue",
        "output": "docs/screenshots/06_issue_credential.png"
    },
    {
        "url": "http://localhost:3002/?tab=registry&theme=light",
        "output": "docs/screenshots/07_light_mode.png"
    }
]

os.makedirs("docs/screenshots", exist_ok=True)

for i, t in enumerate(targets):
    print(f"[{i+1}/{len(targets)}] Capturing clean screenshot for {t['output']}...")
    cmd = [
        CHROME,
        "--headless=new",
        f"--screenshot={t['output']}",
        "--window-size=1920,1080",
        "--virtual-time-budget=5000",
        "--hide-scrollbars",
        t["url"]
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Saved: {t['output']}")

print("All screenshots captured cleanly without any browser borders!")
