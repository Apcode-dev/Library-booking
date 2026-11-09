export const createDateTime = (dateStr: string, timeStr: string, isNextDay = false): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (isNextDay) {
    date.setDate(date.getDate() + 1);
  }
  return date;
};

/**
 * Calculates duration in hours between start and end time strings ("HH:MM")
 * Supports crossing midnight (e.g. 22:31 to 01:31 = 3.0 hours)
 */
export const calculateDurationHours = (startTime: string, endTime: string): number => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes <= 0) {
    // Crosses midnight (e.g. 22:31 to 01:31)
    diffMinutes += 24 * 60;
  }
  return Math.max(0.5, parseFloat((diffMinutes / 60).toFixed(2)));
};

/**
 * Checks if two time windows overlap:
 * Overlap condition: StartA < EndB AND EndA > StartB
 */
export const checkIntervalOverlap = (
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean => {
  return startA < endB && endA > startB;
};

/**
 * Checks whether two daily time windows [start1, end1] and [start2, end2] overlap.
 * Format is "HH:MM" (24-hour). Handles overnight slots (e.g. 20:00 to 08:00 next morning).
 */
export const doDailyTimeSlotsOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const [h1s, m1s] = start1.split(':').map(Number);
  const [h1e, m1e] = end1.split(':').map(Number);
  const [h2s, m2s] = start2.split(':').map(Number);
  const [h2e, m2e] = end2.split(':').map(Number);

  let s1 = h1s * 60 + m1s;
  let e1 = h1e * 60 + m1e;
  let s2 = h2s * 60 + m2s;
  let e2 = h2e * 60 + m2e;

  // Handle overnight slot (e.g. 20:00 to 08:00 next day)
  if (e1 <= s1) e1 += 24 * 60;
  if (e2 <= s2) e2 += 24 * 60;

  // Standard interval overlap: max(s1, s2) < min(e1, e2)
  // Also check circular shift for overnight wrapping (1440 mins = 24h)
  const overlapsNormal = Math.max(s1, s2) < Math.min(e1, e2);
  const overlapsShift1 = Math.max(s1 + 1440, s2) < Math.min(e1 + 1440, e2);
  const overlapsShift2 = Math.max(s1, s2 + 1440) < Math.min(e1, e2 + 1440);

  return overlapsNormal || overlapsShift1 || overlapsShift2;
};

/**
 * Checks whether two bookings on the same seat collide in time.
 * Supports combinations of HOURLY and MONTHLY/YEARLY recurring passes.
 */
export const doBookingsCollide = (
  bookingA: {
    bookingType?: string;
    date: string;
    startTime: string;
    endTime: string;
    validUntil?: Date | string | null;
  },
  bookingB: {
    bookingType?: string;
    date: string;
    startTime: string;
    endTime: string;
    validUntil?: Date | string | null;
  }
): boolean => {
  const isRecurringA = bookingA.bookingType === 'MONTHLY' || bookingA.bookingType === 'YEARLY';
  const isRecurringB = bookingB.bookingType === 'MONTHLY' || bookingB.bookingType === 'YEARLY';

  const startAStr = bookingA.date;
  const endAStr = isRecurringA && bookingA.validUntil
    ? new Date(bookingA.validUntil).toLocaleDateString('en-CA')
    : bookingA.date;

  const startBStr = bookingB.date;
  const endBStr = isRecurringB && bookingB.validUntil
    ? new Date(bookingB.validUntil).toLocaleDateString('en-CA')
    : bookingB.date;

  // Check if calendar dates overlap:
  const datesOverlap = startAStr <= endBStr && endAStr >= startBStr;
  if (!datesOverlap) {
    return false;
  }

  // If dates overlap, check if daily recurring time slots overlap:
  return doDailyTimeSlotsOverlap(
    bookingA.startTime,
    bookingA.endTime,
    bookingB.startTime,
    bookingB.endTime
  );
};
