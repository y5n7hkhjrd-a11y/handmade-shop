/**
 * Format a number as currency (VND/đ)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Format a date to locale string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate a simple SKU
 */
export function generateSKU(productType: string, name: string): string {
  const prefix = productType === 'BASE' ? 'BS' : 'CH';
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${namePart}-${random}`;
}

/**
 * Calculate order totals
 */
export function calculateOrderTotals(
  items: Array<{ unitPrice: number; quantity: number; packagingCost: number }>,
  discount = 0,
  shippingCost = 0,
): { subtotal: number; totalCost: number; packagingCost: number } {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const packagingCost = items.reduce((sum, item) => sum + item.packagingCost, 0);
  const totalCost = subtotal - discount + packagingCost + shippingCost;
  return { subtotal, totalCost, packagingCost };
}

/**
 * Paginate an array
 */
export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { data, pagination: { page, limit, total, totalPages } };
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
