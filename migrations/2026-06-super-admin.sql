-- =====================================================================
-- Migration: super_admin & khoá hồ sơ công ty
-- - Chỉ super_admin được tạo/sửa thông tin công ty (bảng companies).
-- - Admin/staff trong công ty vẫn xem được, vẫn thao tác đơn/khách/cargo/báo cáo.
-- An toàn chạy nhiều lần, KHÔNG mất dữ liệu.
-- =====================================================================

-- 1) Cờ super_admin (cấp nền tảng) trên user_profiles
alter table public.user_profiles add column if not exists is_super_admin boolean not null default false;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and is_super_admin
  );
$$;

-- 2) RLS bảng companies
alter table public.companies enable row level security;

-- Đọc: thành viên đọc công ty của mình; super_admin đọc tất cả
drop policy if exists companies_member_read on public.companies;
create policy companies_member_read on public.companies
  for select using (id = public.current_company_id() or public.is_super_admin());

-- Sửa: CHỈ super_admin (thay cho chính sách admin cũ nếu có)
drop policy if exists companies_admin_update on public.companies;
drop policy if exists companies_superadmin_update on public.companies;
create policy companies_superadmin_update on public.companies
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- Thêm/Xoá: CHỈ super_admin (create_company là SECURITY DEFINER nên vẫn bootstrap được)
drop policy if exists companies_superadmin_insert on public.companies;
create policy companies_superadmin_insert on public.companies
  for insert with check (public.is_super_admin());

drop policy if exists companies_superadmin_delete on public.companies;
create policy companies_superadmin_delete on public.companies
  for delete using (public.is_super_admin());

notify pgrst, 'reload schema';

-- =====================================================================
-- 3) ĐẶT TÀI KHOẢN CỦA BẠN LÀM super_admin (CHẠY THỦ CÔNG, thay email)
-- =====================================================================
-- update public.user_profiles
--   set is_super_admin = true
--   where user_id = (select id from auth.users where email = 'admin-cua-ban@email.com');
-- notify pgrst, 'reload schema';
