/**
 * Shapes served by tcgcsv.com — a daily, keyless mirror of TCGplayer's own
 * catalog and pricing API. Every endpoint wraps its rows in `{ results }`.
 */

export interface TcgcsvResponse<T> {
  success: boolean;
  errors: string[];
  results: T[];
}

/** A TCGplayer "group" is a set/expansion (or a sealed-product line). */
export interface TcgcsvGroup {
  groupId: number;
  name: string;
  abbreviation: string | null;
  isSupplemental: boolean;
  publishedOn: string;
  categoryId: number;
}

export interface TcgcsvExtendedData {
  name: string;
  displayName: string;
  value: string;
}

export interface TcgcsvProduct {
  productId: number;
  name: string;
  cleanName: string;
  imageUrl: string;
  groupId: number;
  url: string;
  extendedData: TcgcsvExtendedData[];
}

/** One row per (product, finish) — TCGplayer prices each finish separately. */
export interface TcgcsvPrice {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  subTypeName: string;
}
