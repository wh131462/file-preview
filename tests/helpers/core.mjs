import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const resolveFromRoot = (...segments) => path.join(root, ...segments);

export const readTextFixture = (name) =>
  readFile(resolveFromRoot('tests', 'fixtures', name), 'utf8');

export const readJsonFixture = async (name) =>
  JSON.parse(await readTextFixture(name));

export const loadCore = () =>
  import(pathToFileURL(resolveFromRoot('packages/file-preview-core/lib/index.mjs')).href);
