create table if not exists public.company_registration_otps (
  id uuid primary key,
  company_number text not null check (company_number ~ '^[0-9]{10}$'),
  entity_number text not null check (entity_number ~ '^[0-9]{10}$'),
  contact_id text not null,
  masked_destination text not null,
  code_hash text not null,
  rate_limit_key text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts_remaining smallint not null default 5 check (attempts_remaining between 0 and 5),
  consumed_at timestamptz null
);

create index if not exists company_registration_otps_expires_at_idx
  on public.company_registration_otps (expires_at);

create index if not exists company_registration_otps_lookup_idx
  on public.company_registration_otps (
    company_number,
    entity_number,
    contact_id,
    created_at desc
  );

alter table public.company_registration_otps enable row level security;

revoke all on table public.company_registration_otps from anon, authenticated;
grant all on table public.company_registration_otps to service_role;
