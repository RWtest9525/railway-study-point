export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount } = req.body;

  // Supports both VITE_ and regular env vars, trims to remove invisible whitespace/newlines
  const keyId = String(process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = String(process.env.RAZORPAY_SECRET || '').trim();

  if (!keyId || !keySecret) {
    return res.status(500).json({ error: 'Missing Razorpay keys in server environment.' });
  }

  try {
    const authPath = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authPath}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(amount), // must be integer
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.description || 'Failed to create order on Razorpay');
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message });
  }
}
