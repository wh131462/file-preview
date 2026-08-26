import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libDir = join(root, 'packages/angular-file-preview/lib');
const fpCoreDts = join(libDir, 'fp-core.d.ts');

if (existsSync(fpCoreDts)) {
  writeFileSync(
    fpCoreDts,
    `export * from '@eternalheart/file-preview-core';\n`,
  );
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
