import { describe, it, expect } from 'vitest';
import { usePerDayCalculator } from '../../../src/composables/usePerDayCalculator';

describe('usePerDayCalculator', () => {
  const calculator = usePerDayCalculator();

  describe('calculateTripDuration', () => {
    it('should calculate trip duration inclusively', () => {
      // 1 day trip (same day)
      expect(calculator.calculateTripDuration('2024-06-01', '2024-06-01')).toBe(1);

      // 2 day trip
      expect(calculator.calculateTripDuration('2024-06-01', '2024-06-02')).toBe(2);

      // 5 day trip
      expect(calculator.calculateTripDuration('2024-06-01', '2024-06-05')).toBe(5);

      // 10 day trip
      expect(calculator.calculateTripDuration('2024-06-01', '2024-06-10')).toBe(10);
    });

    it('should handle cross-month boundaries', () => {
      // May 29 to June 3 (5 days)
      expect(calculator.calculateTripDuration('2024-05-29', '2024-06-03')).toBe(6);
    });

    it('should handle cross-year boundaries', () => {
      // Dec 30, 2024 to Jan 2, 2025 (4 days)
      expect(calculator.calculateTripDuration('2024-12-30', '2025-01-02')).toBe(4);
    });
  });

  describe('calculateAutoBufferDays', () => {
    it('should use max_days_before_washing when washing machine available', () => {
      const result = calculator.calculateAutoBufferDays(
        '2024-06-01',
        '2024-06-10',
        true,
        3,
        7,
        1
      );
      expect(result).toBe(3); // max_days_before_washing
    });

    it('should use ratio-based calculation when no washing machine', () => {
      // 14 days trip, ratio 7 (buffer every 7 days) → 14 / 7 = 2
      const result = calculator.calculateAutoBufferDays(
        '2024-06-01',
        '2024-06-14',
        false,
        undefined,
        7,
        1
      );
      expect(result).toBe(2);
    });

    it('should enforce minimum buffer days', () => {
      // 3 days trip, ratio 7 (3 / 7 = 0.4 → floor = 0), min 2 → should return 2
      const result = calculator.calculateAutoBufferDays(
        '2024-06-01',
        '2024-06-03',
        false,
        undefined,
        7,
        2
      );
      expect(result).toBe(2);
    });

    it('should handle edge case: 1 day trip with min 1', () => {
      const result = calculator.calculateAutoBufferDays(
        '2024-06-01',
        '2024-06-01',
        false,
        undefined,
        7,
        1
      );
      expect(result).toBe(1); // 1 / 7 = 0.14 → floor = 0 → max(0, 1) = 1
    });

    it('should calculate correctly for long trips', () => {
      // 30 days trip, ratio 7 → 30 / 7 = 4.28 → floor = 4
      const result = calculator.calculateAutoBufferDays(
        '2024-06-01',
        '2024-06-30',
        false,
        undefined,
        7,
        1
      );
      expect(result).toBe(4);
    });
  });

  describe('calculateDailyQuantity', () => {
    it('should return total days when no washing machine', () => {
      const result = calculator.calculateDailyQuantity(5, 2, false, undefined);
      expect(result).toBe(7); // 5 trip days + 2 buffer = 7 total days
    });

    it('should calculate based on max_days_before_washing when available', () => {
      // 10 day trip + 1 buffer = 11 total, washing every 3 days → ceil(11 / 3) = 4
      const result = calculator.calculateDailyQuantity(10, 1, true, 3);
      expect(result).toBe(4);
    });

    it('should handle edge case: trip days equals washing days', () => {
      // 4 day trip + 1 buffer = 5 total, washing every 5 days → ceil(5 / 5) = 1
      const result = calculator.calculateDailyQuantity(4, 1, true, 5);
      expect(result).toBe(1);
    });

    it('should handle edge case: trip shorter than washing cycle', () => {
      // 2 day trip + 1 buffer = 3 total, washing every 7 days → ceil(3 / 7) = 1
      const result = calculator.calculateDailyQuantity(2, 1, true, 7);
      expect(result).toBe(1);
    });

    it('should calculate correctly for long trips with washing', () => {
      // 18 day trip + 2 buffer = 20 total, washing every 4 days → ceil(20 / 4) = 5
      const result = calculator.calculateDailyQuantity(18, 2, true, 4);
      expect(result).toBe(5);

      // 19 day trip + 2 buffer = 21 total, washing every 4 days → ceil(21 / 4) = 6
      const result2 = calculator.calculateDailyQuantity(19, 2, true, 4);
      expect(result2).toBe(6);
    });
  });

  describe('getDayDate', () => {
    it('should format date for specific trip day', () => {
      const result = calculator.getDayDate('2024-06-01', 1);
      expect(result).toBe('Jun 1, 2024'); // Day 1 = start date
    });

    it('should calculate date for subsequent days', () => {
      expect(calculator.getDayDate('2024-06-01', 2)).toBe('Jun 2, 2024');
      expect(calculator.getDayDate('2024-06-01', 5)).toBe('Jun 5, 2024');
      expect(calculator.getDayDate('2024-06-01', 10)).toBe('Jun 10, 2024');
    });

    it('should handle cross-month boundaries', () => {
      // May 29 + 5 days = June 3
      expect(calculator.getDayDate('2024-05-29', 6)).toBe('Jun 3, 2024');
    });

    it('should handle cross-year boundaries', () => {
      // Dec 30, 2024 + 3 days = Jan 2, 2025
      expect(calculator.getDayDate('2024-12-30', 4)).toBe('Jan 2, 2025');
    });
  });
});
