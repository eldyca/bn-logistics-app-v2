-- =====================================================================
-- Migration: thêm các cột cho luồng đơn mới (BN Logistics)
--   sender_note               : ghi chú người gửi (KHÔNG in lên biên nhận)
--   receive_method            : hình thức nhận (Tiền mặt / Chuyển khoản ngân hàng)
--   payout_address            : địa chỉ nhận tiền (khi nhận tiền mặt)
--   receive_currency          : đơn vị tiền nhận (USD / VND), mặc định VND
--   total_amount              : tổng cộng (đồng bộ với transactions.total)
-- tax_percent / transaction_fee_percent / tax_amount / transaction_fee_amount
-- đã được thêm ở migration trước; để lại đây cho an toàn (IF NOT EXISTS).
-- An toàn chạy nhiều lần — KHÔNG xoá bảng, KHÔNG mất dữ liệu.
-- =====================================================================

alter table public.orders add column if not exists sender_note   text;
alter table public.orders add column if not exists receive_method text;
alter table public.orders add column if not exists payout_address text;
alter table public.orders add column if not exists receive_currency text not null default 'VND';
alter table public.orders add column if not exists total_amount  numeric(18,2) not null default 0;

alter table public.orders add column if not exists tax_percent             numeric(9,4)  not null default 0;
alter table public.orders add column if not exists transaction_fee_percent numeric(9,4)  not null default 0;
alter table public.orders add column if not exists tax_amount              numeric(18,2) not null default 0;
alter table public.orders add column if not exists transaction_fee_amount  numeric(18,2) not null default 0;
