import { loadZip } from '../zipReader';
import { readZipTextLoose } from './zip';

export interface PptxSlideSize {
  cx: number;
  cy: number;
  ratio: number;
}

const DEFAULT_SIZE: PptxSlideSize = {
  cx: 12192000,
  cy: 6858000,
  ratio: 9 / 16,
};

/** Read `p:sldSz` from ppt/presentation.xml (EMU). Falls back to 16:9. */
export async function readPptxSlideSize(data: ArrayBuffer): Promise<PptxSlideSize> {
  try {
    const zip = await loadZip(data);
    const xml = await readZipTextLoose(zip, 'ppt/presentation.xml');
    if (!xml) return DEFAULT_SIZE;
    const cx = Number(xml.match(/\bsldSz\b[^>]*\bcx="(\d+)"/)?.[1] ?? 0);
    const cy = Number(xml.match(/\bsldSz\b[^>]*\bcy="(\d+)"/)?.[1] ?? 0);
    if (!cx || !cy) return DEFAULT_SIZE;
    return { cx, cy, ratio: cy / cx };
  } catch {
    return DEFAULT_SIZE;
  }
}
