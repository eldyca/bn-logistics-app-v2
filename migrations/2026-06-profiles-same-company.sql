-- =====================================================================
-- Cho phép thành viên trong CÙNG công ty đọc hồ sơ (tên/username) của nhau,
-- để danh sách thành viên + tên nhân viên hiển thị đúng (không ra UUID).
-- Vẫn cách ly giữa các công ty. An toàn chạy nhiều lần.
-- =====================================================================

drop policy if exists profiles_same_company on public.user_profiles;
create policy profiles_same_company on public.user_profiles
  for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.company_members me
      join public.company_members them on them.company_id = me.company_id
      where me.user_id = auth.uid()
        and them.user_id = public.user_profiles.user_id
    )
  );

notify pgrst, 'reload schema';
