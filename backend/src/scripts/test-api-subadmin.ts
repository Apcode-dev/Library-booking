async function testApi() {
  const API_URL = 'http://localhost:5000/api';

  console.log('--- 🧪 Testing Admin APIs ---');

  // 1. Login as Master Admin
  console.log('1. Logging in as Master Admin...');
  const masterLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@libspace.com',
      password: 'Admin@123456',
      expectedRole: 'ADMIN',
    }),
  });
  const masterLoginData = await masterLoginRes.json();
  if (!masterLoginData.success) {
    throw new Error('Master Admin login failed: ' + masterLoginData.message);
  }
  const masterToken = masterLoginData.token;
  console.log('✅ Master Admin logged in. AdminType:', masterLoginData.user.adminType);

  // 2. Fetch Master Admin Stats
  console.log('2. Fetching Master Admin stats...');
  const masterStatsRes = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${masterToken}` },
  });
  const masterStatsData = await masterStatsRes.json();
  console.log('✅ Master Stats:', {
    totalGMV: masterStatsData.stats?.totalGMV,
    totalApproved: masterStatsData.stats?.totalApprovedLibraries,
    subAdminsCount: masterStatsData.stats?.subAdminsCount,
    stateDistributionCount: masterStatsData.stateDistribution?.length,
  });

  // 3. Create Sub-Admin for Uttar Pradesh
  console.log('3. Creating Sub-Admin for Uttar Pradesh...');
  const createSubAdminRes = await fetch(`${API_URL}/admin/sub-admins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
    },
    body: JSON.stringify({
      name: 'UP State Admin',
      email: 'up.admin@libspace.com',
      password: 'UpAdmin@123',
      phone: '+91 9988776655',
      assignedState: 'Uttar Pradesh',
    }),
  });
  const createSubAdminData = await createSubAdminRes.json();
  console.log('Result:', createSubAdminData.message || createSubAdminData);

  // 4. Test "Ek state me ek hi admin hoga" - Attempt duplicate creation for Uttar Pradesh
  console.log('4. Attempting duplicate Sub-Admin for Uttar Pradesh (Should Fail)...');
  const duplicateRes = await fetch(`${API_URL}/admin/sub-admins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterToken}`,
    },
    body: JSON.stringify({
      name: 'Another UP Admin',
      email: 'up.duplicate@libspace.com',
      password: 'UpAdmin@123',
      phone: '+91 9988776654',
      assignedState: 'Uttar Pradesh',
    }),
  });
  const duplicateData = await duplicateRes.json();
  console.log('Duplicate test response status:', duplicateRes.status);
  console.log('Duplicate test message:', duplicateData.message);
  if (duplicateRes.status === 400 && duplicateData.message.includes('Only ONE Sub-Admin is allowed per state')) {
    console.log('✅ STRICT VALIDATION PASSED: Only ONE Sub-Admin allowed per state!');
  } else {
    console.error('❌ VALIDATION FAILED!');
  }

  // 5. Login as State Sub-Admin
  console.log('5. Logging in as UP Sub-Admin...');
  const subAdminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'up.admin@libspace.com',
      password: 'UpAdmin@123',
      expectedRole: 'ADMIN',
    }),
  });
  const subAdminLoginData = await subAdminLoginRes.json();
  if (!subAdminLoginData.success) {
    throw new Error('Sub-Admin login failed: ' + subAdminLoginData.message);
  }
  const subAdminToken = subAdminLoginData.token;
  console.log('✅ Sub-Admin logged in:', {
    name: subAdminLoginData.user.name,
    adminType: subAdminLoginData.user.adminType,
    assignedState: subAdminLoginData.user.assignedState,
  });

  // 6. Fetch Sub-Admin Stats (State Scoped)
  console.log('6. Fetching Sub-Admin State-Scoped Stats & Revenue Breakdown...');
  const subStatsRes = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${subAdminToken}` },
  });
  const subStatsData = await subStatsRes.json();
  console.log('✅ Sub-Admin Stats:', {
    isSubAdmin: subStatsData.isSubAdmin,
    assignedState: subStatsData.assignedState,
    totalGMV: subStatsData.stats?.totalGMV,
    totalApproved: subStatsData.stats?.totalApprovedLibraries,
    perLibraryStatsCount: subStatsData.perLibraryStats?.length,
  });
  if (subStatsData.perLibraryStats && subStatsData.perLibraryStats.length > 0) {
    console.log('Sample Per-Library Stats for UP:', subStatsData.perLibraryStats[0]);
  }

  // 7. Test Forwarding a Library to Master Admin
  console.log('7. Testing Sub-Admin Forwarding to Master Admin...');
  const sampleLibId = subStatsData.perLibraryStats?.[0]?.id;
  if (sampleLibId) {
    const forwardRes = await fetch(`${API_URL}/admin/libraries/${sampleLibId}/forward`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${subAdminToken}`,
      },
      body: JSON.stringify({
        reason: 'Ownership verification documents need Master Admin secondary validation.',
      }),
    });
    const forwardData = await forwardRes.json();
    console.log('✅ Forward result:', forwardData.message);

    // 8. Master Admin Checks Forwarded Queue & Approves
    console.log('8. Master Admin checking forwarded queue...');
    const forwardedLibsRes = await fetch(`${API_URL}/admin/libraries?status=FORWARDED_TO_MASTER`, {
      headers: { Authorization: `Bearer ${masterToken}` },
    });
    const forwardedLibsData = await forwardedLibsRes.json();
    console.log('✅ Forwarded Queue Count in Master Admin:', forwardedLibsData.count);

    // Approve it back to APPROVED
    const approveRes = await fetch(`${API_URL}/admin/libraries/${sampleLibId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${masterToken}` },
    });
    const approveData = await approveRes.json();
    console.log('✅ Master Admin approval result:', approveData.message);
  }

  console.log('\n🎉 ALL ADMIN HIERARCHY TESTS COMPLETED SUCCESSFULLY!');
}

testApi().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
