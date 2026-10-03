import { differenceInDays, parseISO } from 'date-fns';
import type { QuantityRule } from '@/types';

export interface QuantityContext {
  tripDays: number;
  spareDays: number;
  washingMachineAvailable: boolean;
  maxDaysBeforeWashing?: number;
}

/** Trips longer than this without washing get a "consider doing laundry" hint */
export const LAUNDRY_HINT_DAYS = 10;

export function usePerDayCalculator() {
  /**
   * Calculate trip duration inclusively (start and end dates both count)
   */
  function calculateTripDuration(startDate: string, endDate: string): number {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return differenceInDays(end, start) + 1;
  }

  /**
   * Spare days default: one per `ratio` trip days, at least `minSpareDays`
   */
  function calculateAutoSpareDays(tripDays: number, ratio: number, minSpareDays: number): number {
    return Math.max(Math.floor(tripDays / ratio), minSpareDays);
  }

  /**
   * Days a single set of clothes must cover: the whole trip, or the washing interval if shorter
   */
  function calculateCoverageDays(ctx: QuantityContext): number {
    if (ctx.washingMachineAvailable && ctx.maxDaysBeforeWashing && ctx.maxDaysBeforeWashing > 0) {
      return Math.min(ctx.tripDays, ctx.maxDaysBeforeWashing);
    }
    return ctx.tripDays;
  }

  /**
   * Number of an item to pack for a trip
   */
  function calculateQuantity(rule: QuantityRule, ctx: QuantityContext): number {
    const coverageDays = calculateCoverageDays(ctx);

    let quantity: number;
    switch (rule.kind) {
      case 'per_day':
        quantity = Math.ceil(coverageDays * rule.rate) + (rule.spare ? ctx.spareDays : 0);
        break;
      case 'per_n_days':
        quantity = Math.max(Math.ceil(coverageDays / rule.n), rule.min ?? 1);
        break;
      case 'fixed':
        return rule.count;
    }

    if (rule.min !== undefined) quantity = Math.max(quantity, rule.min);
    if (rule.max !== undefined) quantity = Math.min(quantity, rule.max);
    return quantity;
  }

  return {
    calculateTripDuration,
    calculateAutoSpareDays,
    calculateCoverageDays,
    calculateQuantity,
  };
}

/** Short human-readable description of a quantity rule, e.g. "1 per day + spares" */
export function describeQuantityRule(rule: QuantityRule): string {
  let text: string;
  switch (rule.kind) {
    case 'per_day':
      text = `${rule.rate} per day${rule.spare ? ' + spares' : ''}`;
      break;
    case 'per_n_days':
      text = `1 per ${rule.n} days`;
      break;
    case 'fixed':
      return `${rule.count}`;
  }
  const caps = [
    rule.min !== undefined ? `min ${rule.min}` : '',
    rule.max !== undefined ? `max ${rule.max}` : '',
  ].filter(Boolean);
  return caps.length ? `${text} (${caps.join(', ')})` : text;
}
