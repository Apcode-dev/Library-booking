import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Purging all data from database...');

  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatLock.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.seatZone.deleteMany();
  await prisma.library.deleteMany();
  await prisma.user.deleteMany();
  await prisma.emailVerification.deleteMany();

  console.log('✨ Database completely wiped clean! 0 users, 0 libraries, 0 bookings.');
}

clean()
  .catch((e) => {
    console.error('Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
