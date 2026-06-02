// Vercel Serverless Function — POST /api/waitlist
// Inserts a waitlist signup into Supabase. Keys stay server-side (env vars).
// Runs on Node.js 18+ (global fetch available — no dependencies needed).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Body may arrive parsed (Vercel) or as a raw string — handle both.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const email = (body.email || '').toString().trim().toLowerCase();
  const source = (body.source || 'website').toString().slice(0, 40);

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
    return res.status(500).json({ error: 'Server is not configured yet. Please try again later.' });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal,resolution=ignore-duplicates'
      },
      body: JSON.stringify({ email, source })
    });

    // Duplicate email (unique constraint) → treat as success: they're already on the list.
    if (resp.status === 409) {
      return res.status(200).json({ ok: true, message: "You're already on the list." });
    }

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error('Supabase insert failed:', resp.status, detail);
      return res.status(502).json({ error: 'Something went wrong. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Waitlist handler error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
