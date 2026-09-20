"use client";

import { useEffect, useState } from "react";

/**
 * Delays propagating a value so search doesn't fire a request per keystroke.
 * 280ms is short enough to feel live, long enough to skip most intermediate
 * states while typing a card name.
 */
export function useDebouncedValue<T>(value: T, delay = 280): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
