import nodemailer from 'nodemailer';

async function test() {
  console.log('Testing Brevo SMTP...');
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SENDER_EMAIL || 'ap.code.in@gmail.com',
      pass: process.env.BREVO_API_KEY || 'your-brevo-api-key-here',
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"LibSpace Platform" <ap.code.in@gmail.com>',
      to: 'adarshcsbhu@gmail.com',
      subject: '🔐 LibSpace Verification Test OTP: 852963',
      text: 'Your verification OTP is 852963. Valid for 10 minutes.',
      html: '<h3>Your LibSpace OTP is: <b>852963</b></h3>',
    });
    console.log('✅ Brevo SMTP SUCCESS! MessageId:', info.messageId);
  } catch (err: any) {
    console.error('❌ Brevo SMTP Failed:', err.message);
  }
}

test();
