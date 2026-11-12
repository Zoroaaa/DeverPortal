// 版本比较与 appliesTo 范围匹配：全站唯一实现。
export function compareVersions(a: string, b: string): number {
  // parseInt 容忍 "0-beta" 这类后缀；解析不出数字按 0，保证永远返回有限数，排序稳定。
  const toParts = (v: string) => v.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const pa = toParts(a);
  const pb = toParts(b);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface Bound {
  value: string;
  inclusive: boolean;
}

interface VersionRange {
  lower?: Bound;
  upper?: Bound;
}

function parseVersionRange(raw: string): VersionRange {
  const range: VersionRange = {};
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new Error('appliesTo 为空');
  for (const token of tokens) {
    const match = /^(>=|<=|>|<|=)?v?(\d+\.\d+(?:\.\d+)?)$/.exec(token);
    if (!match) throw new Error(`无法解析的版本约束 "${token}"`);
    const op = match[1] ?? '=';
    const raw = match[2] ?? '';
    const value = raw.split('.').length === 2 ? `${raw}.0` : raw;
    if (op === '>=' || op === '>') {
      if (!range.lower || compareVersions(value, range.lower.value) > 0) {
        range.lower = { value, inclusive: op === '>=' };
      }
    } else if (op === '<=' || op === '<') {
      if (!range.upper || compareVersions(value, range.upper.value) < 0) {
        range.upper = { value, inclusive: op === '<=' };
      }
    } else {
      range.lower = { value, inclusive: true };
      range.upper = { value, inclusive: true };
    }
  }
  return range;
}

export function versionInRange(version: string, rawRange: string): boolean {
  const range = parseVersionRange(rawRange);
  if (range.lower) {
    const diff = compareVersions(version, range.lower.value);
    if (diff < 0 || (diff === 0 && !range.lower.inclusive)) return false;
  }
  if (range.upper) {
    const diff = compareVersions(version, range.upper.value);
    if (diff > 0 || (diff === 0 && !range.upper.inclusive)) return false;
  }
  return true;
}
