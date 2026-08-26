import type JSZip from 'jszip';

export function findZipEntry(zip: JSZip, suffix: string): string | null {
  const want = suffix.replace(/\\/g, '/').toLowerCase();
  if (zip.file(suffix)) return suffix;
  for (const name of Object.keys(zip.files)) {
    const file = zip.files[name];
    if (file.dir) continue;
    if (name.replace(/\\/g, '/').toLowerCase().endsWith(want)) return name;
  }
  return null;
}

export async function readZipTextLoose(zip: JSZip, suffix: string): Promise<string | null> {
  const path = findZipEntry(zip, suffix);
  if (!path) return null;
  return zip.file(path)!.async('string');
}
