const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Organizing libraries into 3 dedicated zones: Hourly, Monthly, Yearly...');

  const libraries = await prisma.library.findMany({
    include: {
      seatZones: {
        include: {
          seats: true,
        },
      },
    },
  });

  for (const lib of libraries) {
    console.log(`\nProcessing Library: "${lib.name}" (${lib.id})`);

    // Ensure or find the 3 zones
    let hourlyZone = await prisma.seatZone.findFirst({
      where: { libraryId: lib.id, name: { contains: 'Hourly' } },
    });
    if (!hourlyZone) {
      hourlyZone = await prisma.seatZone.create({
        data: {
          libraryId: lib.id,
          name: '⏱️ Hourly Study Desks',
          description: 'Dedicated desks for hourly revision & flexible study sessions',
        },
      });
      console.log('  Created Hourly Zone');
    }

    let monthlyZone = await prisma.seatZone.findFirst({
      where: { libraryId: lib.id, name: { contains: 'Monthly' } },
    });
    if (!monthlyZone) {
      monthlyZone = await prisma.seatZone.create({
        data: {
          libraryId: lib.id,
          name: '👑 Monthly Pass Desks',
          description: 'Reserved dedicated desks for 30-day continuous passholders',
        },
      });
      console.log('  Created Monthly Zone');
    }

    let yearlyZone = await prisma.seatZone.findFirst({
      where: { libraryId: lib.id, name: { contains: 'Yearly' } },
    });
    if (!yearlyZone) {
      yearlyZone = await prisma.seatZone.create({
        data: {
          libraryId: lib.id,
          name: '👑 Yearly VIP Desks',
          description: 'Fixed ergonomic pods reserved for 365-day annual passholders',
        },
      });
      console.log('  Created Yearly Zone');
    }

    // Collect all existing seats
    const allSeats = await prisma.seat.findMany({
      where: { libraryId: lib.id },
      orderBy: { seatNumber: 'asc' },
    });

    // Move existing seats to the appropriate zone based on their category
    for (const seat of allSeats) {
      let targetZoneId = hourlyZone.id;
      if (seat.category === 'MONTHLY') {
        targetZoneId = monthlyZone.id;
      } else if (seat.category === 'YEARLY') {
        targetZoneId = yearlyZone.id;
      } else {
        // default HOURLY
        targetZoneId = hourlyZone.id;
      }

      if (seat.seatZoneId !== targetZoneId) {
        await prisma.seat.update({
          where: { id: seat.id },
          data: { seatZoneId: targetZoneId },
        });
      }
    }

    // Count how many seats in each zone
    let hourlyCount = await prisma.seat.count({ where: { libraryId: lib.id, category: 'HOURLY' } });
    let monthlyCount = await prisma.seat.count({ where: { libraryId: lib.id, category: 'MONTHLY' } });
    let yearlyCount = await prisma.seat.count({ where: { libraryId: lib.id, category: 'YEARLY' } });

    console.log(`  Current counts -> Hourly: ${hourlyCount}, Monthly: ${monthlyCount}, Yearly: ${yearlyCount}`);

    // If hourly < 10, add more hourly seats
    if (hourlyCount < 10) {
      for (let i = hourlyCount + 1; i <= 10; i++) {
        await prisma.seat.create({
          data: {
            libraryId: lib.id,
            seatZoneId: hourlyZone.id,
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
      hourlyCount = 10;
    }

    // If monthly < 5, add more monthly seats
    if (monthlyCount < 5) {
      for (let i = monthlyCount + 1; i <= 5; i++) {
        await prisma.seat.create({
          data: {
            libraryId: lib.id,
            seatZoneId: monthlyZone.id,
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
      monthlyCount = 5;
    }

    // If yearly < 5, add more yearly seats
    if (yearlyCount < 5) {
      for (let i = yearlyCount + 1; i <= 5; i++) {
        await prisma.seat.create({
          data: {
            libraryId: lib.id,
            seatZoneId: yearlyZone.id,
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
      yearlyCount = 5;
    }

    // Remove legacy empty zones (like old "Main Reading Floor" with 0 seats)
    const oldEmptyZones = await prisma.seatZone.findMany({
      where: {
        libraryId: lib.id,
        id: { notIn: [hourlyZone.id, monthlyZone.id, yearlyZone.id] },
        seats: { none: {} },
      },
    });
    for (const emptyZ of oldEmptyZones) {
      await prisma.seatZone.delete({ where: { id: emptyZ.id } });
      console.log(`  Deleted old empty zone: "${emptyZ.name}"`);
    }

    // Update library seat totals
    const finalTotal = hourlyCount + monthlyCount + yearlyCount;
    await prisma.library.update({
      where: { id: lib.id },
      data: {
        hourlySeats: hourlyCount,
        monthlySeats: monthlyCount,
        yearlySeats: yearlyCount,
        totalSeats: finalTotal,
        enableMembership: true,
        enableMonthly: true,
        enableYearly: true,
      },
    });

    console.log(`  ✅ Library "${lib.name}" organized: ${hourlyCount} Hourly, ${monthlyCount} Monthly, ${yearlyCount} Yearly. Total: ${finalTotal}`);
  }

  console.log('\n🎉 All libraries organized successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
