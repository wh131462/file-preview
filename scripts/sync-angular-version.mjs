import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = join(repoRoot, 'packages/angular-file-preview');
const packageJsonPath = join(packageDir, 'package.json');
const versionFilePath = join(packageDir, 'src/version.ts');
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const versionSource = `export const VERSION = '${version}';\n`;

let currentSource = '';
try {
  currentSource = readFileSync(versionFilePath, 'utf8');
} catch {
  // 文件不存在时由下方写入。
}

if (currentSource !== versionSource) {
  writeFileSync(versionFilePath, versionSource);
}
