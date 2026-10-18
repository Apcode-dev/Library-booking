const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const libs = await prisma.library.findMany({
    include: {
      seatZones: {
        include: {
          seats: true,
        },
      },
    },
  });

  for (const l of libs) {
    console.log(`\nLibrary: "${l.name}"`);
    console.log(`  enableMembership: ${l.enableMembership}, enableMonthly: ${l.enableMonthly}, enableYearly: ${l.enableYearly}`);
    console.log(`  monthlyRate: ₹${l.monthlyRate}, yearlyRate: ₹${l.yearlyRate}, hourlyRate: ₹${l.hourlyRate}`);
    for (const z of l.seatZones) {
      console.log(`  Zone "${z.name}":`);
      console.log(`    Seats: ${z.seats.map(s => s.seatNumber + ' [' + s.category + ']').join(', ')}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
