const SMALL_NUMBERS = {
  zero: 0,
  one: 1,
  won: 1,
  two: 2,
  to: 2,
  too: 2,
  three: 3,
  four: 4,
  for: 4,
  five: 5,
  six: 6,
  sex: 6,
  seven: 7,
  eight: 8,
  ate: 8,
  nine: 9,
  night: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

export function normalizeAnswer(value) {
  if (value === null || value === undefined) return "";

  const cleaned = String(value)
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");

  if (/^\d+$/.test(cleaned)) {
    return cleaned;
  }

  const words = cleaned.split(" ").filter(Boolean);

  if (words.length === 1) {
    if (SMALL_NUMBERS[words[0]] !== undefined) {
      return String(SMALL_NUMBERS[words[0]]);
    }

    if (TENS[words[0]] !== undefined) {
      return String(TENS[words[0]]);
    }
  }

  if (words.length === 2) {
    const [first, second] = words;

    if (TENS[first] !== undefined && SMALL_NUMBERS[second] !== undefined) {
      return String(TENS[first] + SMALL_NUMBERS[second]);
    }

    if (SMALL_NUMBERS[first] !== undefined && SMALL_NUMBERS[second] !== undefined) {
      return String(Number(`${SMALL_NUMBERS[first]}${SMALL_NUMBERS[second]}`));
    }
  }

  return cleaned;
}
