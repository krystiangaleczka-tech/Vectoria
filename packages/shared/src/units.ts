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

/** Parse safe arithmetic used by professional numeric controls. No eval. */
export function parseNumericExpression(input: string, percentBase?: number): number | null {
  const source = input.trim().replace(/,/g, '.');
  if (!source) return null;

  const percent = source.endsWith('%');
  const expression = percent ? source.slice(0, -1).trim() : source;
  if (!/^[+\-*/().\d\s]+$/.test(expression)) return null;

  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/]/g);
  if (!tokens || tokens.join('') !== expression.replace(/\s/g, '')) return null;
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
    const value = Number(token);
    return Number.isFinite(value) ? value : null;
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
  if (!percent) return result;
  if (percentBase === undefined || !Number.isFinite(percentBase)) return null;
  return percentBase * result / 100;
}
