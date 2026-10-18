import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all database records for a fresh start...');
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatLock.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.seatZone.deleteMany();
  await prisma.library.deleteMany();
  await prisma.user.deleteMany();
  await prisma.emailVerification.deleteMany();

  console.log('🛡️ Seeding default Admin user...');
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@libspace.com',
      password: adminPasswordHash,
      role: 'ADMIN',
      phone: '9999999999',
      isApproved: true,
      approvalStatus: 'APPROVED',
    },
  });

  console.log(`✅ Default Admin created: ${adminUser.email}`);
  console.log('✅ Database is clean and ready for real registrations!');
}

main()
  .catch((e) => {
    console.error('Error during clean seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
