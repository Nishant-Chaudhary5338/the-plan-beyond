import type { CreateContactInput } from '../model/types';
import { canonicalizeFreeform } from '@/lib/phone';

export interface ParsedContact extends CreateContactInput {
  /** Display label for the review list. */
  label: string;
}

interface VProp {
  /** Property name, upper-cased, group prefix stripped (e.g. "item1.TEL" → "TEL"). */
  name: string;
  /** Parameters, upper-cased keys → upper-cased values (TYPE, ENCODING, CHARSET). */
  params: Record<string, string[]>;
  value: string;
}

/** Join RFC 6350 folded lines: a CRLF/CR/LF followed by a single space or tab. */
function unfold(text: string): string {
  return text.replace(/\r\n|\r|\n/g, '\n').replace(/\n[ \t]/g, '');
}

/** Split a string on an UNescaped separator, honouring backslash escapes. */
function splitUnescaped(value: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '\\' && i + 1 < value.length) {
      cur += ch + value[i + 1];
      i += 1;
      continue;
    }
    if (ch === sep) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** Unescape vCard text per RFC 6350 (\\ \, \; \n \N). */
function unescapeText(value: string): string {
  return value.replace(/\\([\\,;nN])/g, (_m, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

/** Decode a QUOTED-PRINTABLE value (=XX hex, UTF-8) — common in Outlook/Android exports. */
function decodeQuotedPrintable(value: string): string {
  const stripped = value.replace(/=\n/g, '').replace(/=$/, '');
  const bytes: number[] = [];
  for (let i = 0; i < stripped.length; i += 1) {
    const hex = stripped.slice(i + 1, i + 3);
    if (stripped[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(stripped.charCodeAt(i));
    }
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return stripped;
  }
}

/** Parse one physical (unfolded) property line into name + params + value. */
function parseLine(line: string): VProp | null {
  // The value starts at the first colon that is not inside a quoted parameter.
  let colon = -1;
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === ':' && !inQuote) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;

  const head = splitUnescaped(line.slice(0, colon), ';');
  let value = line.slice(colon + 1);

  const nameToken = head[0] ?? '';
  const name = (nameToken.includes('.') ? (nameToken.split('.').pop() ?? '') : nameToken).toUpperCase();

  const params: Record<string, string[]> = {};
  for (const seg of head.slice(1)) {
    const eq = seg.indexOf('=');
    if (eq < 0) {
      // vCard 2.1 shorthand, e.g. "TEL;CELL:..." — bare value is a TYPE.
      (params.TYPE ??= []).push(seg.trim().toUpperCase());
    } else {
      const key = seg.slice(0, eq).trim().toUpperCase();
      const vals = seg
        .slice(eq + 1)
        .split(',')
        .map((v) => v.replace(/^"|"$/g, '').trim().toUpperCase());
      (params[key] ??= []).push(...vals);
    }
  }

  if (params.ENCODING?.includes('QUOTED-PRINTABLE')) value = decodeQuotedPrintable(value);
  return { name, params, value };
}

function parseCard(card: string): VProp[] {
  return card
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLine)
    .filter((p): p is VProp => p !== null);
}

function splitName(props: VProp[]): { firstName: string; lastName: string } {
  // vCard N is "Family;Given;Additional;Prefix;Suffix".
  const n = props.find((p) => p.name === 'N');
  if (n) {
    const parts = splitUnescaped(n.value, ';').map((s) => unescapeText(s).trim());
    const family = parts[0] ?? '';
    const given = parts[1] ?? '';
    if (given || family) return { firstName: given || family, lastName: given ? family : '' };
  }
  const fn = props.find((p) => p.name === 'FN');
  if (fn) {
    const parts = unescapeText(fn.value).trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
  }
  return { firstName: '', lastName: '' };
}

/** Rank a TEL property so we prefer mobile/voice numbers when a card has several. */
function telRank(p: VProp): number {
  const types = p.params.TYPE ?? [];
  if (types.some((t) => t === 'CELL' || t === 'MOBILE')) return 3;
  if (types.includes('VOICE')) return 2;
  return 1;
}

function pickPhone(props: VProp[]) {
  const tels = props
    .filter((p) => p.name === 'TEL')
    .map((p, i) => ({ p, i }))
    .sort((a, b) => telRank(b.p) - telRank(a.p) || a.i - b.i);
  for (const { p } of tels) {
    const canonical = canonicalizeFreeform(p.value);
    if (canonical) return canonical;
  }
  return null;
}

/**
 * Parse a .vcf string into importable contacts. Handles RFC 6350 line folding,
 * backslash escapes, multiple TEL/EMAIL lines, quoted-printable values, and
 * bare national numbers (resolved against the default region). Cards without a
 * parseable phone or a usable name are skipped.
 */
export function parseVcf(text: string): ParsedContact[] {
  if (!text.trim()) return [];
  const cards = unfold(text)
    .split(/BEGIN:VCARD/i)
    .filter((c) => /END:VCARD/i.test(c));

  const result: ParsedContact[] = [];
  for (const card of cards) {
    const props = parseCard(card);
    const phone = pickPhone(props);
    if (!phone) continue;
    const { firstName, lastName } = splitName(props);
    if (!firstName) continue;
    result.push({
      firstName,
      lastName,
      countryCode: phone.countryCode,
      phone: phone.nationalNumber,
      label: [firstName, lastName].filter(Boolean).join(' '),
    });
  }
  return result;
}
