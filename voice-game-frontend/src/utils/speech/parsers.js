import { normalizeText } from "./normalizeText";
import { getBestFuzzyMatch } from "./fuzzyMatch";

const NUMBER_WORDS = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  won: "1",
  two: "2",
  to: "2",
  too: "2",
  three: "3",
  four: "4",
  for: "4",
  five: "5",
  six: "6",
  sex: "6",
  seven: "7",
  eight: "8",
  ate: "8",
  nine: "9"
};

const YES_WORDS = ["yes", "yeah", "yep", "correct", "right"];
const NO_WORDS = ["no", "nope", "not", "wrong"];

const COLOR_WORDS = ["red", "blue", "green", "yellow", "pink"];
const DIRECTION_WORDS = ["up", "down", "left", "right"];

const OPERATOR_ALIASES = {
  plus: "+",
  add: "+",
  minus: "-",
  subtract: "-",
  times: "*",
  into: "*",
  multiply: "*",
  divide: "/",
  divided: "/",
  over: "/"
};

export function parseNumberAnswer(raw) {
  const text = normalizeText(raw);
  if (!text) return "";

  return text
    .split(" ")
    .filter(Boolean)
    .map((token) => NUMBER_WORDS[token] ?? token.replace(/\D/g, ""))
    .join("")
    .replace(/\D/g, "");
}

export function parsePhoneNumberAnswer(raw) {
  return parseNumberAnswer(raw);
}

export function parseYesNoAnswer(raw) {
  const text = normalizeText(raw);
  if (!text) return "";

  for (const word of YES_WORDS) if (text.includes(word)) return "yes";
  for (const word of NO_WORDS) if (text.includes(word)) return "no";

  return getBestFuzzyMatch(text.replace(/\s+/g, ""), ["yes", "no"], 2);
}

export function parseColorAnswer(raw) {
  const text = normalizeText(raw);
  if (!text) return "";

  for (const color of COLOR_WORDS) {
    if (text.includes(color)) return color;
  }

  for (const token of text.split(" ")) {
    const match = getBestFuzzyMatch(token, COLOR_WORDS, 2);
    if (match) return match;
  }

  return "";
}

export function parseDirectionAnswer(raw) {
  const text = normalizeText(raw);
  if (!text) return "";

  for (const direction of DIRECTION_WORDS) {
    if (text.includes(direction)) return direction;
  }

  for (const token of text.split(" ")) {
    const match = getBestFuzzyMatch(token, DIRECTION_WORDS, 2);
    if (match) return match;
  }

  return "";
}

export function parseOperatorAnswer(raw) {
  const text = normalizeText(raw);
  if (!text) return "";

  if (
    text === "-" ||
    text.includes("minus") ||
    text.includes("subtract") ||
    text.includes("subtraction")
  ) {
    return "-";
  }

  if (
    text === "+" ||
    text.includes("plus") ||
    text.includes("add") ||
    text.includes("addition")
  ) {
    return "+";
  }

  if (
    text === "*" ||
    text === "x" ||
    text.includes("times") ||
    text.includes("multiply") ||
    text.includes("multiplied") ||
    text.includes("into")
  ) {
    return "*";
  }

  if (
    text === "/" ||
    text.includes("divide") ||
    text.includes("divided") ||
    text.includes("over")
  ) {
    return "/";
  }

  return "";
}


export function parseWordAnswer(raw) {
  return normalizeText(raw).replace(/\s+/g, "").toUpperCase();
}

export function parseChoiceAnswer(raw, choices) {
  const text = normalizeText(raw);
  if (!text) return "";

  const normalizedChoices = choices.map((choice) => ({
    raw: choice,
    normalized: normalizeText(choice)
  }));

  const exact = normalizedChoices.find(
    (choice) => text === choice.normalized || text.includes(choice.normalized)
  );
  if (exact) return exact.raw;

  for (const token of text.split(" ").filter(Boolean)) {
    const match = getBestFuzzyMatch(
      token,
      normalizedChoices.map((item) => item.normalized),
      2
    );

    if (match) {
      const found = normalizedChoices.find((item) => item.normalized === match);
      if (found) return found.raw;
    }
  }

  const compactMatch = getBestFuzzyMatch(
    text.replace(/\s+/g, ""),
    normalizedChoices.map((item) => item.normalized.replace(/\s+/g, "")),
    2
  );

  if (compactMatch) {
    const found = normalizedChoices.find(
      (item) => item.normalized.replace(/\s+/g, "") === compactMatch
    );
    if (found) return found.raw;
  }

  return "";
}
