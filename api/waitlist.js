// Vercel Serverless Function - POST /api/waitlist
// Inserts a waitlist signup into Supabase. Keys stay server-side.
// Runs on Node.js 18+ with global fetch available.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_TEXT_RE = /^[a-zA-Z0-9 _./:#?&=-]{0,160}$/;
const CONSENT_VERSION = '2026-06-04';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

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

function waitlistEmailContent(language) {
  if (language === 'cs') {
    return {
      subject: 'Jste na waitlistu Mastheadu',
      text: [
        'Diky, jste na waitlistu Mastheadu.',
        '',
        'Ozveme se, jakmile otevreme dalsi pilotni sloty pro e-commerce tymy.',
        '',
        'Masthead pomaha menit produktovy kontext na schvaleny obsah, kampanovou kreativu a learning loop pro dalsi run.',
        '',
        'Matyas z Mastheadu',
        'hello@themasthead.cz'
      ].join('\n'),
      html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#080907;color:#f7f4ec;padding:32px">
          <div style="max-width:560px;margin:0 auto;border:1px solid rgba(247,244,236,.16);border-radius:12px;padding:28px;background:#10110f">
            <p style="margin:0 0 14px;color:#72e0b3;font-weight:800;text-transform:uppercase;font-size:12px;letter-spacing:.08em">Masthead beta</p>
            <h1 style="margin:0 0 14px;font-size:28px;line-height:1.12;color:#f7f4ec">Jste na waitlistu.</h1>
            <p style="margin:0 0 16px;color:#d8d2c4;line-height:1.6">Diky. Ozveme se, jakmile otevreme dalsi pilotni sloty pro e-commerce tymy.</p>
            <p style="margin:0 0 22px;color:#a8a295;line-height:1.6">Masthead pomaha menit produktovy kontext na schvaleny obsah, kampanovou kreativu a learning loop pro dalsi run.</p>
            <p style="margin:0;color:#d8d2c4;line-height:1.5">Matyas z Mastheadu<br><a href="mailto:hello@themasthead.cz" style="color:#72e0b3">hello@themasthead.cz</a></p>
          </div>
        </div>
      `
    };
  }
  return {
    subject: "You're on the Masthead waitlist",
    text: [
      "Thanks, you're on the Masthead waitlist.",
      '',
      "We'll reach out when the next pilot slots open for e-commerce teams.",
      '',
      'Masthead helps turn product context into approved content, campaign-ready creative and a learning loop for the next run.',
      '',
      'Matyas from Masthead',
      'hello@themasthead.cz'
    ].join('\n'),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#080907;color:#f7f4ec;padding:32px">
        <div style="max-width:560px;margin:0 auto;border:1px solid rgba(247,244,236,.16);border-radius:12px;padding:28px;background:#10110f">
          <p style="margin:0 0 14px;color:#72e0b3;font-weight:800;text-transform:uppercase;font-size:12px;letter-spacing:.08em">Masthead beta</p>
          <h1 style="margin:0 0 14px;font-size:28px;line-height:1.12;color:#f7f4ec">You're on the waitlist.</h1>
          <p style="margin:0 0 16px;color:#d8d2c4;line-height:1.6">Thanks. We'll reach out when the next pilot slots open for e-commerce teams.</p>
          <p style="margin:0 0 22px;color:#a8a295;line-height:1.6">Masthead helps turn product context into approved content, campaign-ready creative and a learning loop for the next run.</p>
          <p style="margin:0;color:#d8d2c4;line-height:1.5">Matyas from Masthead<br><a href="mailto:hello@themasthead.cz" style="color:#72e0b3">hello@themasthead.cz</a></p>
        </div>
      </div>
    `
  };
}

async function sendWaitlistConfirmationEmail({ email, language }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.WAITLIST_REPLY_TO || 'hello@themasthead.cz';
  if (!apiKey || !from) {
    console.info('Waitlist confirmation email skipped: missing RESEND_API_KEY or WAITLIST_FROM_EMAIL.');
    return { configured: false, sent: false };
  }
  const content = waitlistEmailContent(language);
  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: content.subject,
      html: content.html,
      text: content.text,
      reply_to: replyTo,
      tags: [
        { name: 'source', value: 'waitlist' },
        { name: 'language', value: language }
      ]
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Waitlist confirmation email failed:', response.status, detail);
    return { configured: true, sent: false };
  }
  return { configured: true, sent: true };
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

    const emailResult = await sendWaitlistConfirmationEmail({ email, language }).catch((err) => {
      console.error('Waitlist confirmation email error:', err);
      return { configured: true, sent: false };
    });

    return res.status(200).json({ ok: true, email_sent: Boolean(emailResult.sent) });
  } catch (err) {
    console.error('Waitlist handler error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
