import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import './sync-angular-version.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(repoRoot, 'packages/angular-file-preview');
const require = createRequire(join(pkgDir, 'package.json'));
const { ngPackagr } = await import(require.resolve('ng-packagr'));

const watch = process.argv.includes('--watch');
if (!watch) {
  rmSync(join(pkgDir, 'lib'), { recursive: true, force: true });
}
rmSync(join(pkgDir, 'node_modules/.cache/ng-packagr'), { recursive: true, force: true });

const packager = ngPackagr()
  .forProject(join(pkgDir, 'ng-package.json'))
  .withTsConfig(join(pkgDir, 'tsconfig.lib.json'));

const options = { cacheEnabled: false };

if (watch) {
  packager.watch(options).subscribe({
    error(err) {
      console.error(err?.message ?? err);
      process.exit(1);
    },
  });
} else {
  await packager.build(options);
}
