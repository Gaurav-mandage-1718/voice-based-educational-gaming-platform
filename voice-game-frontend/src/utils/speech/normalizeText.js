export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:()[\]{}]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}
