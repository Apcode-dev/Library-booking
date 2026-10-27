import { EmailService } from '../services/email.service';

async function testAllNotificationTypes() {
  const targetEmail = 'pbhai2734@gmail.com';
  const targetName = 'Pawan Student';
  const ownerEmail = 'pbhai2734@gmail.com'; // using same test inbox
  const ownerName = 'Raja Library Owner';
  const libraryName = 'Raja Library (Rajatalab)';
  const seatNumber = 'H-01';
  const bookingCode = 'LIB-TEST-999';

  console.log(`\n======================================================`);
  console.log(`🚀 STARTING COMPREHENSIVE EMAIL NOTIFICATION TEST`);
  console.log(`🎯 Recipient Target: ${targetEmail}`);
  console.log(`======================================================\n`);

  // 1. Registration OTP Email
  console.log('1️⃣ Testing Registration Verification OTP...');
  await EmailService.sendOtpEmail({
    toEmail: targetEmail,
    toName: targetName,
    otp: '482910',
    purpose: 'REGISTRATION',
  });

  // 2. Forgot Password OTP Email
  console.log('\n2️⃣ Testing Password Reset OTP...');
  await EmailService.sendOtpEmail({
    toEmail: targetEmail,
    toName: targetName,
    otp: '839201',
    purpose: 'FORGOT_PASSWORD',
  });

  // 3. Booking Confirmation Email (Student)
  console.log('\n3️⃣ Testing Real-time Booking Confirmation (Student)...');
  await EmailService.sendBookingConfirmationStudentEmail({
    toEmail: targetEmail,
    toName: targetName,
    libraryName,
    seatNumber,
    bookingCode,
    bookingType: 'HOURLY',
    date: '2026-10-28',
    startTime: '10:00',
    endTime: '12:00',
    totalAmount: 40.0,
  });

  // 4. Booking Confirmation Email (Library Owner)
  console.log('\n4️⃣ Testing Real-time Booking Alert (Owner)...');
  await EmailService.sendBookingConfirmationOwnerEmail({
    toEmail: ownerEmail,
    toName: ownerName,
    studentName: targetName,
    libraryName,
    seatNumber,
    bookingCode,
    bookingType: 'HOURLY',
    date: '2026-10-28',
    startTime: '10:00',
    endTime: '12:00',
    totalAmount: 40.0,
  });

  // 5. Check-in Reminder (30 mins)
  console.log('\n5️⃣ Testing Check-in Reminder (30 mins)...');
  await EmailService.sendCheckInReminderEmail({
    toEmail: targetEmail,
    toName: targetName,
    libraryName,
    seatNumber,
    bookingCode,
    minutesElapsed: 30,
  });

  // 6. Pass Time Over / Desk Session Completed (Student)
  console.log('\n6️⃣ Testing Session Completed Alert (Student)...');
  await EmailService.sendBookingOverStudentEmail({
    toEmail: targetEmail,
    toName: targetName,
    libraryName,
    seatNumber,
    bookingCode,
  });

  // 7. Pass Time Over / Desk Session Completed (Owner)
  console.log('\n7️⃣ Testing Desk Released Alert (Owner)...');
  await EmailService.sendBookingOverOwnerEmail({
    toEmail: ownerEmail,
    toName: ownerName,
    studentName: targetName,
    libraryName,
    seatNumber,
    bookingCode,
  });

  // 8. 30% No-Show Refund Email
  console.log('\n8️⃣ Testing 30% No-Show Auto-Refund Alert...');
  await EmailService.sendNoShowRefundEmail({
    toEmail: targetEmail,
    toName: targetName,
    libraryName,
    seatNumber,
    bookingCode,
    totalPaid: 100.0,
    refundAmount: 30.0,
  });

  // 9. 50% Cancellation Refund Email
  console.log('\n9️⃣ Testing 50% Voluntary Cancellation Refund Alert...');
  await EmailService.sendCancellationRefundEmail({
    toEmail: targetEmail,
    toName: targetName,
    libraryName,
    seatNumber,
    bookingCode,
    totalPaid: 100.0,
    refundAmount: 50.0,
    cancellationFee: 50.0,
  });

  // 10. Owner Account Approved Email
  console.log('\n🔟 Testing Library Owner Approval Alert...');
  await EmailService.sendOwnerApprovalEmail(targetEmail, targetName);

  console.log(`\n======================================================`);
  console.log(`✅ COMPREHENSIVE EMAIL NOTIFICATION TEST COMPLETED`);
  console.log(`======================================================\n`);
}

testAllNotificationTypes().catch(console.error);
