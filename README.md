# Masthead landing page

Static landing page and waitlist for [themasthead.cz](https://themasthead.cz).

Masthead is positioned as an AI marketing operator for e-commerce stores: it connects to store/catalog context, creates approved organic content and Meta campaigns, and learns from performance.

## Stack

- `index.html` contains the landing page, CSS and small waitlist JavaScript.
- `api/waitlist.js` is a Vercel serverless endpoint for `POST /api/waitlist`.
- `og.png`, `favicon.svg` and `assets/operator-console.png` are the visible brand/share assets.
- `supabase.sql` creates or migrates the waitlist table.
- `SUPABASE_AND_COOKIES.md` contains the deployment guide for Supabase and cookie consent.

## Local Preview

```bash
python -m http.server 4173
```

Open `http://localhost:4173`.

The static preview is enough for design QA. The waitlist API needs Vercel or `vercel dev` with Supabase environment variables.

## Waitlist Setup

1. Create a Supabase project.
2. Run `supabase.sql` in the Supabase SQL editor.
3. Add these Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `WAITLIST_FROM_EMAIL`
   - `WAITLIST_REPLY_TO`
4. Deploy the repo on Vercel and attach `themasthead.cz`.

Detailed setup and test commands are in `SUPABASE_AND_COOKIES.md`.

## Cookie Consent

The landing page includes an EU-style consent banner with:

- `Reject all`, `Customize` and `Accept all` on the first layer.
- Analytics and marketing categories off by default.
- A footer link for changing choices later.
- No analytics or marketing script loaded unless consent allows it.

## Notes

- Public domain: `https://themasthead.cz`
- Contact email used on the site: `hello@themasthead.cz`
- Organic proof metrics are internal test-account results and should not be framed as client guarantees.
