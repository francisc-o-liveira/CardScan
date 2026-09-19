/** Slug identifying a supported trading card game. New TCGs are added by extending this union. */
export type TcgSlug = "pokemon" | "magic";

export interface Tcg {
  id: string;
  slug: TcgSlug;
  name: string;
  isEnabled: boolean;
}

export interface CardSet {
  id: string;
  tcgId: string;
  code: string;
  name: string;
  releaseDate: string | null;
  totalCards: number | null;
  symbolUrl: string | null;
}
