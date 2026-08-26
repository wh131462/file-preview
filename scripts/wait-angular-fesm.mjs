import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fesm = join(
  dirname(fileURLToPath(import.meta.url)),
  '../packages/angular-file-preview/lib/fesm2022/eternalheart-angular-file-preview.mjs',
);

const deadline = Date.now() + 90_000;

while (Date.now() < deadline) {
  try {
    await access(fesm, constants.R_OK);
    const info = await stat(fesm);
    if (info.size > 0) {
      process.exit(0);
    }
  } catch {
    // ng-packagr watch may still be rewriting lib/
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}

console.error(`Timed out waiting for Angular FESM:\n  ${fesm}`);
process.exit(1);
