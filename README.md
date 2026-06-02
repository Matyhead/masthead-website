# Masthead — Landing page & waitlist

A single, premium, mobile-first landing page for **Masthead** — *the AI marketing agency in a box*. Built to a Silicon-Valley standard for an investor/fellowship application: fast, accessible, and self-contained.

- One static page (`index.html`) — no build step, no framework, minimal JS.
- A small **Vercel serverless function** (`api/waitlist.js`) that stores signups in **Supabase**, keeping all keys server-side.
- Open Graph / Twitter card + favicon so shared links preview cleanly.

---

## Project structure

```
.
├── index.html        # The entire landing page (HTML + CSS + JS inline)
├── api/
│   └── waitlist.js   # POST /api/waitlist → inserts email into Supabase
├── og.png            # 1200×630 social share image
├── favicon.svg
├── vercel.json       # Headers + clean URLs
├── supabase.sql      # Run once to create the waitlist table
├── .env.example      # Env vars the serverless function needs
└── package.json
```

---

## 1. Set up Supabase (where the emails land)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase.sql`](./supabase.sql), and run it. This creates a `waitlist` table (`id, email, source, created_at`) with a unique-email index and RLS enabled.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only — never put this in client code)

**Where signups appear:** Supabase Dashboard → **Table Editor → waitlist**. You can export to CSV from there at any time.

---

## 2. Deploy (GitHub → Vercel)

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Masthead landing page"
   git branch -M main
   git remote add origin https://github.com/<you>/masthead-site.git
   git push -u origin main
   ```
2. In [Vercel](https://vercel.com), **Add New → Project**, import the repo. No framework / build command needed — Vercel serves the static files and detects `api/` as serverless functions automatically.
3. Add **Environment Variables** (Settings → Environment Variables) for all environments:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy.** Your public URL will be `https://<project>.vercel.app` (add a custom domain like `themasthead.ai` under Settings → Domains).

> After adding/changing env vars, redeploy so the function picks them up.

---

## 3. Run locally

```bash
npm i -g vercel       # one-time
cp .env.example .env.local   # fill in your Supabase values
vercel dev            # serves the page + /api/waitlist at http://localhost:3000
```

Opening `index.html` directly in a browser works for previewing the design, but the form needs `vercel dev` (or a deploy) for the `/api/waitlist` route to respond.

---

## How the waitlist works

- The form validates the email client-side, then `POST`s `{ email, source }` to `/api/waitlist`.
- The function validates again, then inserts into Supabase using the service-role key with `Prefer: resolution=ignore-duplicates`. A repeat email is treated as success ("already on the list").
- The UI swaps the form for a **"You're on the list."** confirmation, and shows inline errors on network/validation failure.
- Stored per signup: `email`, `source` (`hero` or `final-cta`), and `created_at`. Nothing sensitive.

---

## Notes

- **Design tokens:** bg `#0B0E14`, surface `#141A24`, border `#222C3B`, text `#F4F6FA` / `#9AA6B8` / `#5E6B80`, single accent `#48C6B2`. Headlines in **Lora**, body in **Inter**.
- **Performance/accessibility:** no heavy frameworks, system-friendly fonts with `display=swap`, real focus states, reduced-motion support, semantic landmarks, and `aria-live` form feedback — built to score 90+ on Lighthouse.
- The proof numbers (836K views, 72,666 reached, etc.) are the real first-week test-account figures, kept with the honest "test account" caption per the brief. Don't inflate them.
