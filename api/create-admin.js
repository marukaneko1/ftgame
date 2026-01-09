const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  
  console.log(`Setting up admin user: ${email}`);
  
  // Hash the password
  const passwordHash = await argon2.hash(password);
  
  // Generate unique username from email (handle duplicates)
  const baseUsername = email.split('@')[0];
  let username = baseUsername;
  let counter = 1;
  
  // Ensure username is unique
  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username }
    });
    if (!existing) break;
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
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
        passwordHash: passwordHash,
        username: existingUser.username // Keep existing username
      }
    });
    console.log(`✓ Updated existing user ${email} to admin with new password`);
    console.log(`  Username: ${existingUser.username}`);
  } else {
    // Create new admin user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: 'Admin User',
        username: username,
        isAdmin: true,
        is18PlusVerified: true,
        kycStatus: 'VERIFIED'
      }
    });
    console.log(`✓ Created new admin user ${email}`);
    console.log(`  Username: ${username}`);
  }
  
  console.log(`\nLogin credentials:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`\nNote: Password "${password}" may not meet standard password requirements.`);
  console.log(`For production, use a stronger password with uppercase, lowercase, number, and special character.`);
}

main()
  .catch((error) => {
    console.error('Error:', error.message);
    if (error.code === 'P2002') {
      console.error('Username or email already exists. Try a different email or username.');
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());




