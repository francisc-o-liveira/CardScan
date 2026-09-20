export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://cardscan:cardscan@localhost:5432/cardscan_test?schema=public";
