export interface NumberContext {
  readonly base?: number;
  readonly currentUnit?: 'px' | 'mm' | 'cm' | 'in' | 'pt';
}

export type NumberExpression =
  | { readonly type: 'literal'; readonly value: number }
  | { readonly type: 'binary'; readonly op: '+' | '-' | '*' | '/'; readonly left: NumberExpression; readonly right: NumberExpression };

const UNIT_TO_PX: Record<string, number> = {
  px: 1,
  in: 96,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  pt: 96 / 72,
};

/**
 * Parses and evaluates mathematical expressions with percentage and unit support.
 * Examples: '120 + 30' -> 150, '100/4' -> 25, '50%' (with base: 200) -> 100, '2in' -> 192.
 */
export function evaluateNumber(expression: string, context: NumberContext = {}): number {
  const clean = expression.trim();
  if (!clean) return 0;

  // Handle relative increment percentage: '+10%' or '-10%'
  const relativePercent = clean.match(/^([+-])\s*(\d+(?:\.\d+)?)\s*%$/);
  if (relativePercent) {
    const sign = relativePercent[1] === '-' ? -1 : 1;
    const pct = parseFloat(relativePercent[2]!) / 100;
    const base = context.base ?? 100;
    return base + sign * (base * pct);
  }

  // Handle single percentage: '25%'
  const percentMatch = clean.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (percentMatch) {
    const pct = parseFloat(percentMatch[1]!) / 100;
    const base = context.base ?? 100;
    return base * pct;
  }

  // Pre-process unit suffixes (e.g. '10mm', '2in') into px values
  const normalized = clean.replace(/([+-]?\d+(?:\.\d+)?)\s*(px|mm|cm|in|pt)\b/gi, (_, val, unit) => {
    const factor = UNIT_TO_PX[unit.toLowerCase()] ?? 1;
    return (parseFloat(val) * factor).toString();
  });

  // Safe recursive descent or token arithmetic parser (only +, -, *, /, numbers, parentheses)
  return evaluateArithmetic(normalized);
}

function evaluateArithmetic(expr: string): number {
  let pos = 0;

  function peek(): string {
    while (pos < expr.length && /\s/.test(expr[pos]!)) pos++;
    return pos < expr.length ? expr[pos]! : '';
  }

  function parseNumber(): number {
    while (pos < expr.length && /\s/.test(expr[pos]!)) pos++;
    let sign = 1;
    if (expr[pos] === '+' || expr[pos] === '-') {
      sign = expr[pos] === '-' ? -1 : 1;
      pos++;
    }

    if (expr[pos] === '(') {
      pos++; // consume '('
      const val = parseAddSub();
      if (expr[pos] === ')') pos++; // consume ')'
      return sign * val;
    }

    let numStr = '';
    while (pos < expr.length && /[\d.]/.test(expr[pos]!)) {
      numStr += expr[pos];
      pos++;
    }

    const val = parseFloat(numStr);
    return Number.isFinite(val) ? sign * val : 0;
  }

  function parseMulDiv(): number {
    let left = parseNumber();
    while (pos < expr.length) {
      const op = peek();
      if (op === '*' || op === '/') {
        pos++;
        const right = parseNumber();
        if (op === '*') left *= right;
        else if (op === '/') left = right !== 0 ? left / right : 0;
      } else {
        break;
      }
    }
    return left;
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (pos < expr.length) {
      const op = peek();
      if (op === '+' || op === '-') {
        pos++;
        const right = parseMulDiv();
        if (op === '+') left += right;
        else if (op === '-') left -= right;
      } else {
        break;
      }
    }
    return left;
  }

  const result = parseAddSub();
  return Number.isFinite(result) ? result : 0;
}
