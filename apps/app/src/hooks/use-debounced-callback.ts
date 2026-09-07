import { useEffect, useMemo, useRef } from 'react';

// Returns a debounced version of `callback`, plus a `flush` to run it
// immediately (e.g. on blur) instead of waiting out the delay.
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Args | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return useMemo(() => {
    const debounced = (...args: Args) => {
      pendingArgsRef.current = args;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const pending = pendingArgsRef.current;
        pendingArgsRef.current = null;
        if (pending) callbackRef.current(...pending);
      }, delayMs);
    };
    debounced.flush = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      const pending = pendingArgsRef.current;
      pendingArgsRef.current = null;
      if (pending) callbackRef.current(...pending);
    };
    return debounced;
  }, [delayMs]);
}
