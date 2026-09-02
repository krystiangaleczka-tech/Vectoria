/** Canonical document units. Geometry is stored in logical CSS pixels. */
export type Unit = 'px' | 'mm' | 'cm' | 'in';

const PX_PER_UNIT: Record<Unit, number> = {
  px: 1,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
};

export function unitToPx(value: number, unit: Unit): number {
  return value * PX_PER_UNIT[unit];
}

export function pxToUnit(value: number, unit: Unit): number {
  return value / PX_PER_UNIT[unit];
}

export function convertUnit(value: number, from: Unit, to: Unit): number {
  if (!Number.isFinite(value)) return Number.NaN;
  return pxToUnit(unitToPx(value, from), to);
}

/** Parse safe arithmetic used by professional numeric controls. No eval.
 *  `%` is relative to `percentBase` (the field's current value):
 *  inline `100+10%` (base 100) → 110; trailing `10%` (base 200) → 20.
 *  Without `percentBase`, any `%` yields null (backward compatible). */
export function parseNumericExpression(input: string, percentBase?: number): number | null {
  const source = input.trim().replace(/,/g, '.');
  if (!source) return null;
  if (source.includes('%') && (percentBase === undefined || !Number.isFinite(percentBase))) return null;

  // Whitelist: digits, operators, parens, percent. Keeps existing charset + '%'.
  if (!/^[+\-*/().\d\s%]+$/.test(source)) return null;

  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)%?|[()+\-*/%]/g);
  if (!tokens || tokens.join('') !== source.replace(/\s/g, '')) return null;
  let index = 0;

  const parsePrimary = (): number | null => {
    const token = tokens[index];
    if (token === undefined) return null;
    if (token === '(') {
      index += 1;
      const value = parseAdditive();
      if (tokens[index] !== ')') return null;
      index += 1;
      return value;
    }
    if (!/^\d|^\./.test(token)) return null;
    index += 1;
    const isPercent = token.endsWith('%');
    const value = Number(isPercent ? token.slice(0, -1) : token);
    if (!Number.isFinite(value)) return null;
    return isPercent ? percentBase! * value / 100 : value;
  };

  const parseUnary = (): number | null => {
    const token = tokens[index];
    if (token === '+' || token === '-') {
      index += 1;
      const value = parseUnary();
      return value === null ? null : token === '-' ? -value : value;
    }
    return parsePrimary();
  };

  const parseMultiplicative = (): number | null => {
    let left = parseUnary();
    while (left !== null && (tokens[index] === '*' || tokens[index] === '/')) {
      const operator = tokens[index++];
      const right = parseUnary();
      if (right === null || (operator === '/' && right === 0)) return null;
      left = operator === '*' ? left * right : left / right;
      if (!Number.isFinite(left)) return null;
    }
    return left;
  };

  const parseAdditive = (): number | null => {
    let left = parseMultiplicative();
    while (left !== null && (tokens[index] === '+' || tokens[index] === '-')) {
      const operator = tokens[index++];
      const right = parseMultiplicative();
      if (right === null) return null;
      left = operator === '+' ? left + right : left - right;
    }
    return left;
  };

  const result = parseAdditive();
  if (result === null || index !== tokens.length || !Number.isFinite(result)) return null;
  return result;
}
