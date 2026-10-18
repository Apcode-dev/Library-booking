const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking all libraries in database...');
  const libraries = await prisma.library.findMany({
    include: {
      seatZones: {
        include: {
          seats: true,
        },
      },
    },
  });

  console.log(`Found ${libraries.length} libraries.`);

  for (const lib of libraries) {
    console.log(`\nLibrary: "${lib.name}" (ID: ${lib.id})`);
    console.log(`  Current Zones: ${lib.seatZones.map(z => z.name).join(', ')}`);
    console.log(`  Total Seats: ${lib.seatZones.reduce((acc, z) => acc + z.seats.length, 0)}`);

    // Check if library already has distinct HOURLY, MONTHLY, and YEARLY seats
    const allSeats = lib.seatZones.flatMap(z => z.seats);
    const hourlySeats = allSeats.filter(s => s.category === 'HOURLY');
    const monthlySeats = allSeats.filter(s => s.category === 'MONTHLY');
    const yearlySeats = allSeats.filter(s => s.category === 'YEARLY');

    console.log(`  Seat distribution -> Hourly: ${hourlySeats.length}, Monthly: ${monthlySeats.length}, Yearly: ${yearlySeats.length}`);

    // If monthly or yearly seats are 0, we must structure the library to have proper categories
    if (monthlySeats.length === 0 || yearlySeats.length === 0) {
      console.log(`  ⚡ Updating library "${lib.name}" to have dedicated Hourly, Monthly & Yearly seats...`);

      // Update library settings
      await prisma.library.update({
        where: { id: lib.id },
        data: {
          enableMembership: true,
          enableMonthly: true,
          monthlyRate: lib.monthlyRate || (lib.hourlyRate * 80) || 1200,
          monthlyDetails: lib.monthlyDetails || '30 Days Dedicated Desk + Unlimited Access + 1x Daily QR Attendance',
          enableYearly: true,
          yearlyRate: lib.yearlyRate || (lib.hourlyRate * 750) || 12000,
          yearlyDetails: lib.yearlyDetails || '365 Days Fixed VIP Desk + Personal Locker + 1x Daily QR Attendance',
          taxPercent: lib.taxPercent ?? 0,
          serviceFee: lib.serviceFee ?? 0,
          extraChargesDesc: lib.extraChargesDesc || 'Service & Maintenance Fee',
          hourlySeats: 10,
          monthlySeats: 5,
          yearlySeats: 5,
          totalSeats: 20,
        },
      });

      // Check if bookings or locks exist for this library
      const existingBookings = await prisma.booking.count({ where: { libraryId: lib.id } });
      const existingLocks = await prisma.seatLock.count({ where: { seat: { libraryId: lib.id } } });

      if (existingBookings === 0 && existingLocks === 0) {
        // Safe to recreate clean 3-zone layout
        console.log(`  Recreating 3 clean zones: Hourly (10), Monthly (5), Yearly (5)...`);
        await prisma.seat.deleteMany({ where: { libraryId: lib.id } });
        await prisma.seatZone.deleteMany({ where: { libraryId: lib.id } });

        // 1. Hourly Zone
        const hourlyZone = await prisma.seatZone.create({
          data: {
            libraryId: lib.id,
            name: '⏱️ Hourly Study Desks',
            description: 'Silent flexible desks for hourly learning sessions',
          },
        });
        for (let i = 1; i <= 10; i++) {
          await prisma.seat.create({
            data: {
              libraryId: lib.id,
              zoneId: hourlyZone.id,
              seatNumber: `H-${String(i).padStart(2, '0')}`,
              category: 'HOURLY',
              seatType: 'REGULAR',
              hourlyPrice: lib.hourlyRate || 35,
              hasPowerSocket: i % 2 === 0,
              hasLamp: true,
              isAvailable: true,
            },
          });
        }

        // 2. Monthly Pass Zone
        const monthlyZone = await prisma.seatZone.create({
          data: {
            libraryId: lib.id,
            name: '👑 Monthly Pass Desks',
            description: 'Reserved dedicated desks for 30-day continuous passholders',
          },
        });
        for (let i = 1; i <= 5; i++) {
          await prisma.seat.create({
            data: {
              libraryId: lib.id,
              zoneId: monthlyZone.id,
              seatNumber: `M-${String(i).padStart(2, '0')}`,
              category: 'MONTHLY',
              seatType: 'PREMIUM',
              hourlyPrice: lib.hourlyRate || 35,
              hasPowerSocket: true,
              hasLamp: true,
              isAvailable: true,
            },
          });
        }

        // 3. Yearly VIP Zone
        const yearlyZone = await prisma.seatZone.create({
          data: {
            libraryId: lib.id,
            name: '👑 Yearly VIP Desks',
            description: 'Fixed ergonomic pods reserved for 365-day annual passholders',
          },
        });
        for (let i = 1; i <= 5; i++) {
          await prisma.seat.create({
            data: {
              libraryId: lib.id,
              zoneId: yearlyZone.id,
              seatNumber: `Y-${String(i).padStart(2, '0')}`,
              category: 'YEARLY',
              seatType: 'VIP',
              hourlyPrice: lib.hourlyRate || 35,
              hasPowerSocket: true,
              hasLamp: true,
              isAvailable: true,
            },
          });
        }
        console.log(`  ✅ Created 20 categorized seats across 3 zones.`);
      } else {
        // Bookings exist: divide existing seats or update them
        console.log(`  Existing bookings detected (${existingBookings}), updating existing zones/seats...`);
        // If there are existing seats, convert first 50% to HOURLY, 25% to MONTHLY, 25% to YEARLY
        const total = allSeats.length;
        const hCount = Math.max(1, Math.floor(total * 0.5));
        const mCount = Math.max(1, Math.floor(total * 0.25));

        for (let i = 0; i < total; i++) {
          let cat = 'HOURLY';
          if (i >= hCount && i < hCount + mCount) cat = 'MONTHLY';
          else if (i >= hCount + mCount) cat = 'YEARLY';

          await prisma.seat.update({
            where: { id: allSeats[i].id },
            data: { category: cat },
          });
        }
        console.log(`  ✅ Assigned categories to existing seats.`);
      }
    }
  }

  console.log('\n🎉 Finished updating libraries and seat categories.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
