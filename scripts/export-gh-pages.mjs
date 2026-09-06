import fs from 'node:fs';
import path from 'node:path';

const basePath = '/Proofline-hackblox';
const outDir = 'dist/gh-pages';

// Retain git repository inside dist/gh-pages if it already exists
const gitDir = path.join(outDir, '.git');
let gitBackup = null;
if (fs.existsSync(gitDir)) {
  gitBackup = 'dist/.gh-pages-git-bak';
  fs.rmSync(gitBackup, { recursive: true, force: true });
  fs.renameSync(gitDir, gitBackup);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

if (gitBackup && fs.existsSync(gitBackup)) {
  fs.renameSync(gitBackup, gitDir);
}

// 1. Copy client assets from dist/client
fs.cpSync('dist/client', outDir, { recursive: true });

// 2. Add .nojekyll to ensure GitHub Pages serves _next/ folder
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

// 3. Copy demo video if present
if (fs.existsSync('docs/demo-walkthrough.mp4')) {
  fs.copyFileSync('docs/demo-walkthrough.mp4', path.join(outDir, 'demo-walkthrough.mp4'));
}
if (fs.existsSync('docs')) {
  fs.cpSync('docs', path.join(outDir, 'docs'), { recursive: true });
}

// 4. Render HTML via server handler
const mod = await import('../dist/server/index.js');
const handler = mod.default;

async function renderPath(urlPath) {
  const req = new Request(`http://localhost${urlPath}`);
  const res = await handler.fetch(req, {}, { waitUntil: () => {} });
  return await res.text();
}

function rewritePaths(html) {
  return html
    .replaceAll('href="/_next/', `href="${basePath}/_next/`)
    .replaceAll('src="/_next/', `src="${basePath}/_next/`)
    .replaceAll('data-rsc-css-href="/_next/', `data-rsc-css-href="${basePath}/_next/`)
    .replaceAll('href="/favicon', `href="${basePath}/favicon`)
    .replaceAll('href="/icon-', `href="${basePath}/icon-`)
    .replaceAll('src="/logo', `src="${basePath}/logo`)
    .replaceAll('"/_next/', `"${basePath}/_next/`)
    .replaceAll("fetch('/api/config')", `fetch('${basePath}/api/config')`)
    .replaceAll('fetch("/api/config")', `fetch('${basePath}/api/config')`)
    .replaceAll("fetch(`/api/config`)", `fetch(\`${basePath}/api/config\`)`)
    .replaceAll("fetch('/api/upload')", `fetch('${basePath}/api/upload')`)
    .replaceAll('fetch("/api/upload")', `fetch('${basePath}/api/upload')`)
    .replaceAll("fetch(`/api/upload`)", `fetch(\`${basePath}/api/upload\`)`);
}

const homeHtml = await renderPath('/');
const rewrittenHome = rewritePaths(homeHtml);

fs.writeFileSync(path.join(outDir, 'index.html'), rewrittenHome);
fs.writeFileSync(path.join(outDir, '404.html'), rewrittenHome);

// 5. Create static /api/config endpoints
fs.mkdirSync(path.join(outDir, 'api', 'config'), { recursive: true });
const configData = {
  chainId: 11155111,
  contractAddress: null,
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  explorer: 'https://sepolia.etherscan.io',
  deploymentBlock: '0',
  networkName: 'Ethereum Sepolia',
  local: false,
  uploadEnabled: false,
};

fs.writeFileSync(
  path.join(outDir, 'api', 'config', 'index.html'),
  JSON.stringify(configData, null, 2),
);
fs.writeFileSync(
  path.join(outDir, 'api', 'config.json'),
  JSON.stringify(configData, null, 2),
);
// Also create plain file 'api/config' for servers that allow extensionless static files
try {
  fs.writeFileSync(
    path.join(outDir, 'api', 'config_file'),
    JSON.stringify(configData, null, 2),
  );
} catch {}

// 6. Rewrite any bundle references inside JS chunks that reference /_next or /api
const chunksDir = path.join(outDir, '_next', 'static', 'chunks');
if (fs.existsSync(chunksDir)) {
  for (const file of fs.readdirSync(chunksDir)) {
    if (file.endsWith('.js')) {
      const filePath = path.join(chunksDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      if (content.includes("fetch('/api/config')")) {
        content = content.replaceAll("fetch('/api/config')", `fetch('${basePath}/api/config')`);
        modified = true;
      }
      if (content.includes('fetch("/api/config")')) {
        content = content.replaceAll('fetch("/api/config")', `fetch('${basePath}/api/config')`);
        modified = true;
      }
      if (content.includes('fetch(`/api/config`)')) {
        content = content.replaceAll('fetch(`/api/config`)', `fetch(\`${basePath}/api/config\`)`);
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(filePath, content);
      }
    }
  }
}

console.log(`Successfully exported GitHub Pages static site to ${outDir}`);
