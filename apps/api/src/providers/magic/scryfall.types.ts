/** Raw shapes returned by the Scryfall API (https://scryfall.com/docs/api) — not normalized. */

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  released_at?: string;
  set_type: string;
  card_count: number;
  icon_svg_uri?: string;
  digital: boolean;
}

export interface ScryfallSetList {
  data: ScryfallSet[];
  has_more: boolean;
}

export interface ScryfallImageUris {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  art_crop?: string;
  border_crop?: string;
}

export interface ScryfallCardFace {
  name: string;
  image_uris?: ScryfallImageUris;
}

/** One printing of one card — the unit of the `default_cards` bulk file. */
export interface ScryfallCard {
  id: string;
  name: string;
  lang: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  released_at?: string;
  digital: boolean;
  layout: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  /** This printing's TCGplayer productId — absent for cards TCGplayer doesn't sell. */
  tcgplayer_id?: number;
}

export interface ScryfallBulkDataEntry {
  type: string;
  updated_at: string;
  /** Current field name for the download link; kept optional in case Scryfall reverts the earlier `download_uri` naming. */
  jsonl_download_uri?: string;
  download_uri?: string;
}

export interface ScryfallBulkDataList {
  data: ScryfallBulkDataEntry[];
}
