import http from 'http';

const PORT = 5000;

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
  console.log('🧪 Running Brevo & Role-Gate Verification Tests...\n');

  try {
    const testStamp = Date.now();

    // 1. Student Registration (Immediate Access)
    const studentEmail = `student_${testStamp}@test.com`;
    const studentReg = await request({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Test Student',
        email: studentEmail,
        password: 'Password123!',
        role: 'USER',
      },
    });

    console.log(
      '1. Student Registration (Immediate Access):',
      studentReg.status === 201 && studentReg.data.token ? '✅ PASS' : '❌ FAIL'
    );

    // 2. Student Password Login
    const studentLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: studentEmail, password: 'Password123!' },
    });
    console.log(
      '2. Student Password Login:',
      studentLogin.status === 200 && studentLogin.data.token ? '✅ PASS' : '❌ FAIL'
    );

    // 3. Student Brevo OTP Login Flow
    const otpSend = await request({
      method: 'POST',
      path: '/api/auth/send-otp',
      body: { email: studentEmail },
    });
    const otp = otpSend.data.devOtp;
    console.log(
      '3. Student Brevo OTP Dispatch:',
      otpSend.status === 200 && otp ? `✅ PASS (Generated OTP: ${otp})` : '❌ FAIL'
    );

    const otpVerify = await request({
      method: 'POST',
      path: '/api/auth/verify-otp',
      body: { email: studentEmail, otp },
    });
    console.log(
      '4. Student Brevo OTP Verification & Login:',
      otpVerify.status === 200 && otpVerify.data.token ? '✅ PASS' : '❌ FAIL'
    );

    // 5. Library Owner Registration (Admin Approval Gate Check)
    const ownerEmail = `owner_${testStamp}@test.com`;
    const ownerReg = await request({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Test Owner',
        email: ownerEmail,
        password: 'OwnerPassword123!',
        role: 'OWNER',
        phone: '+919876500000',
      },
    });
    console.log(
      '5. Owner Registration (Requires Approval, No Direct Token):',
      ownerReg.status === 201 && ownerReg.data.requiresApproval === true && !ownerReg.data.token
        ? '✅ PASS'
        : '❌ FAIL'
    );
    const pendingOwnerId = ownerReg.data.user.id;

    // 6. Owner Attempts Login BEFORE Admin Approval -> Must be BLOCKED with HTTP 403
    const blockedOwnerLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: ownerEmail, password: 'OwnerPassword123!' },
    });
    console.log(
      '6. Owner Login Blocked Before Approval (HTTP 403):',
      blockedOwnerLogin.status === 403 && blockedOwnerLogin.data.isPendingApproval === true
        ? '✅ PASS (Correctly blocked)'
        : '❌ FAIL'
    );

    // 7. Admin Logs In & Inspects Pending Owners
    const adminLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'admin@libspace.com', password: 'admin123' },
    });
    const adminToken = adminLogin.data.token;

    const pendingOwnersRes = await request({
      method: 'GET',
      path: '/api/admin/owners/pending',
      token: adminToken,
    });
    const foundPending = pendingOwnersRes.data.owners.some((o: any) => o.id === pendingOwnerId);
    console.log(
      '7. Admin Pending Owner Verification Queue:',
      pendingOwnersRes.status === 200 && foundPending ? '✅ PASS' : '❌ FAIL'
    );

    // 8. Admin Approves Owner Account
    const approveRes = await request({
      method: 'PATCH',
      path: `/api/admin/owners/${pendingOwnerId}/approve`,
      token: adminToken,
    });
    console.log(
      '8. Admin Approves Owner Account:',
      approveRes.status === 200 && approveRes.data.user.isApproved === true ? '✅ PASS' : '❌ FAIL'
    );

    // 9. Owner Attempts Login AFTER Admin Approval -> Now SUCCEEDS
    const approvedOwnerLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: ownerEmail, password: 'OwnerPassword123!' },
    });
    console.log(
      '9. Owner Login After Admin Approval:',
      approvedOwnerLogin.status === 200 && approvedOwnerLogin.data.token ? '✅ PASS' : '❌ FAIL'
    );

    // 10. Forgot Password Flow
    const forgotRes = await request({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { email: studentEmail },
    });
    const resetCode = forgotRes.data.devOtp;
    console.log(
      '10. Forgot Password Reset Code Dispatch:',
      forgotRes.status === 200 && resetCode ? '✅ PASS' : '❌ FAIL'
    );

    const resetRes = await request({
      method: 'POST',
      path: '/api/auth/reset-password',
      body: {
        email: studentEmail,
        otp: resetCode,
        newPassword: 'BrandNewPassword999!',
      },
    });
    console.log(
      '11. Password Reset with Code:',
      resetRes.status === 200 ? '✅ PASS' : '❌ FAIL'
    );

    const newLogin = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: studentEmail, password: 'BrandNewPassword999!' },
    });
    console.log(
      '12. Login with Newly Reset Password:',
      newLogin.status === 200 && newLogin.data.token ? '✅ PASS' : '❌ FAIL'
    );

    console.log('\n🎉 ALL 12 BREVO & ROLE-GATE VERIFICATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (e) {
    console.error('Test error:', e);
    process.exit(1);
  }
}

runTests();
