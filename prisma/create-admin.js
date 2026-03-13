import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = "Admin123!"; // change if you like
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mel.org" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@mel.org",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("Admin created/updated:", admin.email, "password:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });