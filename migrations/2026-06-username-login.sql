-- =====================================================================
-- Đăng nhập bằng username HOẶC email + lưu username/họ tên nhân viên.
-- An toàn chạy nhiều lần (idempotent). Chạy trong Supabase SQL Editor.
-- =====================================================================

-- 1) Thêm username + display_name vào user_profiles
alter table public.user_profiles add column if not exists username     text;
alter table public.user_profiles add column if not exists display_name text;

-- username là duy nhất (không phân biệt hoa thường), bỏ qua null
create unique index if not exists user_profiles_username_uidx
  on public.user_profiles (lower(username)) where username is not null;

-- 2) Đảm bảo company_members có đủ cột (active + phân quyền). KHÔNG cần cột email.
alter table public.company_members add column if not exists active              boolean not null default true;
alter table public.company_members add column if not exists can_create          boolean not null default true;
alter table public.company_members add column if not exists can_edit            boolean not null default true;
alter table public.company_members add column if not exists can_delete          boolean not null default false;
alter table public.company_members add column if not exists can_change_status   boolean not null default true;
alter table public.company_members add column if not exists can_view_receipt    boolean not null default true;
alter table public.company_members add column if not exists can_manage_customers boolean not null default true;
alter table public.company_members add column if not exists can_manage_members  boolean not null default false;
alter table public.company_members add column if not exists can_manage_cargo    boolean not null default true;

-- 3) Hàm tra email theo username (cho trang đăng nhập gọi khi CHƯA đăng nhập).
--    SECURITY DEFINER để vượt RLS; chỉ trả về email tương ứng username.
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select au.email
  from public.user_profiles p
  join auth.users au on au.id = p.user_id
  where p.username is not null
    and lower(p.username) = lower(p_username)
  limit 1
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

-- 4) Cập nhật trigger tạo user: lưu thêm username + display_name từ metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_profiles (user_id, full_name, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    nullif(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name')
  )
  on conflict (user_id) do update
    set full_name    = coalesce(excluded.full_name, public.user_profiles.full_name),
        username     = coalesce(excluded.username, public.user_profiles.username),
        display_name = coalesce(excluded.display_name, public.user_profiles.display_name);

  return new;
end $$;

notify pgrst, 'reload schema';
