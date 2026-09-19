import { PrismaClient } from "../apps/api/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  await prisma.tcg.upsert({
    where: { slug: "pokemon" },
    update: {},
    create: { slug: "pokemon", name: "Pokémon", isEnabled: true },
  });

  await prisma.tcg.upsert({
    where: { slug: "magic" },
    update: {},
    create: { slug: "magic", name: "Magic: The Gathering", isEnabled: true },
  });
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
