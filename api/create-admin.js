const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  
  console.log(`Setting up admin user: ${email}`);
  
  const passwordHash = await argon2.hash(password);
  
  // Try to find existing user
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });
  
  if (existingUser) {
    // Update existing user to be admin
    await prisma.user.update({
      where: { email },
      data: {
        isAdmin: true,
        passwordHash: passwordHash
      }
    });
    console.log(`✓ Updated existing user ${email} to admin with new password`);
  } else {
    // Create new admin user
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: 'Admin User',
        username: email.split('@')[0],
        isAdmin: true,
        is18PlusVerified: true,
        kycStatus: 'VERIFIED'
      }
    });
    console.log(`✓ Created new admin user ${email}`);
  }
  
  console.log(`\nLogin credentials:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());




