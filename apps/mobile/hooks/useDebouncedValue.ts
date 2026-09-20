import { useEffect, useState } from "react";

/** Keeps search from firing a request per keystroke. */
export function useDebouncedValue<T>(value: T, delay = 320): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
