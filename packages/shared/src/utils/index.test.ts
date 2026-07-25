import { describe, it, expect } from 'vitest';
import { calculateOrderTotals, generateSKU, clamp, paginate } from './index.js';

describe('shared utilities', () => {
  describe('calculateOrderTotals', () => {
    it('should calculate totals for a single item', () => {
      const result = calculateOrderTotals([{ unitPrice: 10000, quantity: 2, packagingCost: 1000 }]);
      expect(result.subtotal).toBe(20000);
      expect(result.packagingCost).toBe(1000);
      expect(result.totalCost).toBe(21000);
    });

    it('should apply discount', () => {
      const result = calculateOrderTotals(
        [{ unitPrice: 50000, quantity: 1, packagingCost: 0 }],
        5000,
        0,
      );
      expect(result.subtotal).toBe(50000);
      expect(result.totalCost).toBe(45000);
    });

    it('should include shipping cost', () => {
      const result = calculateOrderTotals(
        [{ unitPrice: 100000, quantity: 1, packagingCost: 5000 }],
        0,
        15000,
      );
      expect(result.totalCost).toBe(120000);
    });
  });

  describe('generateSKU', () => {
    it('should generate SKU with BASE prefix', () => {
      const sku = generateSKU('BASE', 'Test Product');
      expect(sku.startsWith('BS-')).toBe(true);
      expect(sku.length).toBe(12); // BS-XXXX-XXXX
    });

    it('should generate SKU with CHARM prefix', () => {
      const sku = generateSKU('CHARM', 'Gold Star');
      expect(sku.startsWith('CH-')).toBe(true);
    });
  });

  describe('clamp', () => {
    it('should return value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should clamp to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should clamp to max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('paginate', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should return first page', () => {
      const result = paginate(items, 1, 3);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(4);
      expect(result.pagination.total).toBe(10);
    });

    it('should return last page', () => {
      const result = paginate(items, 4, 3);
      expect(result.data).toEqual([10]);
    });

    it('should handle empty array', () => {
      const result = paginate([], 1, 10);
      expect(result.data).toEqual([]);
      expect(result.pagination.totalPages).toBe(0);
    });
  });
});
