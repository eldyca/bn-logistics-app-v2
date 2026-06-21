// netlify/functions/create-member.js
// Admin tạo trực tiếp tài khoản nhân viên bằng Supabase Auth Admin API.
// Chạy SERVER-SIDE trên Netlify (service_role key KHÔNG bao giờ lộ ra trình duyệt).
//
// Biến môi trường cần đặt trong Netlify (Site settings -> Environment variables):
//   SUPABASE_URL                 = https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    = <service_role key>   (KHÔNG đặt tiền tố VITE_)
//   SUPABASE_ANON_KEY            = <anon key>           (tuỳ chọn)

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const resp = (statusCode, obj) => ({
  statusCode,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
})

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: 'ok' }
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' })

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return resp(500, { error: 'Server chưa cấu hình SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
    }

    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return resp(401, { error: 'Chưa đăng nhập / Unauthorized' })

    // Client service_role (toàn quyền) — chỉ tồn tại trên server
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1) Xác định người gọi từ access token
    const { data: { user }, error: uErr } = await admin.auth.getUser(token)
    if (uErr || !user) return resp(401, { error: 'Phiên đăng nhập không hợp lệ' })

    // 2) Kiểm tra người gọi là admin đang hoạt động
    const { data: me, error: meErr } = await admin
      .from('company_members')
      .select('company_id, role, active')
      .eq('user_id', user.id)
      .single()
    if (meErr || !me || me.role !== 'admin' || me.active !== true) {
      return resp(403, { error: 'Chỉ admin đang hoạt động mới được tạo tài khoản' })
    }

    // 3) Đọc input
    const body = JSON.parse(event.body || '{}')
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const role = body.role === 'admin' ? 'admin' : 'staff'
    const perms = body.perms || {}
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return resp(400, { error: 'Email không hợp lệ' })
    if (password.length < 6) return resp(400, { error: 'Mật khẩu tạm phải từ 6 ký tự trở lên' })

    // 4) Tạo user trong Auth (xác nhận email luôn để đăng nhập được ngay)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (cErr || !created?.user) return resp(400, { error: (cErr && cErr.message) || 'Không tạo được tài khoản' })
    const newId = created.user.id

    // 5) Đảm bảo public.users tồn tại
    await admin.from('users').upsert({ id: newId, email }, { onConflict: 'id' })

    // 6) Thêm vào company_members kèm quyền
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
      await admin.auth.admin.deleteUser(newId) // rollback
      return resp(400, { error: mErr.message })
    }

    return resp(200, { ok: true, user_id: newId, email })
  } catch (e) {
    return resp(500, { error: (e && e.message) || String(e) })
  }
}
