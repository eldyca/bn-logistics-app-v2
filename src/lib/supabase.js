import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Tạo .env từ .env.example.')
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
)

// --- cache company_id của user hiện tại ---
let _companyId
export function clearCompanyCache() {
  _companyId = undefined
}

export async function currentUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

export async function currentCompanyId() {
  if (_companyId !== undefined) return _companyId
  const user = await currentUser()
  if (!user) {
    _companyId = null
    return null
  }
  const { data } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()
  _companyId = data?.company_id || null
  return _companyId
}

// --- membership / company ---
export async function getMembership() {
  const user = await currentUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('company_members')
    .select('company_id, role, company:companies(id, name, address, phone, logo_url, currency, receipt_footer)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return null
  clearCompanyCache()
  _companyId = data.company_id
  return { company_id: data.company_id, role: data.role, company: data.company || null }
}

export async function createCompany(name) {
  const { data, error } = await supabase.rpc('create_company', { p_name: name })
  if (error) throw error
  clearCompanyCache()
  return data
}

export async function acceptInvitation() {
  const { data, error } = await supabase.rpc('accept_invitation')
  if (error) throw error
  clearCompanyCache()
  return data
}

export async function pendingInvitesForMe() {
  const user = await currentUser()
  if (!user) return []
  const email = (user.email || '').toLowerCase()
  const { data } = await supabase
    .from('invitations')
    .select('id, role, accepted, company:companies(name)')
    .eq('accepted', false)
    .ilike('email', email)
  return data || []
}

export async function inviteStaff(email, role = 'staff') {
  const { error } = await supabase.rpc('invite_staff', { p_email: email, p_role: role })
  if (error) throw error
}

export async function listMembers() {
  const { data, error } = await supabase
    .from('company_members')
    .select('id, role, user_id, user:users(email)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((m) => ({
    id: m.id,
    role: m.role,
    user_id: m.user_id,
    email: m.user?.email || m.user_id,
  }))
}

export async function listInvitations() {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, accepted, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function removeMember(memberId) {
  const { error } = await supabase.from('company_members').delete().eq('id', memberId)
  if (error) throw error
}

export async function updateCompany(fields) {
  const cid = await currentCompanyId()
  if (!cid) throw new Error('Chưa có công ty')
  const { error } = await supabase.from('companies').update(fields).eq('id', cid)
  if (error) throw error
}
