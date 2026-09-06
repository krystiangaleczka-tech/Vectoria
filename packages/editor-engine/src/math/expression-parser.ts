import { Result } from '@vectoria/shared';

export interface NumberContext {
  readonly base?: number;
  readonly currentUnit?: 'px' | 'mm' | 'cm' | 'in' | 'pt';
}

export interface ParseError {
  readonly kind:
    | 'empty'
    | 'syntax'
    | 'division-by-zero'
    | 'unconsumed-tokens'
    | 'unbalanced-parens'
    | 'invalid-number';
  readonly message: string;
  readonly position?: number;
}

export type NumberExpression =
  | { readonly type: 'literal'; readonly value: number }
  | {
      readonly type: 'binary';
      readonly op: '+' | '-' | '*' | '/';
      readonly left: NumberExpression;
      readonly right: NumberExpression;
    };

const UNIT_TO_PX: Record<string, number> = {
  px: 1,
  in: 96,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  pt: 96 / 72,
};

/**
 * Parses and evaluates a mathematical expression with units and percentages,
 * returning a Result with error details if the expression is invalid.
 *
 * @param expression The mathematical formula to parse (e.g. '120 + 30', '10mm', '50%').
 * @param context Evaluation context including base value for percentage and document unit.
 * @returns Result.ok(number) on success, or Result.err(ParseError) on failure.
 */
export function parseAndEvaluateNumber(
  expression: string,
  context: NumberContext = {},
): Result<number, ParseError> {
  const clean = expression.trim().replace(/,/g, '.');
  if (!clean) {
    return Result.err({ kind: 'empty', message: 'Empty expression' });
  }

  // Relative increment percentage: '+10%' or '-10%'
  const relativePercent = clean.match(/^([+-])\s*(\d+(?:\.\d+)?)\s*%$/);
  if (relativePercent) {
    const sign = relativePercent[1] === '-' ? -1 : 1;
    const pct = parseFloat(relativePercent[2]!) / 100;
    const base = context.base ?? 100;
    return Result.ok(base + sign * (base * pct));
  }

  // Single percentage: '25%'
  const percentMatch = clean.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (percentMatch) {
    const pct = parseFloat(percentMatch[1]!) / 100;
    const base = context.base ?? 100;
    return Result.ok(base * pct);
  }

  // Pre-process numbers with units or unitless numbers when currentUnit is set
  const unitFactorForUnitless =
    context.currentUnit && context.currentUnit !== 'px'
      ? UNIT_TO_PX[context.currentUnit] ?? 1
      : 1;

  const normalized = clean.replace(
    /(\d+(?:\.\d+)?)\s*(px|mm|cm|in|pt)?/gi,
    (_, numStr, unit) => {
      const val = parseFloat(numStr);
      if (unit) {
        const factor = UNIT_TO_PX[unit.toLowerCase()] ?? 1;
        return (val * factor).toString();
      }
      if (unitFactorForUnitless !== 1) {
        return (val * unitFactorForUnitless).toString();
      }
      return numStr;
    },
  );

  return parseArithmetic(normalized);
}

/**
 * Backward-compatible helper that evaluates mathematical expressions, returning 0 on parse failure.
 */
export function evaluateNumber(expression: string, context: NumberContext = {}): number {
  const res = parseAndEvaluateNumber(expression, context);
  return res.ok ? res.value : 0;
}

function parseArithmetic(expr: string): Result<number, ParseError> {
  let pos = 0;

  function skipWhitespace(): void {
    while (pos < expr.length && /\s/.test(expr[pos]!)) pos++;
  }

  function peek(): string {
    skipWhitespace();
    return pos < expr.length ? expr[pos]! : '';
  }

  function parseNumber(): Result<number, ParseError> {
    skipWhitespace();
    let sign = 1;
    if (expr[pos] === '+' || expr[pos] === '-') {
      sign = expr[pos] === '-' ? -1 : 1;
      pos++;
      skipWhitespace();
    }

    if (expr[pos] === '(') {
      pos++; // consume '('
      const inner = parseAddSub();
      if (!inner.ok) return inner;
      skipWhitespace();
      if (expr[pos] !== ')') {
        return Result.err({
          kind: 'unbalanced-parens',
          message: `Expected closing parenthesis ')' at position ${pos}`,
          position: pos,
        });
      }
      pos++; // consume ')'
      return Result.ok(sign * inner.value);
    }

    const startPos = pos;
    let numStr = '';
    while (pos < expr.length && /[\d.]/.test(expr[pos]!)) {
      numStr += expr[pos];
      pos++;
    }

    if (!numStr) {
      return Result.err({
        kind: 'syntax',
        message: `Expected number or '(' at position ${pos}`,
        position: pos,
      });
    }

    const val = parseFloat(numStr);
    if (!Number.isFinite(val)) {
      return Result.err({
        kind: 'invalid-number',
        message: `Invalid numeric value '${numStr}' at position ${startPos}`,
        position: startPos,
      });
    }

    return Result.ok(sign * val);
  }

  function parseMulDiv(): Result<number, ParseError> {
    const leftRes = parseNumber();
    if (!leftRes.ok) return leftRes;
    let left = leftRes.value;

    while (pos < expr.length) {
      const op = peek();
      if (op === '*' || op === '/') {
        pos++;
        const rightRes = parseNumber();
        if (!rightRes.ok) return rightRes;
        const right = rightRes.value;

        if (op === '*') {
          left *= right;
        } else {
          if (right === 0) {
            return Result.err({
              kind: 'division-by-zero',
              message: 'Division by zero',
              position: pos,
            });
          }
          left /= right;
        }
      } else {
        break;
      }
    }

    return Result.ok(left);
  }

  function parseAddSub(): Result<number, ParseError> {
    const leftRes = parseMulDiv();
    if (!leftRes.ok) return leftRes;
    let left = leftRes.value;

    while (pos < expr.length) {
      const op = peek();
      if (op === '+' || op === '-') {
        pos++;
        const rightRes = parseMulDiv();
        if (!rightRes.ok) return rightRes;
        const right = rightRes.value;

        if (op === '+') left += right;
        else left -= right;
      } else {
        break;
      }
    }

    return Result.ok(left);
  }

  const result = parseAddSub();
  if (!result.ok) return result;

  skipWhitespace();
  if (pos < expr.length) {
    return Result.err({
      kind: 'unconsumed-tokens',
      message: `Unexpected token '${expr.slice(pos)}' at position ${pos}`,
      position: pos,
    });
  }

  return result;
}
