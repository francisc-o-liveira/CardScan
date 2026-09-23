/**
 * The UI copy is English-only, so dates are formatted in English too.
 *
 * `toLocaleDateString(undefined, …)` follows the OS locale, which produced
 * "Released 8 de novembro de 2024" inside an otherwise English sentence. Pin
 * the locale until the app is actually translated.
 */
const DATE_LOCALE = "en-GB";

export const formatMonthYear = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(DATE_LOCALE, { month: "short", year: "numeric" });
};

/** "$1,234.56" — prices come from TCGplayer in USD; the currency is passed through regardless. */
export const formatPrice = (amount: number | null | undefined, currency = "USD"): string | null => {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
};

/** "26 Jun" — chart axes and tooltips. */
export const formatDayMonth = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(DATE_LOCALE, { day: "numeric", month: "short" });
};

export const formatLongDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
