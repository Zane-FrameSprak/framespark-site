import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.join(__dirname, '..');
const SAMPLE_ROOT = path.join(API_ROOT, 'test-runs', 'sample-diagnosis');
const TEMPLATE_DIR = path.join(SAMPLE_ROOT, 'templates');
const TEMPLATE_FILES = [
  'samples.md',
  'samples.json',
  'results.md',
  'results.json',
  'review-notes.md'
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const date = formatDate(new Date());
  const runName = await resolveRunName(date, options.name);
  const runDir = path.join(SAMPLE_ROOT, runName);

  await fs.mkdir(runDir, { recursive: true });
  await Promise.all(TEMPLATE_FILES.map(file => copyTemplate(file, runDir)));

  console.log(`已创建样本测试目录：${path.relative(API_ROOT, runDir)}`);
}

function parseArgs(argv) {
  const options = { name: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--name' && argv[i + 1]) {
      options.name = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--name=')) {
      options.name = arg.slice('--name='.length);
    }
  }
  return {
    name: slugify(options.name)
  };
}

async function resolveRunName(date, customName) {
  const base = customName ? `${date}-${customName}` : `${date}-manual`;
  let index = 1;
  while (true) {
    const suffix = String(index).padStart(3, '0');
    const candidate = `${base}-${suffix}`;
    if (!await exists(path.join(SAMPLE_ROOT, candidate))) {
      return candidate;
    }
    index += 1;
  }
}

async function copyTemplate(filename, runDir) {
  const source = path.join(TEMPLATE_DIR, filename);
  const target = path.join(runDir, filename);
  await fs.copyFile(source, target);
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

main().catch(err => {
  console.error(`创建样本测试目录失败：${err.message}`);
  process.exit(1);
});
