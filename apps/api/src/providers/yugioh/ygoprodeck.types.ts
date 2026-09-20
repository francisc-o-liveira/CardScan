/** Raw shapes returned by the YGOPRODeck v7 API (https://ygoprodeck.com/api-guide/) — not normalized. */

export interface YgoCardSetEntry {
  set_name: string;
  /** Print code such as "DB1-EN102" (set prefix + language + number). */
  set_code: string;
  set_rarity: string;
  set_rarity_code?: string;
}

export interface YgoCardImage {
  id: number;
  image_url: string;
  image_url_small?: string;
  image_url_cropped?: string;
}

export interface YgoCard {
  id: number;
  name: string;
  type: string;
  race?: string;
  card_sets?: YgoCardSetEntry[];
  /** First entry is the default artwork; further entries are alternate artworks. */
  card_images: YgoCardImage[];
}

export interface YgoCardInfoResponse {
  data: YgoCard[];
}

export interface YgoSet {
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date?: string;
  set_image?: string;
}
