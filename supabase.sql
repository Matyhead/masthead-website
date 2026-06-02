-- Masthead waitlist table.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).

create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       text not null,
  source      text default 'website',
  created_at  timestamptz not null default now()
);

-- One row per email; duplicate signups are ignored by the API.
create unique index if not exists waitlist_email_key
  on public.waitlist (lower(email));

-- Enable Row-Level Security. The serverless function uses the service-role key,
-- which bypasses RLS, so we add NO public policies — the table is not writable
-- or readable by the anon/public client. Emails are only reachable from your
-- Supabase dashboard or via the service-role key on the server.
alter table public.waitlist enable row level security;
