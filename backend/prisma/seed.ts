import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging old database records on Neon PostgreSQL...');
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatLock.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.seatZone.deleteMany();
  await prisma.library.deleteMany();
  await prisma.user.deleteMany();
  await prisma.emailVerification.deleteMany();

  console.log('🛡️ Creating default Admin user...');
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

  console.log('👤 Creating default Student user (pbhai2734@gmail.com)...');
  const studentPasswordHash = await bcrypt.hash('123456', 10);
  const studentUser = await prisma.user.create({
    data: {
      name: 'Pawan Student',
      email: 'pbhai2734@gmail.com',
      password: studentPasswordHash,
      role: 'USER',
      phone: '9876543210',
      isApproved: true,
      approvalStatus: 'APPROVED',
    },
  });
  console.log(`✅ Student created: ${studentUser.email}`);

  console.log('🏢 Creating default Library Owner...');
  const ownerPasswordHash = await bcrypt.hash('Owner@123456', 10);
  const ownerUser = await prisma.user.create({
    data: {
      name: 'Raja Library Owner',
      email: 'owner@libspace.com',
      password: ownerPasswordHash,
      role: 'OWNER',
      phone: '9123456789',
      isApproved: true,
      approvalStatus: 'APPROVED',
    },
  });
  console.log(`✅ Owner created: ${ownerUser.email}`);

  console.log('📚 Creating sample libraries with seats and zones...');
  const rajaLibrary = await prisma.library.create({
    data: {
      lid: 'LID-101',
      name: 'Raja Library',
      slug: 'raja-library-0808',
      tagline: 'Quiet & Focus-Friendly Study Environment',
      description: 'Fully air-conditioned reading halls, high-speed fiber internet, and individual power desks.',
      address: 'Rajatalab Elgoss Side',
      city: 'Rajatalab',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      pincode: '221311',
      latitude: 28.6139,
      longitude: 77.209,
      photos: JSON.stringify(['https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&auto=format&fit=crop&q=80']),
      facilities: JSON.stringify(['Air Conditioned', 'High-speed WiFi', 'Power Sockets', 'Silent Study Zone']),
      hourlyRate: 20,
      dailyRate: 160,
      monthlyRate: 3000,
      yearlyRate: 15000,
      enableMembership: true,
      enableMonthly: true,
      monthlyDetails: '30 Days Dedicated Desk + Unlimited Access + 1x Daily QR Attendance',
      enableYearly: true,
      yearlyDetails: '365 Days Fixed VIP Desk + Personal Locker + 1x Daily QR Attendance',
      taxPercent: 0,
      serviceFee: 0,
      extraChargesDesc: 'Service & Maintenance Fee',
      hourlySeats: 10,
      monthlySeats: 5,
      yearlySeats: 5,
      openingTime: '07:00',
      closingTime: '23:00',
      totalSeats: 20,
      status: 'APPROVED',
      ownerId: ownerUser.id,
    },
  });

  const silentZone = await prisma.seatZone.create({
    data: {
      name: 'Silent Study Zone',
      description: 'Pin-drop silence section for serious exam preparation.',
      libraryId: rajaLibrary.id,
    },
  });

  const vipZone = await prisma.seatZone.create({
    data: {
      name: 'Executive VIP Bay',
      description: 'Premium ergonomic cabins with private lockers.',
      libraryId: rajaLibrary.id,
    },
  });

  // Create 10 Hourly seats
  for (let i = 1; i <= 10; i++) {
    await prisma.seat.create({
      data: {
        seatNumber: `H-${i < 10 ? '0' + i : i}`,
        seatType: 'STANDARD',
        category: 'HOURLY',
        hourlyPrice: 20,
        hasPowerSocket: true,
        hasLamp: true,
        isAvailable: true,
        libraryId: rajaLibrary.id,
        seatZoneId: silentZone.id,
      },
    });
  }

  // Create 5 Monthly seats
  for (let i = 1; i <= 5; i++) {
    await prisma.seat.create({
      data: {
        seatNumber: `M-0${i}`,
        seatType: 'PREMIUM_ERGONOMIC',
        category: 'MONTHLY',
        hourlyPrice: 20,
        hasPowerSocket: true,
        hasLamp: true,
        isAvailable: true,
        libraryId: rajaLibrary.id,
        seatZoneId: silentZone.id,
      },
    });
  }

  // Create 5 Yearly seats
  for (let i = 1; i <= 5; i++) {
    await prisma.seat.create({
      data: {
        seatNumber: `VIP-0${i}`,
        seatType: 'PRIVATE_CUBICLE',
        category: 'YEARLY',
        hourlyPrice: 20,
        hasPowerSocket: true,
        hasLamp: true,
        isAvailable: true,
        libraryId: rajaLibrary.id,
        seatZoneId: vipZone.id,
      },
    });
  }

  console.log('✅ Raja Library and 20 categorized seats created!');
  console.log('🎉 Neon PostgreSQL database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
