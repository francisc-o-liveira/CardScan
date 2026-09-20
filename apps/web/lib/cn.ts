type ClassValue = string | number | null | undefined | false | ClassValue[];

/**
 * Minimal class joiner. Deliberately not tailwind-merge: components in this app
 * expose explicit variant props rather than accepting arbitrary overriding
 * classes, so last-wins conflict resolution isn't needed.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }
  return out.join(" ");
}
