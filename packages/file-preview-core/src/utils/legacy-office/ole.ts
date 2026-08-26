/**
 * Minimal OLE2 / Compound File Binary (MS-CFB) reader.
 * Improved with better validation and error handling.
 */

const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ENDOFCHAIN = 0xfffffffe;
const FREESECT = 0xffffffff;
const MAX_CHAIN = 1_000_000;
const MAX_OLE_FILE_BYTES = 256 * 1024 * 1024;
const MAX_STREAM_BYTES = 64 * 1024 * 1024;
const MAX_DIRECTORY_BYTES = 16 * 1024 * 1024;
const MAX_MINI_FAT_BYTES = 16 * 1024 * 1024;
const DIR_ENTRY_SIZE = 128;
const HEADER_DIFAT_COUNT = 109;

interface OleHeader {
  sectorSize: number;
  miniSectorSize: number;
  miniStreamCutoff: number;
  firstDirectorySector: number;
  firstMiniFatSector: number;
  difat: number[];
  totalSectors: number;
  isValid: boolean;
}

interface DirEntry {
  name: string;
  type: number;
  childId: number;
  leftId: number;
  rightId: number;
  startSector: number;
  streamSize: number;
}

function u32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function u16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function sectorOffset(sector: number, sectorSize: number): number {
  return 512 + sector * sectorSize;
}

function readHeader(bytes: Uint8Array): OleHeader | null {
  if (bytes.length < 512 || bytes.length > MAX_OLE_FILE_BYTES) {
    return null;
  }

  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== SIGNATURE[i]) {
      return null;
    }
  }

  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const sectorShift = u16(view, 0x1e);
    const miniSectorShift = u16(view, 0x20);

    if (sectorShift < 9 || sectorShift > 12) {
      return null;
    }
    if (miniSectorShift < 6 || miniSectorShift > 9) {
      return null;
    }

    const sectorSize = 1 << sectorShift;
    const miniSectorSize = 1 << miniSectorShift;
    const totalSectors = Math.floor((bytes.length - 512) / sectorSize);

    const header: OleHeader = {
      sectorSize,
      miniSectorSize,
      miniStreamCutoff: u32(view, 0x38),
      firstDirectorySector: u32(view, 0x30),
      firstMiniFatSector: u32(view, 0x3c),
      difat: [],
      totalSectors,
      isValid: true,
    };

    for (let i = 0; i < HEADER_DIFAT_COUNT; i++) {
      const sect = u32(view, 0x4c + i * 4);
      if (sect !== FREESECT && sect < totalSectors) {
        header.difat.push(sect);
      }
    }

    return header;
  } catch {
    return null;
  }
}

function buildFat(bytes: Uint8Array, header: OleHeader): number[] | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const fat: number[] = [];
    const entriesPerSector = header.sectorSize / 4;

    for (const fatSector of header.difat) {
      const base = sectorOffset(fatSector, header.sectorSize);
      if (base + header.sectorSize > bytes.length) {
        continue;
      }

      for (let i = 0; i < entriesPerSector; i++) {
        const entry = u32(view, base + i * 4);
        fat.push(entry);
      }
    }

    return fat;
  } catch {
    return null;
  }
}

function readSectorChain(
  bytes: Uint8Array,
  fat: number[],
  startSector: number,
  sectorSize: number,
  maxBytes?: number
): Uint8Array | null {
  if (startSector >= ENDOFCHAIN || startSector === FREESECT) {
    return new Uint8Array(0);
  }

  const chunks: Uint8Array[] = [];
  const visited = new Set<number>();
  let sector = startSector;
  let total = 0;
  let guard = 0;
  const outputLimit = Math.min(maxBytes ?? bytes.length, bytes.length, MAX_OLE_FILE_BYTES);

  if (!Number.isSafeInteger(outputLimit) || outputLimit < 0) {
    return null;
  }

  while (sector < ENDOFCHAIN && sector !== FREESECT && guard++ < MAX_CHAIN) {
    if (sector >= fat.length || visited.has(sector)) {
      return null;
    }
    visited.add(sector);

    const base = sectorOffset(sector, sectorSize);
    if (!Number.isSafeInteger(base) || base < 512 || base >= bytes.length) {
      return null;
    }

    const end = Math.min(base + sectorSize, bytes.length);
    const slice = bytes.subarray(base, end);
    chunks.push(slice);
    total += slice.length;

    if (total >= outputLimit) {
      break;
    }

    sector = fat[sector];
  }

  if (!chunks.length) {
    return new Uint8Array(0);
  }

  const out = new Uint8Array(Math.min(total, outputLimit));
  let offset = 0;
  for (const chunk of chunks) {
    const take = Math.min(chunk.length, out.length - offset);
    out.set(chunk.subarray(0, take), offset);
    offset += take;
    if (offset >= out.length) break;
  }

  return out;
}

function buildMiniFat(bytes: Uint8Array, header: OleHeader, fat: number[]): number[] {
  if (header.firstMiniFatSector >= ENDOFCHAIN) {
    return [];
  }

  const miniFatBytes = readSectorChain(
    bytes,
    fat,
    header.firstMiniFatSector,
    header.sectorSize,
    MAX_MINI_FAT_BYTES
  );

  if (!miniFatBytes) {
    return [];
  }

  const view = new DataView(
    miniFatBytes.buffer,
    miniFatBytes.byteOffset,
    miniFatBytes.byteLength
  );
  const entries: number[] = [];
  for (let i = 0; i + 4 <= miniFatBytes.length; i += 4) {
    entries.push(view.getUint32(i, true));
  }
  return entries;
}

