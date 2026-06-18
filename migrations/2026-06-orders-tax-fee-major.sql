-- =====================================================================
-- Migration: thêm cột % thuế / % phí giao dịch (và số tiền tính ra) +
-- thông tin "Khách hàng lớn / Major Customer" vào bảng orders.
-- An toàn chạy nhiều lần (add column if not exists) — KHÔNG mất dữ liệu cũ.
-- Chạy trong Supabase SQL Editor.
-- =====================================================================

alter table public.orders add column if not exists tax_percent             numeric(9,4) not null default 0;
alter table public.orders add column if not exists transaction_fee_percent numeric(9,4) not null default 0;
alter table public.orders add column if not exists tax_amount              numeric(18,2) not null default 0;
alter table public.orders add column if not exists transaction_fee_amount  numeric(18,2) not null default 0;

alter table public.orders add column if not exists major_first_name  text;
alter table public.orders add column if not exists major_last_name   text;
alter table public.orders add column if not exists major_middle_name text;
alter table public.orders add column if not exists major_phone       text;
alter table public.orders add column if not exists major_address     text;
alter table public.orders add column if not exists major_note_1      text;
alter table public.orders add column if not exists major_note_2      text;
alter table public.orders add column if not exists major_note_3      text;
alter table public.orders add column if not exists major_note_4      text;
