// supabase/functions/create-member/index.ts
// Admin tạo trực tiếp tài khoản nhân viên (email + mật khẩu tạm) bằng service_role,
// rồi thêm vào company_members. Không gửi email mời.
//
// Deploy:
//   supabase functions deploy create-member
// Các biến SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY được
// Supabase tự inject vào Edge Function (không cần set thủ công).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''

    // 1) Xác định người gọi (admin) từ JWT của họ
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: uErr } = await caller.auth.getUser()
    if (uErr || !user) return json({ error: 'Chưa đăng nhập / Unauthorized' }, 401)

    // 2) Client service_role (toàn quyền) để kiểm tra quyền admin và tạo user
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

    const { data: me, error: meErr } = await admin
      .from('company_members')
      .select('company_id, role, active')
      .eq('user_id', user.id)
      .single()
    if (meErr || !me || me.role !== 'admin' || me.active !== true) {
      return json({ error: 'Chỉ admin đang hoạt động mới được tạo tài khoản' }, 403)
    }

    // 3) Đọc input
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const role = body.role === 'admin' ? 'admin' : 'staff'
    const perms = body.perms || {}
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Email không hợp lệ' }, 400)
    if (password.length < 6) return json({ error: 'Mật khẩu tạm phải từ 6 ký tự trở lên' }, 400)

    // 4) Tạo user trong Auth (xác nhận email luôn để đăng nhập được ngay)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (cErr || !created?.user) return json({ error: cErr?.message || 'Không tạo được tài khoản' }, 400)
    const newId = created.user.id

    // 5) Đảm bảo public.users tồn tại (trigger có thể đã tạo)
    await admin.from('users').upsert({ id: newId, email }, { onConflict: 'id' })

    // 6) Thêm vào company_members của công ty admin, kèm quyền
    const { error: mErr } = await admin.from('company_members').insert({
      company_id: me.company_id,
      user_id: newId,
      role,
      active: true,
      email,
      can_create: perms.can_create ?? true,
      can_edit: perms.can_edit ?? true,
      can_delete: perms.can_delete ?? false,
      can_change_status: perms.can_change_status ?? true,
      can_view_receipt: perms.can_view_receipt ?? true,
      can_manage_customers: perms.can_manage_customers ?? true,
      can_manage_members: perms.can_manage_members ?? false,
      can_manage_cargo: perms.can_manage_cargo ?? true,
    })
    if (mErr) {
      // Rollback: xoá user vừa tạo nếu không gắn được vào công ty
      await admin.auth.admin.deleteUser(newId)
      return json({ error: mErr.message }, 400)
    }

    return json({ ok: true, user_id: newId, email })
  } catch (e) {
    return json({ error: (e as Error)?.message || String(e) }, 500)
  }
})
