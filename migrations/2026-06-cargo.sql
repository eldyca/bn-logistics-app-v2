-- =====================================================================
-- Migration: Module Chuyển hàng hóa (Cargo Shipping)
-- Bảng cargo_shipments + cargo_items, phân tách theo công ty (RLS) giống
-- orders. An toàn chạy nhiều lần, KHÔNG mất dữ liệu.
-- =====================================================================

create table if not exists public.cargo_shipments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  code          text not null,
  tracking_no   text,
  status        text not null default 'pending'
                check (status in ('pending','received','in_transit','delivered','cancelled')),
  employee      text,
  -- người gửi
  s_name text, s_phone text, s_address text, s_city text, s_state text, s_zip text, s_note text,
  -- người nhận
  r_name text, r_phone text, r_address text, r_city text, r_state text, r_zip text, r_country text, r_note text,
  -- kiện hàng
  item_type text, quantity int default 1, weight numeric(12,2) default 0,
  dim_l numeric(12,2) default 0, dim_w numeric(12,2) default 0, dim_h numeric(12,2) default 0,
  declared_value numeric(18,2) default 0, contents text, fragile boolean default false, insured boolean default false,
  item_note text,
  -- phí
  shipping_fee numeric(18,2) default 0, insurance_fee numeric(18,2) default 0,
  surcharge numeric(18,2) default 0, tax numeric(18,2) default 0, discount numeric(18,2) default 0,
  total numeric(18,2) default 0, payment_method text,
  delivery_date date, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cargo_company_idx on public.cargo_shipments (company_id, created_at desc);

-- (tuỳ chọn) nhiều kiện cho một đơn
create table if not exists public.cargo_items (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  shipment_id uuid not null references public.cargo_shipments (id) on delete cascade,
  item_type text, quantity int default 1, weight numeric(12,2) default 0,
  dim_l numeric(12,2) default 0, dim_w numeric(12,2) default 0, dim_h numeric(12,2) default 0,
  declared_value numeric(18,2) default 0, contents text, fragile boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists cargo_items_shipment_idx on public.cargo_items (shipment_id);

alter table public.cargo_shipments enable row level security;
alter table public.cargo_items     enable row level security;

drop policy if exists cargo_company on public.cargo_shipments;
create policy cargo_company on public.cargo_shipments
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists cargo_items_company on public.cargo_items;
create policy cargo_items_company on public.cargo_items
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

notify pgrst, 'reload schema';
