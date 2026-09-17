import type { ShiftPattern, ShiftDay, ShiftType } from '../db/db';

const MILLISECONDS_IN_DAY = 86400000;

// Cache parsed pattern start date midnight timestamps to prevent repeated string parsing
const startDateTimestampCache = new Map<string, number>();

// Cache normalized pattern days array (index 0..cycleLength-1) for O(1) direct access
const patternDaysArrayCache = new WeakMap<ShiftPattern, ShiftDay[]>();

function getNormalizedPatternDays(pattern: ShiftPattern): ShiftDay[] {
  let days = patternDaysArrayCache.get(pattern);
  if (!days) {
    const cycleLength = pattern.cycleLength || pattern.days.length;
    days = new Array(cycleLength);
    for (let i = 0; i < cycleLength; i++) {
      const targetDayIndex = i + 1;
      const found =
        pattern.days.find((d) => d.dayIndex === targetDayIndex) ||
        pattern.days[i] ||
        pattern.days[0];
      days[i] = found;
    }
    patternDaysArrayCache.set(pattern, days);
  }
  return days;
}

function getStartMidnightTimestamp(startDateStr: string): number {
  let cached = startDateTimestampCache.get(startDateStr);
  if (cached === undefined) {
    const [year, month, day] = startDateStr.split('-').map(Number);
    cached = new Date(year, month - 1, day).getTime();
    startDateTimestampCache.set(startDateStr, cached);
  }
  return cached;
}

/**
 * Calculates which shift day falls on a given date based on a pattern and its start date.
 * Supports infinite repeating cycles seamlessly with high-performance integer math.
 */
export function getShiftForDate(
  targetDate: Date,
  pattern: ShiftPattern,
  patternStartDateStr: string // YYYY-MM-DD
): ShiftDay | null {
  if (!pattern || !pattern.days || pattern.days.length === 0) return null;

  const startTimestamp = getStartMidnightTimestamp(patternStartDateStr);
  const targetTimestamp = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();

  const diffDays = Math.round((targetTimestamp - startTimestamp) / MILLISECONDS_IN_DAY);

  const cycleLength = pattern.cycleLength || pattern.days.length;
  if (cycleLength <= 0) return null;

  // Euclidean modulo ensures positive index for any date past or future
  const cycleIndex = ((diffDays % cycleLength) + cycleLength) % cycleLength;

  const normalizedDays = getNormalizedPatternDays(pattern);
  return normalizedDays[cycleIndex] || null;
}

/**
 * Dynamically overlays current user-customized ShiftType properties (name, color, icon, hours, type)
 * onto a ShiftDay from a pattern.
 */
export function resolveShiftDayWithTypes(
  shiftDay: ShiftDay | null | undefined,
  shiftTypesMap?: Map<string, ShiftType> | null
): ShiftDay | null {
  if (!shiftDay) return null;
  if (!shiftTypesMap || shiftTypesMap.size === 0) return shiftDay;

  // 1. Try matching by shiftTypeId directly
  let matchedType: ShiftType | undefined;
  if (shiftDay.shiftTypeId) {
    matchedType = shiftTypesMap.get(shiftDay.shiftTypeId);
  }

  // 2. Fallback: match by normalized name
  if (!matchedType && shiftDay.name) {
    const lowerName = shiftDay.name.trim().toLowerCase();
    for (const st of shiftTypesMap.values()) {
      if (st.name && st.name.trim().toLowerCase() === lowerName) {
        matchedType = st;
        break;
      }
    }
  }

  if (!matchedType) return shiftDay;

  return {
    ...shiftDay,
    name: matchedType.name || shiftDay.name,
    color: matchedType.color || shiftDay.color,
    icon: matchedType.icon || shiftDay.icon,
    startTime: matchedType.startTime !== undefined ? matchedType.startTime : shiftDay.startTime,
    endTime: matchedType.endTime !== undefined ? matchedType.endTime : shiftDay.endTime,
    type: matchedType.type || shiftDay.type,
  };
}



