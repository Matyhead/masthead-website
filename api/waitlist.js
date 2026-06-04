// Vercel Serverless Function - POST /api/waitlist
// Inserts a waitlist signup into Supabase. Keys stay server-side.
// Runs on Node.js 18+ with global fetch available.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_TEXT_RE = /^[a-zA-Z0-9 _./:#?&=-]{0,160}$/;
const CONSENT_VERSION = '2026-06-04';

function cleanText(value, fallback = '', maxLength = 120) {
  const text = (value || '').toString().trim().slice(0, maxLength);
  return SAFE_TEXT_RE.test(text) ? text : fallback;
}

function cleanLanguage(value) {
  const lang = (value || '').toString().trim().toLowerCase();
  return ['en', 'cs'].includes(lang) ? lang : 'en';
}

async function insertWaitlistSignup({ supabaseUrl, supabaseKey, payload }) {
  return fetch(`${supabaseUrl}/rest/v1/waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'return=minimal,resolution=ignore-duplicates'
    },
    body: JSON.stringify(payload)
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const email = (body.email || '').toString().trim().toLowerCase();
  const source = cleanText(body.source, 'website', 40);
  const website = (body.website || '').toString().trim();
  const language = cleanLanguage(body.language);
  const pagePath = cleanText(body.page_path, '/', 120);
  const utmSource = cleanText(body.utm_source, '', 80);
  const utmMedium = cleanText(body.utm_medium, '', 80);
  const utmCampaign = cleanText(body.utm_campaign, '', 120);

  if (website) {
    return res.status(200).json({ ok: true });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
    return res.status(500).json({ error: 'Server is not configured yet. Please try again later.' });
  }

  try {
    const fullPayload = {
      email,
      source,
      language,
      page_path: pagePath,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      privacy_consent: true,
      consent_version: CONSENT_VERSION,
      consent_text: 'User submitted the Masthead beta waitlist form.'
    };
    const minimalPayload = { email, source };
    let resp = await insertWaitlistSignup({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_KEY,
      payload: fullPayload
    });
    let detail = '';

    if (resp.status === 409) {
      return res.status(200).json({ ok: true, message: "You're already on the list." });
    }

    if (!resp.ok) {
      detail = await resp.text().catch(() => '');
      console.error('Supabase full insert failed, retrying minimal payload:', resp.status, detail);
      resp = await insertWaitlistSignup({
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_KEY,
        payload: minimalPayload
      });
    }

    if (resp.status === 409) {
      return res.status(200).json({ ok: true, message: "You're already on the list." });
    }

    if (!resp.ok) {
      const retryDetail = await resp.text().catch(() => '');
      console.error('Supabase insert failed:', resp.status, retryDetail || detail);
      return res.status(502).json({ error: 'Something went wrong. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Waitlist handler error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
