#!/usr/bin/env node
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const launcherPath = path.join(os.homedir(), 'Desktop', 'FrameSpark控制台.command');

const content = `#!/bin/zsh
cd "${REPO_ROOT}"
node scripts/start-internal-console.js --open
`;

await fs.writeFile(launcherPath, content, 'utf8');
await fs.chmod(launcherPath, 0o755);

console.log(`已生成桌面启动器：${launcherPath}`);
console.log('双击 FrameSpark控制台.command 即可启动本地内部控制台。');
