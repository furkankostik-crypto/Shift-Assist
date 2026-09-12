/**
 * Safe and cross-platform Haptic Vibration Feedback utility for mobile touch devices.
 * Supports Android Vibration API and gracefully falls back on iOS Safari / unsupported environments.
 */

function canVibrate(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  );
}

/**
 * Very light tick (10ms) - ideal for tapping days in calendar, toggle switches, or buttons.
 */
export function hapticTap(): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(10);
  } catch {}
}

/**
 * Slightly pronounced tick (16ms) - ideal for month swipe transitions or selecting items.
 */
export function hapticSelection(): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(16);
  } catch {}
}

/**
 * Double-pulse tactile feedback ([15ms, 35ms pause, 20ms]) - ideal for successful actions
 * (adding leave, saving shift, cloud sync complete).
 */
export function hapticSuccess(): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate([15, 35, 20]);
  } catch {}
}

/**
 * Noticeable warning pulse - ideal for removing an exception or deleting an item.
 */
export function hapticWarning(): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate([25, 45, 25]);
  } catch {}
}

/**
 * Medium pulse for important confirmations or drawer actions.
 */
export function hapticImpact(intensity: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (!canVibrate()) return;
  try {
    const ms = intensity === 'heavy' ? 40 : intensity === 'medium' ? 24 : 12;
    navigator.vibrate(ms);
  } catch {}
}
