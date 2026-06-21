-- =====================================================================
-- Migration: thêm cột email vào company_members để client có thể đọc email
-- thành viên bằng SELECT trực tiếp (company_members là TABLE, không phải RPC),
-- không cần embed users(*) cũng không cần RPC list.
-- create_company / accept_invitation (đã nằm trong nhóm RPC cho phép) sẽ tự
-- ghi email khi tạo membership. An toàn chạy nhiều lần, KHÔNG mất dữ liệu.
-- =====================================================================

alter table public.company_members add column if not exists email text;

-- Backfill email cho thành viên đã có
update public.company_members m
set email = u.email
from auth.users u
where u.id = m.user_id and (m.email is null or m.email = '');

-- create_company: admin đầu tiên, ghi kèm email
create or replace function public.create_company(p_name text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_email text;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from public.company_members where user_id = v_uid) then
    raise exception 'Người dùng đã thuộc một công ty';
  end if;
  select email into v_email from auth.users where id = v_uid;
  insert into public.companies (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Công ty của tôi'), v_uid)
  returning id into v_id;
  insert into public.company_members (company_id, user_id, role, active, email)
  values (v_id, v_uid, 'admin', true, v_email);
  return v_id;
end $$;

-- accept_invitation: thành viên nhận lời mời, ghi kèm email + quyền
create or replace function public.accept_invitation()
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid(); v_email text; v_inv record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from public.company_members where user_id = v_uid) then
    return (select company_id from public.company_members where user_id = v_uid limit 1);
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  select * into v_inv from public.invitations
  where lower(email) = v_email and accepted = false
  order by created_at desc limit 1;
  if v_inv is null then raise exception 'Không có lời mời nào cho email này'; end if;

  insert into public.company_members (
    company_id, user_id, role, active, email,
    can_create, can_edit, can_delete, can_change_status,
    can_view_receipt, can_manage_customers, can_manage_members, can_manage_cargo
  ) values (
    v_inv.company_id, v_uid, v_inv.role, true, v_email,
    v_inv.can_create, v_inv.can_edit, v_inv.can_delete, v_inv.can_change_status,
    v_inv.can_view_receipt, v_inv.can_manage_customers, v_inv.can_manage_members, v_inv.can_manage_cargo
  );
  update public.invitations set accepted = true where id = v_inv.id;
  return v_inv.company_id;
end $$;

notify pgrst, 'reload schema';
