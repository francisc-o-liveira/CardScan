import { useEffect, useState } from "react";
import { hasSeenOnboarding } from "@/utils/onboarding";

/**
 * Where a signed-in user lands: the welcome screens the first time, Home afterwards. Null while the
 * stored flag is still being read, so callers wait instead of flashing the wrong screen.
 */
export function useHomeRoute(): "/welcome" | "/(tabs)" | null {
  const [route, setRoute] = useState<"/welcome" | "/(tabs)" | null>(null);

  useEffect(() => {
    let cancelled = false;
    hasSeenOnboarding().then((seen) => {
      if (!cancelled) setRoute(seen ? "/(tabs)" : "/welcome");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return route;
}
