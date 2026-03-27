import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    "select data_type, udt_name from information_schema.columns where table_name='Notification' and column_name='type'"
  );
  console.log(rows);

  const enumVals = await prisma.$queryRawUnsafe(
    "select e.enumlabel as value from pg_type t join pg_enum e on t.oid = e.enumtypid where t.typname = 'NotificationType' order by e.enumsortorder"
  );
  console.log(enumVals);

  const cols = await prisma.$queryRawUnsafe(
    "select column_name, data_type, udt_name, is_nullable from information_schema.columns where table_name='Notification' order by ordinal_position"
  );
  console.log(cols);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

