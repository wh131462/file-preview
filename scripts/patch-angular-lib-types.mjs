import {
  cpSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libDir = join(root, 'packages/angular-file-preview/lib');
const coreLibDir = join(root, 'packages/file-preview-core/lib');
const bundledCoreDir = join(libDir, 'core');
const fpCoreDts = join(libDir, 'fp-core.d.ts');

function listFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) files.push(...listFiles(file));
    else files.push(file);
  }
  return files;
}

if (!existsSync(join(coreLibDir, 'index.d.ts'))) {
  throw new Error(`file-preview-core declarations not found: ${coreLibDir}`);
}

cpSync(coreLibDir, bundledCoreDir, {
  recursive: true,
  filter: (source) => statSync(source).isDirectory() || source.endsWith('.d.ts'),
});

for (const file of listFiles(libDir)) {
  if (!file.endsWith('.d.ts')) continue;
  const importPath = relative(dirname(file), join(bundledCoreDir, 'index.d.ts'))
    .split(sep)
    .join('/')
    .replace(/\.d\.ts$/, '');
  const relativeImport = importPath.startsWith('.') ? importPath : `./${importPath}`;
  const source = readFileSync(file, 'utf8');
  const updated = source.replaceAll(
    '@eternalheart/file-preview-core',
    relativeImport,
  );
  if (updated !== source) writeFileSync(file, updated);
}

if (existsSync(fpCoreDts)) {
  writeFileSync(fpCoreDts, `export * from './core/index';\n`);
}

for (const file of listFiles(libDir)) {
  if (!file.endsWith('.d.ts')) continue;
  if (readFileSync(file, 'utf8').includes('@eternalheart/file-preview-core')) {
    throw new Error(`Angular declaration still references file-preview-core: ${file}`);
  }
}

const destPkg = join(libDir, 'package.json');
if (existsSync(destPkg)) {
  const pkg = JSON.parse(readFileSync(destPkg, 'utf8'));
  if (pkg.exports?.['./style.css'] === './lib/index.css') {
    pkg.exports['./style.css'] = './index.css';
  }
  const rootExport = pkg.exports?.['.'];
  if (rootExport && typeof rootExport === 'object' && rootExport.import) {
    const imported = rootExport.import;
    const importPath = typeof imported === 'string' ? imported : imported?.default;
    if (typeof importPath === 'string' && importPath.includes('/lib/')) {
      delete rootExport.import;
    }
  }
  if (typeof pkg.types === 'string' && pkg.types.includes('/lib/')) {
    pkg.types = './index.d.ts';
  }
  writeFileSync(destPkg, `${JSON.stringify(pkg, null, 2)}\n`);
}
