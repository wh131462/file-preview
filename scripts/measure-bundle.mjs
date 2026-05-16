#!/usr/bin/env node
// 产物体积统计脚本：输出每个包 lib/ 下 .mjs / .cjs / .css 的原始与 gzip 大小
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

const packages = [
  { name: '@eternalheart/react-file-preview', dir: 'packages/react-file-preview/lib' },
  { name: '@eternalheart/vue-file-preview', dir: 'packages/vue-file-preview/lib' },
];

const TARGET_EXTS = ['.mjs', '.cjs', '.css'];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function bucket(filePath) {
  if (filePath.endsWith('.css')) return 'css';
  if (/chunks?\//.test(filePath)) return 'chunks';
  if (/renderers\//.test(filePath)) return 'renderers';
  if (/index\.(mjs|cjs)$/.test(filePath)) return 'entry';
  return 'other';
}

const totals = {};

for (const pkg of packages) {
  const absDir = join(repoRoot, pkg.dir);
  console.log(`\n=== ${pkg.name} (${pkg.dir}) ===`);
  if (!existsSync(absDir)) {
    console.log('  [skip] lib directory not found, run build first.');
    continue;
  }
  const files = walk(absDir)
    .filter((f) => TARGET_EXTS.some((ext) => f.endsWith(ext)) && !f.endsWith('.map'))
    .sort();

  const grouped = {};
  let totalRaw = 0;
  let totalGz = 0;

  for (const f of files) {
    const raw = statSync(f).size;
    const gz = gzipSync(readFileSync(f)).length;
    const rel = relative(absDir, f);
    const b = bucket(rel);
    grouped[b] ??= [];
    grouped[b].push({ rel, raw, gz });
    totalRaw += raw;
    totalGz += gz;
  }

  for (const b of ['entry', 'chunks', 'renderers', 'css', 'other']) {
    const items = grouped[b];
    if (!items?.length) continue;
    console.log(`\n  [${b}]`);
    for (const it of items) {
      console.log(
        `    ${it.rel.padEnd(50)} ${formatBytes(it.raw).padStart(10)}  gzip ${formatBytes(it.gz).padStart(10)}`,
      );
    }
  }
  console.log(
    `\n  TOTAL: raw ${formatBytes(totalRaw)}  gzip ${formatBytes(totalGz)}  files ${files.length}`,
  );
  totals[pkg.name] = { totalRaw, totalGz, count: files.length };
}

console.log('\n=== Summary ===');
for (const [name, t] of Object.entries(totals)) {
  console.log(
    `${name.padEnd(40)}  raw ${formatBytes(t.totalRaw).padStart(10)}  gzip ${formatBytes(t.totalGz).padStart(10)}  files ${t.count}`,
  );
}
