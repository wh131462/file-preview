/** Minimal XML tree parser for OOXML (namespace-tolerant, no DOM). */

export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

export function localName(name: string): string {
  const i = name.indexOf(':');
  return i >= 0 ? name.slice(i + 1) : name;
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=]+)=(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    attrs[localName(match[1])] = decodeEntities(match[2] ?? match[3] ?? '');
  }
  return attrs;
}

export function parseXml(xml: string): XmlNode {
  const cleaned = xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '');
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const re = /<(\/)?([^\s>/]+)([^>]*?)(\/)?>|([^<]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned))) {
    if (match[5] != null) {
      stack[stack.length - 1].text += decodeEntities(match[5]);
      continue;
    }
    const name = localName(match[2]);
    if (match[1]) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const node: XmlNode = {
      name,
      attrs: parseAttrs(match[3] ?? ''),
      children: [],
      text: '',
    };
    stack[stack.length - 1].children.push(node);
    if (!match[4]) stack.push(node);
  }
  return root.children[0] ?? root;
}

export function kids(node: XmlNode, name: string): XmlNode[] {
  return node.children.filter(child => child.name === name);
}

export function kid(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find(child => child.name === name);
}

export function deepKids(node: XmlNode, name: string): XmlNode[] {
  const out: XmlNode[] = [];
  const walk = (current: XmlNode) => {
    if (current.name === name) out.push(current);
    for (const child of current.children) walk(child);
  };
  walk(node);
  return out;
}

export function attr(node: XmlNode, name: string): string | undefined {
  return node.attrs[name];
}

export function textOf(node: XmlNode): string {
  if (node.children.length === 0) return node.text;
  return node.text + node.children.map(textOf).join('');
}
