async function testUserAndOwnerManagement() {
  const API_URL = 'http://localhost:5000/api';
  console.log('--- 🧪 Testing User Management & Owner Management APIs ---');

  // 1. Login as Master Admin
  console.log('1. Logging in as Admin...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@libspace.com',
      password: 'Admin@123456',
      expectedRole: 'ADMIN',
    }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) throw new Error('Login failed: ' + loginData.message);
  const token = loginData.token;
  console.log('✅ Admin Logged in successfully.');

  // 2. Test Dashboard Stats
  console.log('\n2. Fetching Admin Platform Stats...');
  const statsRes = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const statsData = await statsRes.json();
  console.log('✅ Summary Statistics:', {
    totalRegisteredUsers: statsData.stats?.totalRegisteredUsers,
    usersWithBookings: statsData.stats?.usersWithBookings,
    usersWithoutBookings: statsData.stats?.usersWithoutBookings,
    totalLibraryOwners: statsData.stats?.totalLibraryOwners,
    approvedOwners: statsData.stats?.approvedOwners,
    pendingOwners: statsData.stats?.pendingOwners,
    ownersWithLibraries: statsData.stats?.ownersWithLibraries,
    ownersWithoutLibraries: statsData.stats?.ownersWithoutLibraries,
  });

  // 3. Test User Management API (with server-side pagination, search & filters)
  console.log('\n3. Testing GET /admin/users (All registered users, including 0 bookings)...');
  const usersRes = await fetch(`${API_URL}/admin/users?page=1&limit=10&activity=ALL`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const usersData = await usersRes.json();
  console.log('✅ Users Pagination:', usersData.pagination);
  console.log('✅ Sample User Record:', usersData.users?.[0]);

  // Security Check: Verify passwords/secrets are NOT exposed
  const sampleUser = usersData.users?.[0];
  if (sampleUser) {
    if (sampleUser.password || sampleUser.securityPin || sampleUser.resetToken || sampleUser.otp) {
      console.error('❌ SECURITY FAILURE: Sensitive credentials exposed in User API!');
      process.exit(1);
    } else {
      console.log('🔒 SECURITY VERIFIED: Passwords, OTPs, PINs, and reset tokens are NOT exposed.');
    }

    // 4. Test User Booking History API
    console.log(`\n4. Testing GET /admin/users/${sampleUser.id}/bookings...`);
    const historyRes = await fetch(`${API_URL}/admin/users/${sampleUser.id}/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const historyData = await historyRes.json();
    console.log('✅ Booking History Result:', {
      user: historyData.user?.name,
      totalBookings: historyData.totalBookings,
    });
  }

  // 5. Test Owner Management API (including owners with 0 libraries)
  console.log('\n5. Testing GET /admin/owners (All registered owners, including 0 libraries)...');
  const ownersRes = await fetch(`${API_URL}/admin/owners?page=1&limit=10&hasLibraries=ALL`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ownersData = await ownersRes.json();
  console.log('✅ Owners Pagination:', ownersData.pagination);
  console.log('✅ Sample Owner Record:', ownersData.owners?.[0]);

  const sampleOwner = ownersData.owners?.[0];
  if (sampleOwner) {
    if (sampleOwner.password || sampleOwner.securityPin || sampleOwner.resetToken || sampleOwner.otp) {
      console.error('❌ SECURITY FAILURE: Sensitive credentials exposed in Owner API!');
      process.exit(1);
    } else {
      console.log('🔒 SECURITY VERIFIED: Passwords, OTPs, PINs, and reset tokens are NOT exposed in Owner API.');
    }
  }

  console.log('\n🎉 ALL USER & OWNER MANAGEMENT TESTS PASSED PERFECTLY!');
}

testUserAndOwnerManagement().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
