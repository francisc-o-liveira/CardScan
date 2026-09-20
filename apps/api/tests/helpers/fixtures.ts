import { prisma } from "../../src/config/prisma";

/** Small catalog with three TCGs, used by the catalog route tests. */
export async function seedCatalog() {
  const pokemon = await prisma.tcg.create({ data: { slug: "pokemon", name: "Pokémon" } });
  const magic = await prisma.tcg.create({ data: { slug: "magic", name: "Magic: The Gathering" } });
  const yugioh = await prisma.tcg.create({ data: { slug: "yugioh", name: "Yu-Gi-Oh!" } });

  const base = await prisma.cardSet.create({
    data: { tcgId: pokemon.id, code: "base1", name: "Base Set", releaseDate: new Date("1999-01-09"), totalCards: 102 },
  });
  const jungle = await prisma.cardSet.create({
    data: { tcgId: pokemon.id, code: "base2", name: "Jungle", releaseDate: new Date("1999-06-16"), totalCards: 64 },
  });
  const alpha = await prisma.cardSet.create({
    data: { tcgId: magic.id, code: "lea", name: "Limited Edition Alpha", releaseDate: new Date("1993-08-05") },
  });
  const ygoSet = await prisma.cardSet.create({
    data: { tcgId: yugioh.id, code: "legend-of-blue-eyes-white-dragon", name: "Legend of Blue Eyes White Dragon" },
  });

  const card = (tcgId: string, setId: string, collectorNumber: string, name: string, extra = {}) =>
    prisma.card.create({
      data: { tcgId, setId, collectorNumber, variant: "", name, imageUrl: `https://img.test/${name}.webp`, ...extra },
    });

  const charizard = await card(pokemon.id, base.id, "4", "Charizard", { rarity: "Rare Holo" });
  const alakazam = await card(pokemon.id, base.id, "1", "Alakazam");
  const clefable = await card(pokemon.id, jungle.id, "1", "Clefable", { imageUrl: null });
  const lotus = await card(magic.id, alpha.id, "232", "Black Lotus", { rarity: "rare" });
  const dragon = await card(yugioh.id, ygoSet.id, "LOB-EN001", "Blue-Eyes White Dragon", {
    rarity: "Ultra Rare",
    variant: "Ultra Rare",
  });

  return {
    tcgs: { pokemon, magic, yugioh },
    sets: { base, jungle, alpha, ygoSet },
    cards: { charizard, alakazam, clefable, lotus, dragon },
  };
}
