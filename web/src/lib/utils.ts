/**
 * Format a number with commas as thousands separators
 * @param num - The number to format
 * @returns Formatted string with commas (e.g., "10,000")
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString("en-US");
}