function parseDirectory(dirBytes: Uint8Array): DirEntry[] {
  const view = new DataView(dirBytes.buffer, dirBytes.byteOffset, dirBytes.byteLength);
  const entries: DirEntry[] = [];
  for (let offset = 0; offset + DIR_ENTRY_SIZE <= dirBytes.length; offset += DIR_ENTRY_SIZE) {
    const nameLen = u16(view, offset + 0x40);
    let name = '';
    const charBytes = Math.max(0, Math.min(64, nameLen - 2));
    for (let i = 0; i < charBytes; i += 2) {
      const c = u16(view, offset + i);
      if (c === 0) {
        break;
      }
      name += String.fromCharCode(c);
    }
    const type = dirBytes[offset + 0x42];
    const leftId = u32(view, offset + 0x44);
    const rightId = u32(view, offset + 0x48);
    const childId = u32(view, offset + 0x4c);
    const startSector = u32(view, offset + 0x74);
    const streamSize = u32(view, offset + 0x78);
    entries.push({
      name,
      type,
      childId,
      leftId,
      rightId,
      startSector,
      streamSize,
    });
  }
  return entries;
}

function findEntryByName(entries: DirEntry[], name: string): DirEntry | null {
  const target = name.toLowerCase();
  for (const entry of entries) {
    if (entry.type === 2 && entry.name.toLowerCase() === target) {
      return entry;
    }
  }
  const leaf = target.split('/').filter(Boolean).pop();
  if (leaf && leaf !== target) {
    return findEntryByName(entries, leaf);
  }
  return null;
}

function readMiniStreamChain(
  miniStream: Uint8Array,
  miniFat: number[],
  startSector: number,
  miniSectorSize: number,
  streamSize: number
): Uint8Array | null {
  const out = new Uint8Array(streamSize);
  const visited = new Set<number>();
  let sector = startSector;
  let offset = 0;
  let guard = 0;
  while (sector < ENDOFCHAIN && sector !== FREESECT && offset < streamSize && guard++ < MAX_CHAIN) {
    const base = sector * miniSectorSize;
    if (
      sector >= miniFat.length ||
      visited.has(sector) ||
      !Number.isSafeInteger(base) ||
      base < 0 ||
      base >= miniStream.length
    ) {
      return null;
    }
    visited.add(sector);

    const take = Math.min(miniSectorSize, streamSize - offset, miniStream.length - base);
    out.set(miniStream.subarray(base, base + take), offset);
    offset += take;
    sector = miniFat[sector];
  }
  return out.subarray(0, offset);
}

export function isOleCompoundFile(data: ArrayBuffer | Uint8Array): boolean {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length < 8) {
    return false;
  }
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== SIGNATURE[i]) {
      return false;
    }
  }
  return true;
}

export function readOleStream(data: ArrayBuffer | Uint8Array, streamName: string): Uint8Array | null {
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const header = readHeader(bytes);
    if (!header) {
      return null;
    }

    const fat = buildFat(bytes, header);
    if (!fat) {
      return null;
    }

    const dirBytes = readSectorChain(
      bytes,
      fat,
      header.firstDirectorySector,
      header.sectorSize,
      MAX_DIRECTORY_BYTES
    );
    if (!dirBytes) {
      return null;
    }

    const entries = parseDirectory(dirBytes);
    const entry = findEntryByName(entries, streamName);
    if (
      !entry ||
      entry.streamSize <= 0 ||
      entry.streamSize > bytes.length ||
      entry.streamSize > MAX_STREAM_BYTES
    ) {
      return null;
    }

    if (entry.streamSize < header.miniStreamCutoff) {
      const root = entries.find(e => e.type === 5) ?? entries[0];
      if (!root) {
        return null;
      }

      if (
        root.streamSize <= 0 ||
        root.streamSize > bytes.length ||
        root.streamSize > MAX_STREAM_BYTES
      ) {
        return null;
      }

      const miniStream = readSectorChain(
        bytes,
        fat,
        root.startSector,
        header.sectorSize,
        root.streamSize
      );
      if (!miniStream) {
        return null;
      }

      const miniFat = buildMiniFat(bytes, header, fat);
      return readMiniStreamChain(
        miniStream,
        miniFat,
        entry.startSector,
        header.miniSectorSize,
        entry.streamSize
      );
    }

    const raw = readSectorChain(
      bytes,
      fat,
      entry.startSector,
      header.sectorSize,
      entry.streamSize
    );

    if (!raw) {
      return null;
    }
    return raw.subarray(0, Math.min(raw.length, entry.streamSize));
  } catch {
    return null;
  }
}

export function readOleStreamAny(
  data: ArrayBuffer | Uint8Array,
  names: string[]
): Uint8Array | null {
  for (const name of names) {
    const stream = readOleStream(data, name);
    if (stream?.length) {
      return stream;
    }
  }
  return null;
}

export function u8ToDataView(u8: Uint8Array): DataView {
  return new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
}
