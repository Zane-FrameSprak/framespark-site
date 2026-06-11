import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'logs', 'diagnosis', 'metadata', 'index.json');
const DEFAULT_LIMIT = 20;

async function main() {
  const limit = readLimit();
  const index = await readIndex();
  const recent = index.slice(0, limit);

  if (recent.length === 0) {
    console.log('暂无诊断日志。');
    return;
  }

  for (const item of recent) {
    console.log([
      item.createdAt || '-',
      `stage=${item.stage || '-'}`,
      `decision=${item.decision || '-'}`,
      `fallback=${item.fallback === true}`,
      `review=${item.reviewConsent === true}`,
      `log=${item.metadataPath || '-'}`
    ].join(' | '));
  }
}

async function readIndex() {
  try {
    const raw = await fs.readFile(INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function readLimit() {
  const arg = process.argv.find(item => item.startsWith('--limit='));
  if (!arg) return DEFAULT_LIMIT;
  const value = Number(arg.slice('--limit='.length));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_LIMIT;
}

main().catch(err => {
  console.error(`读取诊断日志失败：${err.message}`);
  process.exit(1);
});
