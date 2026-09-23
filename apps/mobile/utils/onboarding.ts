import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "cardscan-onboarded";

/**
 * Whether this device has seen the welcome screens. Stored locally rather than on the user record, like
 * the web app: the User model has no onboarding field and adding one is a migration, not a UI change.
 */
export const hasSeenOnboarding = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === "1";
  } catch {
    // Blocked storage: treat as seen so the app never traps the user in a loop.
    return true;
  }
};

export const markOnboardingSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Non-fatal: they will simply see it again next launch.
  }
};

/** New accounts always see the welcome screens, so registering clears the flag first. */
export const clearOnboardingSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
};
