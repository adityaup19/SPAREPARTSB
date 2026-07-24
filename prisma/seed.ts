import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const result = await seedDatabase(prisma);
  console.log("Database seeded successfully!");
  console.log(`Created ${result.projects} projects`);
  console.log(`Created ${result.parts} parts (${result.units} total units)`);
  console.log(`Created ${result.reservations} reservations`);
  console.log(`Created ${result.activities} activity logs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
