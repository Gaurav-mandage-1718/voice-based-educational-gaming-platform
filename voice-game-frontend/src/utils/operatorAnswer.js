export function normalizeOperator(value) {
  if (!value) return "";

  const cleaned = String(value)
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ");

  if (cleaned === "+") return "+";
  if (cleaned === "-") return "-";
  if (cleaned === "*") return "*";
  if (cleaned === "/") return "/";

  if (["plus", "add", "addition"].includes(cleaned)) return "+";
  if (["minus", "subtract", "subtraction"].includes(cleaned)) return "-";
  if (["multiply", "multiplied", "times", "into", "multiplication"].includes(cleaned)) return "*";
  if (["divide", "division", "divided", "by"].includes(cleaned)) return "/";

  return cleaned;
}
