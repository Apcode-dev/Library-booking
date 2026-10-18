import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

async function test() {
  console.log('Testing Brevo API v3...');
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || 'your-brevo-api-key-here',
      },
      body: JSON.stringify({
        sender: { name: 'LibSpace Platform', email: 'ap.code.in@gmail.com' },
        to: [{ email: 'adarshcsbhu@gmail.com', name: 'Adarsh' }],
        subject: 'Verify Your Email For LibSpace',
        htmlContent: '<h3>Your LibSpace OTP code is: <b>948271</b></h3><p>Valid for 10 minutes.</p>',
      }),
    });

    const status = res.status;
    const data = await res.json();
    console.log('Status:', status);
    console.log('Response:', data);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

test();
