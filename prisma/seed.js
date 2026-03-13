import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // No static seed data by default.
  // You can add your own initial data here if needed.
  console.log("Prisma seed completed (no static data).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

