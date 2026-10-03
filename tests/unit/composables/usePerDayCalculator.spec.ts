import { describe, it, expect } from 'vitest';
import {
  usePerDayCalculator,
  describeQuantityRule,
  type QuantityContext,
} from '../../../src/composables/usePerDayCalculator';
import type { QuantityRule } from '../../../src/types';

const calculator = usePerDayCalculator();

const perDay: QuantityRule = { kind: 'per_day', rate: 1, spare: true };
const pants: QuantityRule = { kind: 'per_n_days', n: 3, min: 1, max: 3 };
const sleepwear: QuantityRule = { kind: 'per_n_days', n: 4, min: 1, max: 2 };
const jacket: QuantityRule = { kind: 'fixed', count: 1 };

function ctx(tripDays: number, spareDays: number, maxDaysBeforeWashing?: number): QuantityContext {
  return {
    tripDays,
    spareDays,
    washingMachineAvailable: maxDaysBeforeWashing !== undefined,
    maxDaysBeforeWashing,
  };
}

describe('usePerDayCalculator', () => {
  describe('calculateTripDuration', () => {
    it('counts start and end dates inclusively', () => {
      expect(calculator.calculateTripDuration('2024-06-01', '2024-06-05')).toBe(5);
    });

    it('returns 1 for a same-day trip', () => {
      expect(calculator.calculateTripDuration('2024-06-01', '2024-06-01')).toBe(1);
    });

    it('handles month boundaries', () => {
      expect(calculator.calculateTripDuration('2024-01-30', '2024-02-02')).toBe(4);
    });
  });

  describe('calculateAutoSpareDays', () => {
    it('adds one spare day per ratio days', () => {
      expect(calculator.calculateAutoSpareDays(14, 7, 1)).toBe(2);
    });

    it('never goes below the minimum', () => {
      expect(calculator.calculateAutoSpareDays(3, 7, 1)).toBe(1);
      expect(calculator.calculateAutoSpareDays(3, 7, 0)).toBe(0);
    });
  });

  describe('calculateCoverageDays', () => {
    it('covers the whole trip without washing', () => {
      expect(calculator.calculateCoverageDays(ctx(10, 1))).toBe(10);
    });

    it('is capped by the washing interval', () => {
      expect(calculator.calculateCoverageDays(ctx(14, 1, 5))).toBe(5);
    });

    it('is the trip length when the trip is shorter than the washing interval', () => {
      expect(calculator.calculateCoverageDays(ctx(3, 1, 5))).toBe(3);
    });

    it('ignores an unset washing interval', () => {
      expect(
        calculator.calculateCoverageDays({
          tripDays: 8,
          spareDays: 0,
          washingMachineAvailable: true,
          maxDaysBeforeWashing: undefined,
        })
      ).toBe(8);
    });
  });

  describe('calculateQuantity', () => {
    // Worked examples from the design (spare days = 1)
    it.each([
      ['3-day trip, no washing', ctx(3, 1), { perDay: 4, pants: 1, sleepwear: 1 }],
      ['10-day trip, no washing', ctx(10, 1), { perDay: 11, pants: 3, sleepwear: 2 }],
      ['14-day trip, washing every 5 days', ctx(14, 1, 5), { perDay: 6, pants: 2, sleepwear: 2 }],
    ])('%s', (_label, context, expected) => {
      expect(calculator.calculateQuantity(perDay, context)).toBe(expected.perDay);
      expect(calculator.calculateQuantity(pants, context)).toBe(expected.pants);
      expect(calculator.calculateQuantity(sleepwear, context)).toBe(expected.sleepwear);
      expect(calculator.calculateQuantity(jacket, context)).toBe(1);
    });

    it('does not add spares when spare is false', () => {
      const rule: QuantityRule = { kind: 'per_day', rate: 1, spare: false };
      expect(calculator.calculateQuantity(rule, ctx(5, 2))).toBe(5);
    });

    it('applies the rate and rounds up', () => {
      const diapers: QuantityRule = { kind: 'per_day', rate: 6, spare: true };
      expect(calculator.calculateQuantity(diapers, ctx(3, 1))).toBe(19);
      const halfRate: QuantityRule = { kind: 'per_day', rate: 0.5, spare: false };
      expect(calculator.calculateQuantity(halfRate, ctx(5, 0))).toBe(3);
    });

    it('applies min and max caps to per-day rules', () => {
      const capped: QuantityRule = { kind: 'per_day', rate: 1, spare: true, min: 3, max: 7 };
      expect(calculator.calculateQuantity(capped, ctx(1, 0))).toBe(3);
      expect(calculator.calculateQuantity(capped, ctx(20, 2))).toBe(7);
    });

    it('defaults per-N-days minimum to 1', () => {
      const rule: QuantityRule = { kind: 'per_n_days', n: 4 };
      expect(calculator.calculateQuantity(rule, ctx(1, 0))).toBe(1);
      expect(calculator.calculateQuantity(rule, ctx(9, 0))).toBe(3);
    });

    it('returns fixed counts regardless of trip length or washing', () => {
      const swimsuits: QuantityRule = { kind: 'fixed', count: 2 };
      expect(calculator.calculateQuantity(swimsuits, ctx(1, 0))).toBe(2);
      expect(calculator.calculateQuantity(swimsuits, ctx(30, 4, 3))).toBe(2);
    });
  });

  describe('describeQuantityRule', () => {
    it('describes each rule kind', () => {
      expect(describeQuantityRule(perDay)).toBe('1 per day + spares');
      expect(describeQuantityRule(pants)).toBe('1 per 3 days (min 1, max 3)');
      expect(describeQuantityRule({ kind: 'fixed', count: 2 })).toBe('2');
    });
  });
});
