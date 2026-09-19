/** Raw shapes returned by the TCGdex REST API (https://tcgdex.dev) — not normalized. */

export interface TcgdexSetBrief {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: {
    total: number;
    official: number;
  };
}

export interface TcgdexCardBrief {
  id: string;
  localId: string;
  name: string;
  /** Base image URL — needs a `/{quality}.{ext}` suffix to be fetchable. Absent for some promos. */
  image?: string;
}

export interface TcgdexSetDetail extends TcgdexSetBrief {
  serie: { id: string; name: string };
  releaseDate?: string;
  legal?: { standard: boolean; expanded: boolean };
  cards: TcgdexCardBrief[];
}
