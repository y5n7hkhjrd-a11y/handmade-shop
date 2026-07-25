import { describe, it, expect } from 'vitest';
import { costEngineService } from './costEngineService.js';

describe('costEngineService', () => {
  describe('calculatePackagingCost', () => {
    it('should return 0 for empty costs', () => {
      expect(costEngineService.calculatePackagingCost([])).toBe(0);
    });

    it('should sum packaging costs', () => {
      expect(costEngineService.calculatePackagingCost([1000, 2000, 3000])).toBe(6000);
    });

    it('should handle a single packaging cost', () => {
      expect(costEngineService.calculatePackagingCost([5000])).toBe(5000);
    });
  });

  describe('calculateTotalCost', () => {
    it('should calculate total from material + packaging', () => {
      expect(costEngineService.calculateTotalCost(10000, 5000)).toBe(15000);
    });

    it('should include extra costs', () => {
      expect(costEngineService.calculateTotalCost(10000, 5000, 2000)).toBe(17000);
    });

    it('should return material cost only when packaging is 0', () => {
      expect(costEngineService.calculateTotalCost(10000, 0)).toBe(10000);
    });
  });

  describe('calculateProfit', () => {
    it('should calculate profit correctly', () => {
      expect(costEngineService.calculateProfit(50000, 30000)).toBe(20000);
    });

    it('should return negative profit when cost exceeds price', () => {
      expect(costEngineService.calculateProfit(20000, 30000)).toBe(-10000);
    });

    it('should return 0 when price equals cost', () => {
      expect(costEngineService.calculateProfit(10000, 10000)).toBe(0);
    });
  });
});
