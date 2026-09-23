/**
 * The UI copy is English-only, so dates are formatted in English too, whatever the phone's locale is.
 * Same helper as the web app.
 */
const DATE_LOCALE = "en-GB";

export const formatLongDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(DATE_LOCALE, { day: "numeric", month: "long", year: "numeric" });
};

export const formatMonthYear = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(DATE_LOCALE, { month: "short", year: "numeric" });
};
