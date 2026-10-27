import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  PLATFORM_COMMISSION_PERCENT: 10.0, // 10% platform fee
  TAX_PERCENT: 5.0, // 5% GST/tax
  SEAT_LOCK_DURATION_MINUTES: 5, // 5-minute temporary hold
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'ap.code.in@gmail.com',
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'LibSpace',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_THFHFpRR2qfrt7',
};
