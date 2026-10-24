import https from 'https';
import { ENV } from '../config/env';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  devOtp?: string;
  error?: string;
}

/**
 * Dispatches an HTTP POST request to Brevo SMTP API strictly over IPv4
 * to ensure that the request originates from the authorised IPv4 address.
 */
function sendBrevoPost(payload: any): Promise<{ ok: boolean; status: number; data: any }> {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        family: 4, // Enforce IPv4 to match Brevo authorised IP whitelist
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': ENV.BREVO_API_KEY,
          'content-length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { message: raw };
          }
          resolve({
            ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300,
            status: res.statusCode ?? 500,
            data: parsed,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        ok: false,
        status: 500,
        data: { message: err.message },
      });
    });

    req.write(postData);
    req.end();
  });
}

export class EmailService {
  /**
   * Sends an OTP email using Brevo (Sendinblue) Transactional API over IPv4.
   */
  static async sendOtpEmail(params: {
    toEmail: string;
    toName: string;
    otp: string;
    purpose: 'REGISTRATION' | 'LOGIN' | 'FORGOT_PASSWORD';
  }): Promise<SendEmailResult> {
    const { toEmail, toName, otp, purpose } = params;

    let subject = 'LibSpace Login Verification';
    let title = 'One-Time Login Code';
    let actionText = 'sign in to your LibSpace account';

    if (purpose === 'REGISTRATION') {
      subject = 'Verify Your Email For LibSpace';
      title = 'Verify Your Email Address';
      actionText = 'complete your account registration on LibSpace';
    } else if (purpose === 'FORGOT_PASSWORD') {
      subject = 'Reset Your Password - LibSpace';
      title = 'Password Reset Request';
      actionText = 'reset your password';
    }

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">LibSpace</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #dbeafe;">Library Seat Booking Platform</p>
        </div>
        
        <div style="padding: 28px 24px; color: #1e293b;">
          <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; color: #0f172a;">
            ${title}
          </h2>
          
          <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 20px;">
            Hello <strong>${toName || 'there'}</strong>,<br/>
            Use the 6-digit one-time password (OTP) below to ${actionText}. This code is strictly confidential and expires in <strong>10 minutes</strong>.
          </p>
          
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #2563eb; background: #eff6ff; border: 2px dashed #bfdbfe; border-radius: 12px; padding: 12px 28px;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin-top: 24px;">
            If you did not request this OTP, you can safely ignore this email. No changes will be made to your account.
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          © 2026 LibSpace Platform. Powered by Brevo Transactional Email API.
        </div>
      </div>
    `;

    try {
      console.log(`📨 [Brevo Email] Sending ${purpose} OTP ${otp} to ${toEmail} over IPv4...`);

      const result = await sendBrevoPost({
        sender: {
          name: ENV.BREVO_SENDER_NAME,
          email: ENV.BREVO_SENDER_EMAIL,
        },
        to: [{ email: toEmail, name: toName || 'User' }],
        subject,
        htmlContent,
      });

      if (!result.ok) {
        console.warn('⚠️ Brevo API Error:', result.data);
        console.log(`\n======================================================`);
        console.log(`🔑 [CONSOLE OTP FALLBACK]`);
        console.log(`👤 Target: ${toEmail} (${toName || 'User'})`);
        console.log(`🎯 Purpose: ${purpose}`);
        console.log(`🔐 Active Code: ${otp}`);
        console.log(`⚠️ Brevo status: ${result.data?.message || 'Dispatch failed'}`);
        console.log(`======================================================\n`);
        const errorMsg = result.data?.message || 'Brevo transactional email dispatch failed.';
        return {
          success: false,
          error: errorMsg,
        };
      }

      console.log(`✅ [Brevo Email] Successfully dispatched to ${toEmail}! MessageId:`, result.data.messageId);
      return { success: true, messageId: result.data.messageId };
    } catch (err: any) {
      console.error('❌ Failed to call Brevo API:', err.message);
      console.log(`\n======================================================`);
      console.log(`🔑 [CONSOLE OTP FALLBACK] (Network Exception)`);
      console.log(`👤 Target: ${toEmail}`);
      console.log(`🔐 Active Code: ${otp}`);
      console.log(`======================================================\n`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Notifies a Library Owner when their account has been approved by the Admin.
   */
  static async sendOwnerApprovalEmail(toEmail: string, toName: string): Promise<void> {
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #10b981;">🎉 Congratulations! Your Owner Account is Approved</h2>
        <p>Dear <strong>${toName}</strong>,</p>
        <p>Your library owner account on <strong>LibSpace</strong> has been reviewed and verified by our administration team.</p>
        <p>You can now log in to the Owner Portal to add your study libraries, configure seat zones, and manage live student bookings.</p>
        <div style="margin: 20px 0;">
          <a href="${ENV.CLIENT_URL}" style="background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Login to Owner Portal
          </a>
        </div>
        <p style="font-size: 11px; color: #94a3b8;">Team LibSpace</p>
      </div>
    `;

    try {
      await sendBrevoPost({
        sender: { name: ENV.BREVO_SENDER_NAME, email: ENV.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject: '🎉 Your LibSpace Owner Account has been Approved!',
        htmlContent,
      });
    } catch (_) {}
  }

  /**
   * Notifies a student when their seat booking time has ended / completed.
   */
  static async sendBookingOverStudentEmail(params: {
    toEmail: string;
    toName: string;
    libraryName: string;
    seatNumber: string;
    bookingCode: string;
  }): Promise<void> {
    const { toEmail, toName, libraryName, seatNumber, bookingCode } = params;
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 20px; text-align: center; color: #ffffff; border-radius: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">LibSpace</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #dbeafe;">Booking Session Completed</p>
        </div>
        <h2 style="color: #2563eb; font-size: 18px; margin-top: 0;">⏰ Study Desk Duration Completed</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hello <strong>${toName}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Your study session for <strong>Desk ${seatNumber}</strong> at <strong>${libraryName}</strong> (Pass Code: <strong style="font-family: monospace; color: #2563eb;">${bookingCode}</strong>) has reached its completion time.
        </p>
        <p style="font-size: 13px; color: #059669; font-weight: bold; background: #ecfdf5; padding: 10px 14px; border-radius: 10px; border: 1px solid #a7f3d0;">
          ✅ The desk has been automatically released and marked Available for new student bookings.
        </p>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Thank you for studying with LibSpace!</p>
      </div>
    `;

    try {
      await sendBrevoPost({
        sender: { name: ENV.BREVO_SENDER_NAME, email: ENV.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject: `⏰ Booking Completed - Desk ${seatNumber} at ${libraryName}`,
        htmlContent,
      });
    } catch (_) {}
  }

  /**
   * Notifies a library owner when a student's seat booking time has ended / completed.
   */
  static async sendBookingOverOwnerEmail(params: {
    toEmail: string;
    toName: string;
    studentName: string;
    libraryName: string;
    seatNumber: string;
    bookingCode: string;
  }): Promise<void> {
    const { toEmail, toName, studentName, libraryName, seatNumber, bookingCode } = params;
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #d97706, #ea580c); padding: 20px; text-align: center; color: #ffffff; border-radius: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">LibSpace Owner Alert</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #fef3c7;">Desk Session Completion Notice</p>
        </div>
        <h2 style="color: #d97706; font-size: 18px; margin-top: 0;">⏰ Desk Session Completed</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">Dear <strong>${toName}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Student <strong>${studentName}</strong>'s study session for <strong>Desk ${seatNumber}</strong> at <strong>${libraryName}</strong> (Pass Code: <strong style="font-family: monospace; color: #d97706;">${bookingCode}</strong>) has ended.
        </p>
        <p style="font-size: 13px; color: #059669; font-weight: bold; background: #ecfdf5; padding: 10px 14px; border-radius: 10px; border: 1px solid #a7f3d0;">
          ✅ Desk ${seatNumber} is now marked Available on your Owner Portal floor plan.
        </p>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">LibSpace Automation Service</p>
      </div>
    `;

    try {
      await sendBrevoPost({
        sender: { name: ENV.BREVO_SENDER_NAME, email: ENV.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject: `⏰ Desk ${seatNumber} Session Completed - ${libraryName}`,
        htmlContent,
      });
    } catch (_) {}
  }

  /**
   * Sends check-in reminder to student (at 30 mins or 90 mins)
   */
  static async sendCheckInReminderEmail(params: {
    toEmail: string;
    toName: string;
    libraryName: string;
    seatNumber: string;
    bookingCode: string;
    minutesElapsed: number;
  }): Promise<void> {
    const { toEmail, toName, libraryName, seatNumber, bookingCode, minutesElapsed } = params;
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; text-align: center; color: #ffffff; border-radius: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">LibSpace Check-in Reminder</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #fef3c7;">Action Required</p>
        </div>
        <h2 style="color: #d97706; font-size: 18px; margin-top: 0;">🔔 Please Check In for Desk ${seatNumber}</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hello <strong>${toName}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Your booking at <strong>${libraryName}</strong> started <strong>${minutesElapsed} minutes ago</strong> (Pass: <code>${bookingCode}</code>), but our system has not recorded your check-in yet.
        </p>
        <p style="font-size: 13px; color: #b45309; background: #fffbeb; padding: 12px; border-radius: 8px; border: 1px solid #fde68a;">
          ⚠️ <strong>Important:</strong> If your session expires without check-in, the desk will be released and only a 30% refund will apply as per library no-show rules. Please scan your QR pass at the library desk.
        </p>
      </div>
    `;

    try {
      await sendBrevoPost({
        sender: { name: ENV.BREVO_SENDER_NAME, email: ENV.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject: `🔔 Check-in Reminder (${minutesElapsed}m): Desk ${seatNumber} at ${libraryName}`,
        htmlContent,
      });
    } catch (_) {}
  }

  /**
   * Notifies student about 30% No-Show refund after session expires without check-in
   */
  static async sendNoShowRefundEmail(params: {
    toEmail: string;
    toName: string;
    libraryName: string;
    seatNumber: string;
    bookingCode: string;
    totalPaid: number;
    refundAmount: number;
  }): Promise<void> {
    const { toEmail, toName, libraryName, seatNumber, bookingCode, totalPaid, refundAmount } = params;
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 20px; text-align: center; color: #ffffff; border-radius: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">LibSpace Refund Notice</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #fee2e2;">Booking Expired Without Check-In</p>
        </div>
        <h2 style="color: #b91c1c; font-size: 18px; margin-top: 0;">30% No-Show Refund Processed</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hello <strong>${toName}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Your booking for <strong>Desk ${seatNumber}</strong> at <strong>${libraryName}</strong> (Pass: <code>${bookingCode}</code>) has expired without a recorded check-in.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 15px 0; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Total Paid:</span>
            <strong>₹${totalPaid.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #ef4444;">
            <span>No-Show Retention (70%):</span>
            <strong>- ₹${(totalPaid - refundAmount).toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; color: #059669; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
            <span>Refunded to You (30%):</span>
            <span>₹${refundAmount.toFixed(2)}</span>
          </div>
        </div>
        <p style="font-size: 13px; color: #64748b;">
          The refund of ₹${refundAmount.toFixed(2)} has been automatically credited back to your original payment method. Desk ${seatNumber} has been released.
        </p>
      </div>
    `;

    try {
      await sendBrevoPost({
        sender: { name: ENV.BREVO_SENDER_NAME, email: ENV.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject: `💵 30% Refund Processed: Booking ${bookingCode} Expired Without Check-in`,
        htmlContent,
      });
    } catch (_) {}
  }

  /**
   * Notifies student about 50% voluntary cancellation refund
   */
  static async sendCancellationRefundEmail(params: {
    toEmail: string;
    toName: string;
    libraryName: string;
    seatNumber: string;
    bookingCode: string;
    totalPaid: number;
    refundAmount: number;
    cancellationFee: number;
  }): Promise<void> {
    const { toEmail, toName, libraryName, seatNumber, bookingCode, totalPaid, refundAmount, cancellationFee } = params;
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #6366f1, #4338ca); padding: 20px; text-align: center; color: #ffffff; border-radius: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">LibSpace Booking Cancelled</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #e0e7ff;">Cancellation & 50% Refund Confirmation</p>
        </div>
        <h2 style="color: #4338ca; font-size: 18px; margin-top: 0;">50% Refund Initiated</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hello <strong>${toName}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Your booking for <strong>Desk ${seatNumber}</strong> at <strong>${libraryName}</strong> (Pass: <code>${bookingCode}</code>) has been successfully cancelled.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 15px 0; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>Total Paid:</span>
            <strong>₹${totalPaid.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #ef4444;">
            <span>Cancellation Fee (50%):</span>
            <strong>- ₹${cancellationFee.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; color: #059669; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
            <span>Refunded to You (50%):</span>
            <span>₹${refundAmount.toFixed(2)}</span>
          </div>
        </div>
        <p style="font-size: 13px; color: #64748b;">
          The ₹${refundAmount.toFixed(2)} refund has been initiated to your original payment method. The desk has been made immediately available for other users.
        </p>
      </div>
    `;

    try {
      await sendBrevoPost({
        sender: { name: ENV.BREVO_SENDER_NAME, email: ENV.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject: `💵 Booking Cancelled - 50% Refund (₹${refundAmount.toFixed(2)}) Initiated`,
        htmlContent,
      });
    } catch (_) {}
  }
}
