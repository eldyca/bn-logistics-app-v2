-- =====================================================================
-- Migration: tách quảng cáo ra bảng riêng company_ads.
-- Admin công ty được quản lý quảng cáo (KHÔNG cần super_admin); hồ sơ công ty
-- (bảng companies) vẫn chỉ super_admin sửa. An toàn chạy nhiều lần.
-- =====================================================================

create table if not exists public.company_ads (
  company_id uuid primary key references public.companies(id) on delete cascade,
  ad_left    text,
  ad_right   text,
  updated_at timestamptz not null default now()
);

alter table public.company_ads enable row level security;

-- Đọc: thành viên công ty hoặc super_admin
drop policy if exists company_ads_read on public.company_ads;
create policy company_ads_read on public.company_ads
  for select using (company_id = public.current_company_id() or public.is_super_admin());

-- Thêm: admin của công ty đó (hoặc super_admin)
drop policy if exists company_ads_insert on public.company_ads;
create policy company_ads_insert on public.company_ads
  for insert with check (
    company_id = public.current_company_id() and (public.is_company_admin() or public.is_super_admin())
  );

-- Sửa: admin của công ty đó (hoặc super_admin)
drop policy if exists company_ads_update on public.company_ads;
create policy company_ads_update on public.company_ads
  for update using (
    company_id = public.current_company_id() and (public.is_company_admin() or public.is_super_admin())
  ) with check (
    company_id = public.current_company_id() and (public.is_company_admin() or public.is_super_admin())
  );

-- Backfill từ companies.ad_left/ad_right nếu các cột đó còn tồn tại
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'ad_left'
  ) then
    insert into public.company_ads (company_id, ad_left, ad_right)
    select id, ad_left, ad_right from public.companies
    where ad_left is not null or ad_right is not null
    on conflict (company_id) do nothing;
  end if;
end $$;

notify pgrst, 'reload schema';
