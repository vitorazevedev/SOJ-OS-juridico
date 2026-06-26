-- Frontend (useOrganization.ts / Settings.tsx) has assumed an organizations.logo_url
-- column since it was first written, but no migration ever actually created it,
-- so every logo upload failed in production with PGRST204 (column not found).
alter table public.organizations
  add column if not exists logo_url text;
