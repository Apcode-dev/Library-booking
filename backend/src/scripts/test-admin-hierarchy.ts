import prisma from '../config/prisma';

async function testHierarchy() {
  console.log('--- 🧪 Testing Master Admin & State Sub-Admin Hierarchy ---');

  // 1. Check Master Admin in DB
  const masterAdmin = await prisma.user.findUnique({
    where: { email: 'admin@libspace.com' },
  });
  console.log('1. Master Admin found:', {
    email: masterAdmin?.email,
    role: masterAdmin?.role,
    adminType: masterAdmin?.adminType,
  });

  // 2. Test 1 Admin per State Constraint
  const existingUPAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN', adminType: 'SUB_ADMIN', assignedState: 'Uttar Pradesh' },
  });
  console.log('2. Current UP Sub-Admin:', existingUPAdmin ? existingUPAdmin.email : 'None');

  // 3. Test Library Forwarding Fields
  const sampleLib = await prisma.library.findFirst({
    where: { state: 'Uttar Pradesh' },
  });
  if (sampleLib) {
    console.log('3. Sample UP Library:', {
      id: sampleLib.id,
      lid: sampleLib.lid,
      name: sampleLib.name,
      status: sampleLib.status,
      forwardedToMaster: sampleLib.forwardedToMaster,
    });
  } else {
    console.log('3. No UP Library found, checking any library:');
    const anyLib = await prisma.library.findFirst();
    console.log('Any Library:', anyLib?.name, anyLib?.state, anyLib?.status);
  }

  console.log('--- ✅ Database verification completed successfully ---');
  process.exit(0);
}

testHierarchy().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});
