const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const;

/** Parses simple durations like "15m", "30d", "1h" into milliseconds. */
export const parseDurationMs = (duration: string): number => {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }
  const [, amount, unit] = match as unknown as [string, string, keyof typeof UNIT_MS];
  return Number(amount) * UNIT_MS[unit];
};
