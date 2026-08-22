import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(repoRoot, 'packages/angular-file-preview');
const fesmDir = join(pkgDir, 'lib/fesm2022');
const entryName = 'eternalheart-angular-file-preview.mjs';
const entry = join(fesmDir, entryName);
const coreEntry = resolve(repoRoot, 'packages/file-preview-core/lib/index.mjs');

if (!existsSync(entry)) {
  throw new Error(`Angular FESM entry not found: ${entry}`);
}
if (!existsSync(coreEntry)) {
  throw new Error(`file-preview-core ESM not found: ${coreEntry}`);
}

const require = createRequire(join(pkgDir, 'package.json'));
const ngPackagrDir = dirname(require.resolve('ng-packagr/package.json'));
const rollupRequire = createRequire(join(ngPackagrDir, 'package.json'));
const { rollup } = await import(rollupRequire.resolve('rollup'));

const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const packageExternals = new Set([
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
  'rxjs',
  'tslib',
]);
packageExternals.delete('@eternalheart/file-preview-core');

function isExternal(id) {
  if (id === '@eternalheart/file-preview-core') return false;
  if (id.startsWith('.') || id.startsWith('/') || id.startsWith('\0')) return false;
  if (id.startsWith('@angular/') || id.startsWith('rxjs/')) return true;
  const name = id.startsWith('@')
    ? id.split('/').slice(0, 2).join('/')
    : id.split('/')[0];
  return packageExternals.has(name);
}

const bundle = await rollup({
  input: entry,
  external: isExternal,
  plugins: [
    {
      name: 'inline-file-preview-core',
      resolveId(id) {
        if (id === '@eternalheart/file-preview-core') {
          return coreEntry;
        }
        return null;
      },
    },
  ],
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  },
});

const tmpDir = join(pkgDir, 'lib/.fesm-bundle');
rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

await bundle.write({
  dir: tmpDir,
  format: 'es',
  sourcemap: true,
  hoistTransitiveImports: false,
  entryFileNames: entryName,
  chunkFileNames: 'eternalheart-angular-file-preview-[name]-[hash].mjs',
});
await bundle.close();

rmSync(fesmDir, { recursive: true, force: true });
mkdirSync(fesmDir, { recursive: true });

const { renameSync, readdirSync } = await import('node:fs');
for (const file of readdirSync(tmpDir)) {
  renameSync(join(tmpDir, file), join(fesmDir, file));
}
rmSync(tmpDir, { recursive: true, force: true });
