begin;

alter table public.company_ads
  add column if not exists storage_provider text,
  add column if not exists object_key text;

update public.company_ads
set storage_provider = 'supabase'
where storage_provider is null
  and (
    image_url is not null
    or video_url is not null
    or thumbnail_url is not null
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_ads_storage_provider_check'
      and conrelid = 'public.company_ads'::regclass
  ) then
    alter table public.company_ads
      add constraint company_ads_storage_provider_check
      check (
        storage_provider is null
        or storage_provider in ('supabase', 'r2')
      );
  end if;
end
$$;

create unique index if not exists company_ads_object_key_unique
  on public.company_ads (object_key)
  where object_key is not null;

alter table public.worker_gallery
  add column if not exists storage_provider text,
  add column if not exists object_key text;

update public.worker_gallery
set storage_provider = 'supabase'
where storage_provider is null
  and url is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'worker_gallery_storage_provider_check'
      and conrelid = 'public.worker_gallery'::regclass
  ) then
    alter table public.worker_gallery
      add constraint worker_gallery_storage_provider_check
      check (
        storage_provider is null
        or storage_provider in ('supabase', 'r2')
      );
  end if;
end
$$;

create unique index if not exists worker_gallery_object_key_unique
  on public.worker_gallery (object_key)
  where object_key is not null;

alter table public.worker_cv
  add column if not exists storage_provider text,
  add column if not exists object_key text;

update public.worker_cv
set storage_provider = 'supabase'
where storage_provider is null
  and cv_file_url is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'worker_cv_storage_provider_check'
      and conrelid = 'public.worker_cv'::regclass
  ) then
    alter table public.worker_cv
      add constraint worker_cv_storage_provider_check
      check (
        storage_provider is null
        or storage_provider in ('supabase', 'r2')
      );
  end if;
end
$$;

create unique index if not exists worker_cv_object_key_unique
  on public.worker_cv (object_key)
  where object_key is not null;

commit;
