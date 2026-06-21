-- =====================================================================
-- Migration: bỏ trigger enforce_invite_only.
-- Lý do: nay admin tạo tài khoản trực tiếp qua Edge Function (service_role
-- gọi auth.admin.createUser). Trigger BEFORE INSERT trên auth.users sẽ chặn
-- vì email chưa nằm trong invitations. Việc tắt đăng ký công khai được xử lý
-- ở: Dashboard -> Authentication -> Providers -> Email -> "Allow new users
-- to sign up" = OFF. admin.createUser (service_role) vẫn hoạt động dù tắt.
-- An toàn chạy nhiều lần.
-- =====================================================================

drop trigger if exists on_auth_user_signup_guard on auth.users;
drop function if exists public.enforce_invite_only();

notify pgrst, 'reload schema';
