/**
 * Script to set a user as admin
 * Usage: npx ts-node scripts/set-admin.ts <user-email>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
      select: { id: true, email: true, displayName: true, isAdmin: true }
    });

    console.log(`✅ User ${user.email} (${user.displayName}) is now an admin!`);
    console.log(`User ID: ${user.id}`);
  } catch (error: any) {
    if (error.code === "P2025") {
      console.error(`❌ User with email "${email}" not found`);
    } else {
      console.error("❌ Error:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx ts-node scripts/set-admin.ts <user-email>");
  process.exit(1);
}

setAdmin(email);
