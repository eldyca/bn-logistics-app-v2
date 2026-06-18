-- =====================================================================
-- SYNC MIGRATION — đối chiếu mọi cột React đang dùng với bảng Supabase.
-- Sinh tự động từ rà soát data.js (Create/Update/Edit/Detail/Receipt/Dashboard)
-- và Settings (companies). Toàn bộ dùng ADD COLUMN IF NOT EXISTS nên:
--   * an toàn chạy nhiều lần
--   * KHÔNG xoá bảng, KHÔNG xoá dữ liệu
--   * sau khi chạy sẽ hết lỗi "Could not find column in schema cache"
-- Chạy trong Supabase SQL Editor.
-- =====================================================================

-- ----- orders: tất cả cột nghiệp vụ mà code đọc/ghi -----
alter table public.orders add column if not exists sender_note             text;
alter table public.orders add column if not exists receive_method          text;
alter table public.orders add column if not exists payout_address          text;
alter table public.orders add column if not exists receive_currency        text          not null default 'VND';
alter table public.orders add column if not exists tax_percent             numeric(9,4)  not null default 0;
alter table public.orders add column if not exists transaction_fee_percent numeric(9,4)  not null default 0;
alter table public.orders add column if not exists tax_amount              numeric(18,2) not null default 0;
alter table public.orders add column if not exists transaction_fee_amount  numeric(18,2) not null default 0;
alter table public.orders add column if not exists total_amount            numeric(18,2) not null default 0;

-- ----- companies: cột thương hiệu dùng trong Settings -----
alter table public.companies add column if not exists address        text;
alter table public.companies add column if not exists phone          text;
alter table public.companies add column if not exists logo_url       text;
alter table public.companies add column if not exists currency       text default 'USD';
alter table public.companies add column if not exists receipt_footer text;

-- ----- Ghi chú: các cột major_* KHÔNG còn được code sử dụng -----
-- Không DROP để tránh mất dữ liệu. Nếu muốn dọn dẹp, bỏ chú thích các dòng dưới:
-- alter table public.orders drop column if exists major_first_name;
-- alter table public.orders drop column if exists major_last_name;
-- alter table public.orders drop column if exists major_middle_name;
-- alter table public.orders drop column if exists major_phone;
-- alter table public.orders drop column if exists major_address;
-- alter table public.orders drop column if exists major_note_1;
-- alter table public.orders drop column if exists major_note_2;
-- alter table public.orders drop column if exists major_note_3;
-- alter table public.orders drop column if exists major_note_4;

-- ----- Buộc PostgREST nạp lại schema cache (sửa lỗi "schema cache") -----
notify pgrst, 'reload schema';
