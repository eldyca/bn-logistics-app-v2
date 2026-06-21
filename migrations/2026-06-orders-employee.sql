-- =====================================================================
-- Migration: thêm cột "Nhân viên nhận đơn" (employee) cho bảng orders.
-- An toàn chạy nhiều lần, KHÔNG xoá bảng/dữ liệu.
-- =====================================================================
alter table public.orders add column if not exists employee text;

-- Nạp lại schema cache cho PostgREST
notify pgrst, 'reload schema';
