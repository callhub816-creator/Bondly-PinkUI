import { useRef, useCallback, useState } from 'react';

interface UseLongPressOptions {
  delay?: number;
}

interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * useLongPress
 * Detects long-press on touch (default 500ms) and right-click on desktop.
 * Returns a set of handlers to spread onto an element.
 */
export const useLongPress = (
  onLongPress: () => void,
  onClick?: () => void,
  options: UseLongPressOptions = {}
): LongPressHandlers => {
  const { delay = 500 } = options;
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const moved = useCallback((sx: number, sy: number, cx: number, cy: number) => {
    const THRESHOLD = 10;
    return Math.abs(sx - cx) > THRESHOLD || Math.abs(sy - cy) > THRESHOLD;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Touch handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY };
      setIsLongPressing(false);
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        setIsLongPressing(true);
        onLongPress();
      }, delay) as unknown as number;
    },
    [delay, onLongPress, clearTimer]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startRef.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (moved(startRef.current.x, startRef.current.y, t.clientX, t.clientY)) {
        clearTimer();
        setIsLongPressing(false);
      }
    },
    [moved, clearTimer]
  );

  const onTouchEnd = useCallback(() => {
    clearTimer();
    startRef.current = null;
    setIsLongPressing(false);
  }, [clearTimer]);

  // Mouse handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // left button only
      startRef.current = { x: e.clientX, y: e.clientY };
      setIsLongPressing(false);
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        setIsLongPressing(true);
        onLongPress();
      }, delay) as unknown as number;
    },
    [delay, onLongPress, clearTimer]
  );

  const onMouseUp = useCallback(() => {
    clearTimer();
    startRef.current = null;
  }, [clearTimer]);

  const onMouseLeave = useCallback(() => {
    clearTimer();
    startRef.current = null;
  }, [clearTimer]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsLongPressing(true);
      onLongPress();
    },
    [onLongPress]
  );

  const onClickHandler = useCallback(
    (e: React.MouseEvent) => {
      if (!isLongPressing && typeof onClick === 'function') {
        onClick();
      }
    },
    [isLongPressing, onClick]
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onClick: onClickHandler,
    onContextMenu,
  };
};
