import { useMemo } from 'react';

export type MathSegmentType = 'text' | 'inline' | 'block';

export interface MathSegment {
  type: MathSegmentType;
  value: string;
}

const MATRIX_REGEX = /(?:\[[^[\]]+\]){2,}/g;
const LATEX_SPECIAL_CHAR_REGEX = /([&_{}%$#])/g;
const DELIMITER_REGEX = /\$\$|\$|\\\(|\\\)|\\\[|\\\]/;
const MATRIX_PLACEHOLDER_REGEX = /__MATRIX_(\d+)__/g;
// High-confidence inline math: single-letter variables or numbers combined with operators/carets.
const INLINE_MATH_REGEX =
  /\b(?:[A-Za-z]|\d+)(?:\s*\^\s*[-]?(?:\d+(?:\/\d+)?|[A-Za-z]))?(?:\s*[\+\-\*\/=]\s*(?:[A-Za-z]|\d+)(?:\s*\^\s*[-]?(?:\d+(?:\/\d+)?|[A-Za-z]))?)+|\b(?:[A-Za-z]|\d+)\s*\^\s*[-]?(?:\d+(?:\/\d+)?|[A-Za-z])/g;
const EXPONENT_REGEX =
  /(\b(?:[A-Za-z]\w*|\d+)|\([^()]+\))\s*\^\s*(-?(?:\d+(?:\/\d+)?)|\(?[A-Za-z0-9+\-/*]+\)?)/g;

const escapeLatex = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(LATEX_SPECIAL_CHAR_REGEX, (_, char) => `\\${char}`);

const parseMatrixToLatex = (raw: string): string | null => {
  const rowMatches = raw.match(/\[([^[\]]+)\]/g);
  if (!rowMatches || rowMatches.length < 2) {
    return null;
  }

  const rows = rowMatches
    .map(entry => entry.slice(1, -1))
    .map(entry =>
      entry
        .split(/[,;|]/)
        .map(cell => escapeLatex(cell))
        .join(' & ')
    )
    .join(' \\\\ ');

  if (!rows) {
    return null;
  }

  return `\\begin{bmatrix}${rows}\\end{bmatrix}`;
};

const hasMathDelimiters = (text: string): boolean => DELIMITER_REGEX.test(text);

const wrapInlineMath = (text: string): string => {
  return text.replace(INLINE_MATH_REGEX, match => {
    const trimmed = match.trim();
    if (!trimmed) {
      return match;
    }

    // Guard: require at least one operator or caret to avoid wrapping plain words.
    const hasOperator = /[\+\-\*\/=]/.test(trimmed);
    const hasCaret = /\^/.test(trimmed);
    if (!hasOperator && !hasCaret) {
      return match;
    }

    return `$${trimmed}$`;
  });
};

/**
 * Normalize text into a format that uses LaTeX delimiters for math rendering.
 * - Converts caret-style exponents into brace-wrapped exponents.
 * - Wraps inline equation-like segments into $...$.
 * - Converts bracket-based matrices into bmatrix LaTeX blocks wrapped with $$.
 * Existing LaTeX delimiters are respected to avoid double processing.
 */
export const normalizeMathText = (input: string): string => {
  if (!input) {
    return input;
  }

  if (hasMathDelimiters(input)) {
    return input;
  }

  let normalized = input;

  const matrixPlaceholders: string[] = [];
  normalized = normalized.replace(MATRIX_REGEX, match => {
    const latex = parseMatrixToLatex(match);
    if (!latex) {
      return match;
    }
    const placeholder = `__MATRIX_${matrixPlaceholders.length}__`;
    matrixPlaceholders.push(`$$${latex}$$`);
    return placeholder;
  });

  normalized = normalized.replace(EXPONENT_REGEX, (match, base, exponent) => {
    if (match.includes('^{')) {
      return match;
    }

    const cleanedExponent = (() => {
      const trimmed = `${exponent}`.trim();
      if (!trimmed) {
        return exponent;
      }

      const unwrapped =
        (trimmed.startsWith('(') && trimmed.endsWith(')')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
          ? trimmed.slice(1, -1)
          : trimmed;

      return unwrapped.replace(/\s+/g, '');
    })();

    return `${base}^{${cleanedExponent}}`;
  });

  // Wrap only high-confidence inline math snippets; avoid wrapping full sentences.
  normalized = wrapInlineMath(normalized);

  normalized = normalized.replace(MATRIX_PLACEHOLDER_REGEX, (_, index) => {
    const resolved = matrixPlaceholders[Number(index)];
    return resolved ?? '';
  });

  return normalized;
};

const splitSegmentsFromNormalized = (text: string): MathSegment[] => {
  if (!text) {
    return [{ type: 'text', value: '' }];
  }

  const segments: MathSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text.startsWith('$$', cursor)) {
      const end = text.indexOf('$$', cursor + 2);
      if (end !== -1) {
        const value = text.slice(cursor + 2, end);
        segments.push({ type: 'block', value: value.trim() });
        cursor = end + 2;
        continue;
      }
    }

    if (text[cursor] === '$') {
      const end = text.indexOf('$', cursor + 1);
      if (end !== -1) {
        const value = text.slice(cursor + 1, end);
        segments.push({ type: 'inline', value: value.trim() });
        cursor = end + 1;
        continue;
      }
    }

    const nextDelimiter = (() => {
      const inlineIndex = text.indexOf('$', cursor);
      const blockIndex = text.indexOf('$$', cursor);

      if (inlineIndex === -1) {
        return blockIndex === -1 ? text.length : blockIndex;
      }

      if (blockIndex === -1) {
        return inlineIndex;
      }

      return Math.min(inlineIndex, blockIndex);
    })();

    const chunk = text.slice(cursor, nextDelimiter === -1 ? text.length : nextDelimiter);
    if (chunk) {
      segments.push({ type: 'text', value: chunk });
    }

    cursor = nextDelimiter === -1 ? text.length : nextDelimiter;
  }

  return segments;
};

export const getMathSegments = (input: string): MathSegment[] => {
  if (!input) {
    return [{ type: 'text', value: '' }];
  }

  const normalized = normalizeMathText(input);

  if (!hasMathDelimiters(normalized)) {
    return [{ type: 'text', value: normalized }];
  }

  return splitSegmentsFromNormalized(normalized);
};

/**
 * React hook helper for memoizing normalized math segments.
 */
export const useMathSegments = (input: string): MathSegment[] =>
  useMemo(() => getMathSegments(input), [input]);

/**
 * Backwards compatibility alias for legacy code that previously called
 * formatExponents. It now performs full normalization suitable for KaTeX.
 */
export const formatExponents = (input: string): string => normalizeMathText(input);
