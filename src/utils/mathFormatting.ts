const superscriptMap: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'a': 'ᵃ',
  'b': 'ᵇ',
  'c': 'ᶜ',
  'd': 'ᵈ',
  'e': 'ᵉ',
  'f': 'ᶠ',
  'g': 'ᵍ',
  'h': 'ʰ',
  'i': 'ᶦ',
  'j': 'ʲ',
  'k': 'ᵏ',
  'l': 'ˡ',
  'm': 'ᵐ',
  'n': 'ⁿ',
  'o': 'ᵒ',
  'p': 'ᵖ',
  'r': 'ʳ',
  's': 'ˢ',
  't': 'ᵗ',
  'u': 'ᵘ',
  'v': 'ᵛ',
  'w': 'ʷ',
  'x': 'ˣ',
  'y': 'ʸ',
  'z': 'ᶻ',
  'A': 'ᴬ',
  'B': 'ᴮ',
  'D': 'ᴰ',
  'E': 'ᴱ',
  'G': 'ᴳ',
  'H': 'ᴴ',
  'I': 'ᴵ',
  'J': 'ᴶ',
  'K': 'ᴷ',
  'L': 'ᴸ',
  'M': 'ᴹ',
  'N': 'ᴺ',
  'O': 'ᴼ',
  'P': 'ᴾ',
  'R': 'ᴿ',
  'T': 'ᵀ',
  'U': 'ᵁ',
  'V': 'ⱽ',
  'W': 'ᵂ',
  '/': 'ᐟ',
  ' ': ' '
};

const toSuperscript = (value: string): string => {
  return Array.from(value)
    .map(char => superscriptMap[char] ?? superscriptMap[char.toLowerCase()] ?? char)
    .join('');
};

/**
 * Format caret-style exponent expressions into unicode superscripts.
 * Examples: 2^3 -> 2³, 2^(2x) -> 2²ˣ
 */
export const formatExponents = (text: string): string => {
  if (!text || !text.includes('^')) {
    return text;
  }

  return text.replace(/\^(\(?[A-Za-z0-9+\-*/= ]+\)?)/g, (_, exponent) => {
    const trimmed = exponent.trim();
    // Remove surrounding parentheses; superscript map includes parens when needed.
    const withoutParens =
      trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed.slice(1, -1) : trimmed;
    return toSuperscript(withoutParens);
  });
};
