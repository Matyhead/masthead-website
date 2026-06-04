# Supabase + Cookies Setup

This guide is for the Masthead landing page on Vercel.

## 1. Create the Supabase waitlist table

1. Open Supabase and create/select the Masthead project.
2. Go to `SQL Editor` -> `New query`.
3. Paste the contents of `supabase.sql`.
4. Run the query.
5. Open `Table Editor` -> `waitlist` and confirm these columns exist:
   - `email`
   - `source`
   - `language`
   - `page_path`
   - `utm_source`
   - `utm_medium`
   - `utm_campaign`
   - `privacy_consent`
   - `consent_version`
   - `created_at`

The table has Row Level Security enabled and no public anon policies. The website writes through the Vercel serverless function with the service-role key, so the key must never be exposed in frontend JavaScript.

## 2. Add Vercel environment variables

In Vercel, open the project -> `Settings` -> `Environment Variables`.

Add:

```txt
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use the Supabase `Project Settings` -> `API` values.

Important:

- `SUPABASE_SERVICE_ROLE_KEY` belongs only in Vercel environment variables.
- Do not paste it into `index.html`, browser JavaScript, analytics tools or public docs.
- Add the variables for `Production`, `Preview` and `Development` if you test with `vercel dev`.

## 3. Test the waitlist endpoint

After deployment:

```bash
curl -X POST https://themasthead.cz/api/waitlist ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"source\":\"manual-test\",\"language\":\"en\"}"
```

Expected response:

```json
{"ok":true}
```

Then check Supabase `Table Editor` -> `waitlist`.

## 3.1 Troubleshooting

If the website says `Something went wrong`, check Vercel logs.

This log means the Vercel environment variable is not using the Supabase
`service_role` key:

```txt
new row violates row-level security policy for table "waitlist"
code: 42501
```

Fix:

1. Open Supabase -> `Project Settings` -> `API`.
2. Copy the secret `service_role` key, not the public anon key.
3. In Vercel -> `Settings` -> `Environment Variables`, replace
   `SUPABASE_SERVICE_ROLE_KEY` with the service-role key.
4. Redeploy the latest production deployment.

The anon key is intentionally blocked by RLS because the waitlist table stores
email addresses.

## 4. Cookie banner behavior

The banner is designed for EU/Czech expectations:

- non-essential categories are off by default,
- `Reject all` and `Accept all` are on the first layer,
- optional categories are not pre-ticked,
- consent can be changed later from the footer link,
- no analytics or marketing scripts are loaded unless consent allows them.

Current website state:

- the site stores only necessary consent settings by default,
- no analytics or marketing script is configured yet,
- the banner is ready for future analytics/pixels.

## 5. Adding analytics later

Do not add Google Analytics, Meta Pixel or similar scripts directly to `index.html`.

Instead, initialize them only after consent:

```html
<script>
  window.addEventListener("masthead:consent", (event) => {
    if (!event.detail.analytics) return;
    // Load analytics here.
  });
</script>
```

For marketing pixels, check `event.detail.marketing`.

If a visitor later withdraws consent, your analytics/pixel integration must stop further tracking and avoid setting new non-essential cookies.

## 6. Sources used for compliance baseline

- Supabase Data REST API: https://supabase.com/docs/guides/api
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API security: https://supabase.com/docs/guides/api/securing-your-api
- Czech DPA cookie Q&A: https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies
- EDPB valid consent FAQ: https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/how-can-i-obtain-valid-consent_en
