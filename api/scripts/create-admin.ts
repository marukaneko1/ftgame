/**
 * Script to create an admin user
 * Usage: npx ts-node scripts/create-admin.ts
 */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = "admin@example.com";
    const password = "admin1234"; // 8 characters minimum
    const displayName = "Admin";
    const username = "admin";

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`User ${email} already exists. Making them admin...`);
      const updated = await prisma.user.update({
        where: { email },
        data: { isAdmin: true },
        select: { id: true, email: true, displayName: true, isAdmin: true }
      });
      console.log(`✅ User ${updated.email} is now an admin!`);
      console.log(`User ID: ${updated.id}`);
      return;
    }

    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      console.error(`❌ Username "${username}" is already taken`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create user with admin flag
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        username,
        isAdmin: true,
        dateOfBirth: new Date("1990-01-01"), // Set a default DOB
        is18PlusVerified: true, // Auto-verify for admin
        wallet: {
          create: {}
        },
        subscription: {
          create: {
            status: "ACTIVE" // Give admin an active subscription
          }
        }
      },
      select: { id: true, email: true, displayName: true, username: true, isAdmin: true }
    });

    console.log(`✅ Admin user created successfully!`);
    console.log(`Email: ${user.email}`);
    console.log(`Username: ${user.username}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Is Admin: ${user.isAdmin}`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

