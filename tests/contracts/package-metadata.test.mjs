import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { resolveFromRoot } from '../helpers/core.mjs';

const packagePaths = [
  'packages/file-preview-core/package.json',
  'packages/react-file-preview/package.json',
  'packages/vue-file-preview/package.json',
  'packages/angular-file-preview/package.json',
];

async function readPackage(packagePath) {
  return JSON.parse(await readFile(resolveFromRoot(packagePath), 'utf8'));
}

test('publishable dependencies do not use the workspace protocol', async () => {
  for (const packagePath of packagePaths) {
    const pkg = await readPackage(packagePath);
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const [name, version] of Object.entries(pkg[field] ?? {})) {
        assert.ok(
          !String(version).startsWith('workspace:'),
          `${packagePath} ${field}.${name}=${version}`,
        );
      }
    }
  }
});

test('package entry fields point to files included in the published lib directory', async () => {
  for (const packagePath of packagePaths) {
    const pkg = await readPackage(packagePath);
    assert.ok(pkg.files?.includes('lib'), `${packagePath} must publish lib`);

    for (const [field, target] of Object.entries({
      main: pkg.main,
      module: pkg.module,
      types: pkg.types,
    })) {
      if (!target) continue;
      assert.match(target, /^\.\/lib\//, `${packagePath} ${field}=${target}`);
    }
  }
});
