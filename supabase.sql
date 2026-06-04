-- Masthead waitlist table.
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- The script is idempotent: it can be re-run after the first setup.

create table if not exists public.waitlist (
  id                bigint generated always as identity primary key,
  email             text not null,
  source            text default 'website',
  language          text default 'en',
  page_path         text default '/',
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  privacy_consent   boolean not null default true,
  consent_version   text not null default '2026-06-04',
  consent_text      text,
  created_at        timestamptz not null default now()
);

alter table public.waitlist
  add column if not exists language text default 'en',
  add column if not exists page_path text default '/',
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists privacy_consent boolean not null default true,
  add column if not exists consent_version text not null default '2026-06-04',
  add column if not exists consent_text text;

alter table public.waitlist
  alter column email set not null,
  alter column privacy_consent set not null,
  alter column consent_version set not null,
  alter column created_at set default now();

-- One row per email. Duplicate signups are treated as success by the API.
create unique index if not exists waitlist_email_key
  on public.waitlist (lower(email));

-- Keep email storage reasonably sane.
alter table public.waitlist
  drop constraint if exists waitlist_email_length_check,
  add constraint waitlist_email_length_check
    check (char_length(email) <= 254);

alter table public.waitlist
  drop constraint if exists waitlist_language_check,
  add constraint waitlist_language_check
    check (language in ('en', 'cs'));

-- Enable Row-Level Security. The Vercel serverless function uses the
-- service-role key, which bypasses RLS. Do not add public anon policies for
-- this table unless you intentionally expose reads/writes from the browser.
alter table public.waitlist enable row level security;

comment on table public.waitlist is
  'Masthead beta waitlist signups collected from themasthead.cz.';

comment on column public.waitlist.privacy_consent is
  'True when the visitor submitted the beta waitlist form.';

comment on column public.waitlist.consent_version is
  'Version/date of the waitlist consent wording shown on the website.';
