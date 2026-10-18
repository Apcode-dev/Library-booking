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
