import fs from 'node:fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
fs.mkdirSync('.secrets', { recursive: true, mode: 0o700 });
const path = '.secrets/deployer.json';
if (!fs.existsSync(path)) {
  const privateKey = generatePrivateKey();
  fs.writeFileSync(
    path,
    JSON.stringify({
      address: privateKeyToAccount(privateKey).address,
      privateKey,
    }),
    { mode: 0o600 },
  );
}
const { address } = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log(`Dedicated Sepolia deployer / initial owner: ${address}`);
