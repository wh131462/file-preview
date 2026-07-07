/**
 * Uint8Array hex/base64 polyfill（ES2025 提案方法）
 *
 * 背景：pdfjs-dist 6.x 内部使用了 `Uint8Array.prototype.toHex` /
 * `toBase64` / `fromBase64` 等 ES2025 提案方法。其 legacy 构建虽自带
 * core-js polyfill，但这些 polyfill 是纯副作用模块，在 webpack/umi 等
 * 二次打包环境下可能被 tree-shake 或延迟执行，导致运行时报错：
 *   `TypeError: a.toHex is not a function`
 *   `Uint8Array.fromBase64 is not a function`
 *
 * 本函数主动、幂等地安装这组方法。必须在使用 pdfjs 之前调用（运行时函数
 * 调用无法被 tree-shake）。仅当原生/pdfjs 未提供时才写入，不覆盖已存在实现。
 */

const HEX_CHARS = '0123456789abcdef';
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

interface Base64Options {
  alphabet?: 'base64' | 'base64url';
  lastChunkHandling?: 'loose' | 'strict' | 'stop-before-partial';
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += HEX_CHARS[b >> 4] + HEX_CHARS[b & 0x0f];
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new SyntaxError('Uint8Array.fromHex: string length must be even');
  }
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) {
      throw new SyntaxError('Uint8Array.fromHex: invalid hex string');
    }
    out[i] = byte;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array, alphabet: string): string {
  let out = '';
  let i = 0;
  const len = bytes.length;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
  }
  const rem = len - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + '=';
  }
  return out;
}

function base64ToBytes(str: string, alphabet: string): Uint8Array {
  // 构建反查表
  const lookup: Record<string, number> = {};
  for (let i = 0; i < alphabet.length; i++) lookup[alphabet[i]] = i;

  const clean = str.replace(/[\s=]/g, '');
  const byteLen = Math.floor((clean.length * 6) / 8);
  const out = new Uint8Array(byteLen);
  let acc = 0;
  let bits = 0;
  let oi = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = lookup[clean[i]];
    if (v === undefined) {
      throw new SyntaxError('Uint8Array.fromBase64: invalid base64 character');
    }
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[oi++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

function pickAlphabet(options?: Base64Options): string {
  return options?.alphabet === 'base64url' ? BASE64_URL_CHARS : BASE64_CHARS;
}

/**
 * 安装 Uint8Array hex/base64 方法（幂等）。
 * 仅在对应方法缺失时写入，已存在的原生实现不会被覆盖。
 */
export function installUint8ArrayHexBase64Polyfill(): void {
  if (typeof Uint8Array === 'undefined') return;

  const proto = Uint8Array.prototype as unknown as Record<string, unknown>;
  const ctor = Uint8Array as unknown as Record<string, unknown>;

  const define = (target: Record<string, unknown>, name: string, fn: (...args: never[]) => unknown) => {
    if (typeof target[name] === 'function') return;
    Object.defineProperty(target, name, {
      value: fn,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  };

  // 实例方法
  define(proto, 'toHex', function toHex(this: Uint8Array): string {
    return bytesToHex(this);
  });

  define(proto, 'toBase64', function toBase64(this: Uint8Array, options?: Base64Options): string {
    return bytesToBase64(this, pickAlphabet(options));
  });

  define(proto, 'setFromHex', function setFromHex(this: Uint8Array, hex: string) {
    const bytes = hexToBytes(hex);
    const written = Math.min(bytes.length, this.length);
    this.set(bytes.subarray(0, written));
    return { read: written * 2, written };
  });

  define(proto, 'setFromBase64', function setFromBase64(this: Uint8Array, str: string, options?: Base64Options) {
    const bytes = base64ToBytes(str, pickAlphabet(options));
    const written = Math.min(bytes.length, this.length);
    this.set(bytes.subarray(0, written));
    return { read: str.length, written };
  });

  // 静态方法
  define(ctor, 'fromHex', function fromHex(hex: string): Uint8Array {
    return hexToBytes(hex);
  });

  define(ctor, 'fromBase64', function fromBase64(str: string, options?: Base64Options): Uint8Array {
    return base64ToBytes(str, pickAlphabet(options));
  });
}
