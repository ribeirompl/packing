import { differenceInDays, parseISO, addDays, format } from 'date-fns';

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
   * Calculate auto buffer days based on preferences
   * If washing machine available with max_days_before_washing: use that value
   * Otherwise: Math.max(Math.floor(tripDays / buffer_days_ratio), min_buffer_days)
   */
  function calculateAutoBufferDays(
    startDate: string,
    endDate: string,
    washingMachineAvailable: boolean,
    maxDaysBeforeWashing: number | undefined,
    bufferDaysRatio: number,
    minBufferDays: number
  ): number {
    if (washingMachineAvailable && maxDaysBeforeWashing) {
      return maxDaysBeforeWashing;
    }

    const tripDays = calculateTripDuration(startDate, endDate);
    return Math.max(Math.floor(tripDays / bufferDaysRatio), minBufferDays);
  }

  /**
   * Calculate daily quantity for an item based on washing machine availability
   */
  function calculateDailyQuantity(
    tripDays: number,
    bufferDays: number,
    washingMachineAvailable: boolean,
    maxDaysBeforeWashing?: number
  ): number {
    const totalDays = tripDays + bufferDays;

    if (washingMachineAvailable && maxDaysBeforeWashing) {
      // Can wash after maxDaysBeforeWashing, so need fewer items
      return Math.ceil(totalDays / maxDaysBeforeWashing);
    }

    // No washing: need items for every day
    return totalDays;
  }

  /**
   * Generate date string for a specific day of the trip
   */
  function getDayDate(startDate: string, dayNumber: number): string {
    const start = parseISO(startDate);
    const dayDate = addDays(start, dayNumber - 1); // dayNumber is 1-indexed
    return format(dayDate, 'MMM d, yyyy');
  }

  return {
    calculateTripDuration,
    calculateAutoBufferDays,
    calculateDailyQuantity,
    getDayDate,
  };
}
