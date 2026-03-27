import { format, formatDistanceToNow, parseISO } from "date-fns";

/**
 * Format a number as KES currency
 */
export function formatKES(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "KES 0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "KES 0.00";
  return `KES ${num.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a number with commas (no currency)
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-KE");
}

/**
 * Format a date as DD/MM/YYYY (Kenya standard)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Format a date with time as DD/MM/YYYY HH:mm
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy HH:mm");
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format a date for API input (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Format a decimal quantity (remove trailing zeros)
 */
export function formatQty(qty: number | string | null | undefined): string {
  if (qty === null || qty === undefined) return "0";
  const num = typeof qty === "string" ? parseFloat(qty) : qty;
  if (isNaN(num)) return "0";
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
}

/**
 * Calculate budget percentage used
 */
export function budgetPercentage(spent: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.round((spent / total) * 100), 100);
}

/**
 * Get budget health color class based on percentage
 */
export function budgetHealthColor(percentage: number): string {
  if (percentage >= 100) return "text-red-600 bg-red-50";
  if (percentage >= 90) return "text-red-500 bg-red-50";
  if (percentage >= 80) return "text-amber-600 bg-amber-50";
  return "text-green-600 bg-green-50";
}
