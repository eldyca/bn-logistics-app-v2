-- =====================================================================
-- Migration: thêm 2 cột banner quảng cáo cho companies (hiển thị 2 bên biên nhận).
-- Lưu ảnh dạng data URL (base64). An toàn chạy nhiều lần, KHÔNG mất dữ liệu.
-- =====================================================================
alter table public.companies add column if not exists ad_left  text;
alter table public.companies add column if not exists ad_right text;

notify pgrst, 'reload schema';
