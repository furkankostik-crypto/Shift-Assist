/**
 * Prevents mobile browsers (Chrome on Android, Safari on iOS, etc.) from triggering
 * native pull-to-refresh when dragging down from the top of the viewport or scroll containers,
 * while preserving smooth, native scrolling for all scrollable content.
 */
export function initPreventPullToRefresh(): void {
  if (typeof window === 'undefined') return;

  let touchStartY = 0;
  let touchStartX = 0;

  window.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - touchStartY;
      const deltaX = currentX - touchStartX;

      // Only check if user is primarily pulling downwards vertically
      if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
        let target = e.target as HTMLElement | null;
        let canScrollUp = false;

        // Traverse upwards to check if any ancestor scrollable element has scroll room above
        while (target && target !== document.body && target !== document.documentElement) {
          const style = window.getComputedStyle(target);
          const overflowY = style.overflowY;
          const isScrollable =
            (overflowY === 'auto' || overflowY === 'scroll') &&
            target.scrollHeight > target.clientHeight;

          if (isScrollable && target.scrollTop > 0) {
            canScrollUp = true;
            break;
          }
          target = target.parentElement;
        }

        // If no scrollable parent can scroll up, downward drag triggers browser pull-to-refresh.
        // Calling preventDefault() cleanly suppresses the browser reload action.
        if (!canScrollUp && e.cancelable) {
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );
}
