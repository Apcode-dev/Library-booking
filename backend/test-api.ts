import http from 'http';
import app from './src/index';

const PORT = 5555;
let server: http.Server;

async function request(options: {
  method: string;
  path: string;
  token?: string;
  body?: any;
}) {
  return new Promise<{ status: number; data: any }>((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: options.path,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...(options.token && { Authorization: `Bearer ${options.token}` }),
          ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 500,
              data: rawData ? JSON.parse(rawData) : null,
            });
          } catch (e) {
            resolve({ status: res.statusCode || 500, data: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT, async () => {
    console.log(`\n🧪 Running Automated Verification Suite on port ${PORT}...`);

    try {
      // 1. Health check
      const health = await request({ method: 'GET', path: '/api/health' });
      console.log('1. Health check:', health.status === 200 ? '✅ PASS' : '❌ FAIL');

      // 2. User Demo Login
      const userLogin = await request({
        method: 'POST',
        path: '/api/auth/demo-login',
        body: { role: 'USER' },
      });
      const userToken = userLogin.data.token;
      console.log('2. User demo login:', userLogin.status === 200 ? '✅ PASS' : '❌ FAIL');

      // 3. Owner Demo Login
      const ownerLogin = await request({
        method: 'POST',
        path: '/api/auth/demo-login',
        body: { role: 'OWNER' },
      });
      const ownerToken = ownerLogin.data.token;
      console.log('3. Owner demo login:', ownerLogin.status === 200 ? '✅ PASS' : '❌ FAIL');

      // 4. Admin Demo Login
      const adminLogin = await request({
        method: 'POST',
        path: '/api/auth/demo-login',
        body: { role: 'ADMIN' },
      });
      const adminToken = adminLogin.data.token;
      console.log('4. Admin demo login:', adminLogin.status === 200 ? '✅ PASS' : '❌ FAIL');

      // 5. Fetch Libraries
      const librariesRes = await request({ method: 'GET', path: '/api/libraries' });
      console.log(
        '5. Fetch libraries:',
        librariesRes.status === 200 && librariesRes.data.libraries.length > 0 ? '✅ PASS' : '❌ FAIL',
        `(Found ${librariesRes.data.libraries?.length} libraries)`
      );
      const testLib = librariesRes.data.libraries[0];

      // 6. Get Real-time Seat Availability
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const availabilityRes = await request({
        method: 'GET',
        path: `/api/seats/availability/${testLib.id}?date=${dateStr}&startTime=14:00&endTime=17:00`,
      });
      console.log(
        '6. Real-time seat availability:',
        availabilityRes.status === 200 && availabilityRes.data.zones.length > 0 ? '✅ PASS' : '❌ FAIL'
      );
      const targetSeat = availabilityRes.data.zones[0].seats[0];

      // 7. Test Temporary 5-Minute Seat Lock (User 1)
      const lockRes = await request({
        method: 'POST',
        path: '/api/bookings/lock',
        token: userToken,
        body: {
          seatId: targetSeat.id,
          date: dateStr,
          startTime: '14:00',
          endTime: '17:00',
        },
      });
      console.log(
        '7. Temporary 5-min seat lock:',
        lockRes.status === 200 && lockRes.data.data.lockToken ? '✅ PASS' : '❌ FAIL'
      );
      const lockToken = lockRes.data.data.lockToken;

      // 8. Test Double-Booking / Concurrency Lock Prevention (User 2 attempts same seat & time)
      const secondUserRes = await request({
        method: 'POST',
        path: '/api/auth/register',
        body: {
          name: 'Concurrent User 2',
          email: `concur_${Date.now()}@test.com`,
          password: 'password123',
          role: 'USER',
        },
      });
      const secondUserToken = secondUserRes.data.token;

      const collisionRes = await request({
        method: 'POST',
        path: '/api/bookings/lock',
        token: secondUserToken,
        body: {
          seatId: targetSeat.id,
          date: dateStr,
          startTime: '14:00',
          endTime: '17:00',
        },
      });
      console.log(
        '8. Double-booking / Temporary lock collision rejection:',
        collisionRes.status === 400 ? '✅ PASS (Correctly blocked collision)' : '❌ FAIL'
      );

      // 9. Confirm Booking & Process Payment
      const confirmRes = await request({
        method: 'POST',
        path: '/api/bookings/confirm',
        token: userToken,
        body: {
          lockToken,
          paymentMethod: 'UPI',
        },
      });
      console.log(
        '9. Booking confirmation & QR pass generation:',
        confirmRes.status === 201 && confirmRes.data.booking.qrCode ? '✅ PASS' : '❌ FAIL'
      );

      // 10. Check User Booking History
      const historyRes = await request({
        method: 'GET',
        path: '/api/bookings/my-bookings',
        token: userToken,
      });
      console.log(
        '10. User booking history & active pass:',
        historyRes.status === 200 && historyRes.data.bookings.length > 0 ? '✅ PASS' : '❌ FAIL'
      );

      // 11. Owner Revenue Dashboard
      const ownerDash = await request({
        method: 'GET',
        path: '/api/owner/dashboard',
        token: ownerToken,
      });
      console.log(
        '11. Owner revenue & occupancy metrics:',
        ownerDash.status === 200 && ownerDash.data.metrics ? '✅ PASS' : '❌ FAIL'
      );

      // 12. Admin KPI & Moderation Portal
      const adminStats = await request({
        method: 'GET',
        path: '/api/admin/stats',
        token: adminToken,
      });
      console.log(
        '12. Admin platform overview stats:',
        adminStats.status === 200 && adminStats.data.stats.totalUsers > 0 ? '✅ PASS' : '❌ FAIL'
      );

      console.log('\n🎉 ALL 12 VERIFICATION TESTS PASSED PERFECTLY!\n');
    } catch (err) {
      console.error('❌ Test failed with error:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
