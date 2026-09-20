const STORAGE_KEY = "cardscan-onboarded";

/**
 * Whether this browser has seen the welcome screens.
 *
 * Stored locally rather than on the user record: the User model has no
 * onboarding field, and adding one is a migration, not a UI change. The cost of
 * being wrong is small — someone on a new device sees three short screens once.
 */
export const hasSeenOnboarding = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Blocked storage: treat as seen so the app never traps the user in a loop.
    return true;
  }
};

export const markOnboardingSeen = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Non-fatal — they'll simply see it again next visit.
  }
};
