import { PrismaClient } from "../apps/api/generated/prisma";

const prisma = new PrismaClient();

const TCGS = [
  { slug: "pokemon", name: "Pokémon" },
  { slug: "magic", name: "Magic: The Gathering" },
  { slug: "yugioh", name: "Yu-Gi-Oh!" },
  { slug: "lorcana", name: "Disney Lorcana" },
  { slug: "onepiece", name: "One Piece" },
  { slug: "digimon", name: "Digimon" },
  { slug: "starwars", name: "Star Wars: Unlimited" },
  { slug: "fab", name: "Flesh and Blood" },
];

async function main() {
  for (const tcg of TCGS) {
    await prisma.tcg.upsert({
      where: { slug: tcg.slug },
      update: { name: tcg.name },
      create: { slug: tcg.slug, name: tcg.name, isEnabled: true },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
