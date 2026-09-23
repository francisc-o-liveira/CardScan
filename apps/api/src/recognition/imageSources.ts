/** The smallest image each source offers that is still larger than the model's input (224x308). */
export const indexImageUrl = (url: string): string =>
  url
    .replace("cards.scryfall.io/large/", "cards.scryfall.io/normal/")
    .replace(/(assets\.tcgdex\.net\/.+)\/high\.(webp|png|jpg)$/, "$1/low.$2");
