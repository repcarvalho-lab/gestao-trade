import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const reports = await prisma.weeklyReport.findMany();
  console.log("Found reports:", reports.length);
  if (reports.length > 0) {
    console.log("Sample report keys:", Object.keys(reports[0]));
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
