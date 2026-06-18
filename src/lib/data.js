import { supabase, currentUser, currentCompanyId } from './supabase'
import i18n from '../i18n'

function statusLabel(k) {
  return i18n.t('status.' + k)
}

function mapRow(row) {
  const s = row.sender || {}
  const r = row.receiver || {}
  const b = row.beneficiary || {}
  const tx = Array.isArray(row.transactions) ? row.transactions[0] || {} : row.transactions || {}
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    createdByEmail: row.creator?.email || '',
    sender: {
      phone: s.phone || '', first: s.first_name || '', last: s.last_name || '',
      middle: s.middle_name || '', country: s.country || '', state: s.state || '',
      city: s.city || '', zip: s.zip || '', addr: s.address || '', msg: s.message || '',
    },
    ben: {
      phone: r.phone || '', phone2: r.other_phone || '', last: r.last_name || '',
      first: r.first_name || '', last2: r.last_name2 || '', first2: r.first_name2 || '',
      country: r.country || '', state: r.state || '', city: r.city || '',
      zip: r.zip || '', province: r.province || r.state || '',
      delivery: r.delivery_method || '', addr: r.address || '',
    },
    bank: {
      name: b.bank_name || '', account: b.account_number || '',
      holder: b.account_holder || '', branch: b.branch || '',
    },
    tx: (() => {
      const send = Number(tx.send_amount) || 0
      const taxPct = Number(row.tax_percent) || 0
      const feePct = Number(row.transaction_fee_percent) || 0
      const newTax = Number(row.tax_amount) || 0
      const newFee = Number(row.transaction_fee_amount) || 0
      // Đơn mới dùng cột trên orders; đơn cũ (chưa có dữ liệu mới) fallback về transactions
      const hasNew = taxPct > 0 || feePct > 0 || newTax > 0 || newFee > 0
      const tax = hasNew ? newTax : Number(tx.tax) || 0
      const fee = hasNew ? newFee : Number(tx.fee) || 0
      const total = Number(tx.total) || send + tax + fee
      return {
        send, rate: Number(tx.rate) || 0, receive: Number(tx.receive_amount) || 0,
        taxPct, feePct, tax, fee,
        charge: 0, comm: 0, // giữ khoá cũ (=0) để các nơi đọc cũ không lỗi
        pay: tx.payment_method || '', total, memo: row.memo || '',
      }
    })(),
    major: {
      first: row.major_first_name || '', last: row.major_last_name || '',
      middle: row.major_middle_name || '', phone: row.major_phone || '',
      addr: row.major_address || '',
      note1: row.major_note_1 || '', note2: row.major_note_2 || '',
      note3: row.major_note_3 || '', note4: row.major_note_4 || '',
    },
  }
}

const ORDER_SELECT =
  '*, sender:senders(*), receiver:receivers(*), beneficiary:beneficiaries(*), transactions(*), creator:users(email)'

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapRow)
}

export async function fetchOrder(id) {
  const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).single()
  if (error) throw error
  return mapRow(data)
}

export async function fetchActivities() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []).map((a) => ({ t: new Date(a.created_at).getTime(), text: a.text }))
}

async function ctx() {
  const user = await currentUser()
  if (!user) throw new Error('Chưa đăng nhập.')
  const company_id = await currentCompanyId()
  if (!company_id) throw new Error('Chưa thuộc công ty nào.')
  return { user_id: user.id, company_id }
}

async function logActivity(company_id, user_id, text) {
  await supabase.from('activity_logs').insert({ company_id, user_id, text })
}

async function nextCode(company_id) {
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', company_id)
  const seq = (count || 0) + 1
  return 'GD' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(seq).padStart(3, '0')
}

export async function createOrder(data) {
  const { user_id, company_id } = await ctx()
  const base = { user_id, company_id }

  const { data: sender, error: e1 } = await supabase.from('senders').insert({
    ...base,
    phone: data.sender.phone, first_name: data.sender.first, last_name: data.sender.last,
    middle_name: data.sender.middle, country: data.sender.country, state: data.sender.state,
    city: data.sender.city, zip: data.sender.zip, address: data.sender.addr, message: data.sender.msg,
  }).select().single()
  if (e1) throw e1

  const { data: receiver, error: e2 } = await supabase.from('receivers').insert({
    ...base,
    phone: data.ben.phone, other_phone: data.ben.phone2,
    first_name: data.ben.first, last_name: data.ben.last,
    first_name2: data.ben.first2, last_name2: data.ben.last2,
    country: data.ben.country, state: data.ben.state, city: data.ben.city, zip: data.ben.zip,
    province: data.ben.state || data.ben.province, delivery_method: data.ben.delivery, address: data.ben.addr,
  }).select().single()
  if (e2) throw e2

  const { data: beneficiary, error: e3 } = await supabase.from('beneficiaries').insert({
    ...base, receiver_id: receiver.id,
    bank_name: data.bank.name, account_number: data.bank.account,
    account_holder: data.bank.holder, branch: data.bank.branch,
  }).select().single()
  if (e3) throw e3

  const code = await nextCode(company_id)
  const { data: order, error: e4 } = await supabase.from('orders').insert({
    ...base, code, status: data.status || 'pending',
    sender_id: sender.id, receiver_id: receiver.id, beneficiary_id: beneficiary.id, memo: data.tx.memo,
    tax_percent: data.tx.taxPct, transaction_fee_percent: data.tx.feePct,
    tax_amount: data.tx.tax, transaction_fee_amount: data.tx.fee,
    major_first_name: data.major?.first, major_last_name: data.major?.last,
    major_middle_name: data.major?.middle, major_phone: data.major?.phone,
    major_address: data.major?.addr,
    major_note_1: data.major?.note1, major_note_2: data.major?.note2,
    major_note_3: data.major?.note3, major_note_4: data.major?.note4,
  }).select().single()
  if (e4) throw e4

  const { error: e5 } = await supabase.from('transactions').insert({
    ...base, order_id: order.id,
    send_amount: data.tx.send, rate: data.tx.rate, receive_amount: data.tx.receive,
    charge: 0, commission: 0, fee: data.tx.fee, tax: data.tx.tax,
    payment_method: data.tx.pay, total: data.tx.total,
  })
  if (e5) throw e5

  await logActivity(company_id, user_id, 'Tạo đơn ' + code + ' • ' + data.sender.first + ' ' + data.sender.last)
  return order.id
}

export async function updateOrder(id, data) {
  const { user_id, company_id } = await ctx()
  const { data: order, error: e0 } = await supabase
    .from('orders').select('id, code, sender_id, receiver_id, beneficiary_id').eq('id', id).single()
  if (e0) throw e0

  await supabase.from('senders').update({
    phone: data.sender.phone, first_name: data.sender.first, last_name: data.sender.last,
    middle_name: data.sender.middle, country: data.sender.country, state: data.sender.state,
    city: data.sender.city, zip: data.sender.zip, address: data.sender.addr, message: data.sender.msg,
  }).eq('id', order.sender_id)

  await supabase.from('receivers').update({
    phone: data.ben.phone, other_phone: data.ben.phone2,
    first_name: data.ben.first, last_name: data.ben.last,
    first_name2: data.ben.first2, last_name2: data.ben.last2,
    country: data.ben.country, state: data.ben.state, city: data.ben.city, zip: data.ben.zip,
    province: data.ben.state || data.ben.province, delivery_method: data.ben.delivery, address: data.ben.addr,
  }).eq('id', order.receiver_id)

  if (order.beneficiary_id) {
    await supabase.from('beneficiaries').update({
      bank_name: data.bank.name, account_number: data.bank.account,
      account_holder: data.bank.holder, branch: data.bank.branch,
    }).eq('id', order.beneficiary_id)
  }

  await supabase.from('orders').update({
    status: data.status, memo: data.tx.memo, updated_at: new Date().toISOString(),
    tax_percent: data.tx.taxPct, transaction_fee_percent: data.tx.feePct,
    tax_amount: data.tx.tax, transaction_fee_amount: data.tx.fee,
    major_first_name: data.major?.first, major_last_name: data.major?.last,
    major_middle_name: data.major?.middle, major_phone: data.major?.phone,
    major_address: data.major?.addr,
    major_note_1: data.major?.note1, major_note_2: data.major?.note2,
    major_note_3: data.major?.note3, major_note_4: data.major?.note4,
  }).eq('id', id)

  await supabase.from('transactions').update({
    send_amount: data.tx.send, rate: data.tx.rate, receive_amount: data.tx.receive,
    charge: 0, commission: 0, fee: data.tx.fee, tax: data.tx.tax,
    payment_method: data.tx.pay, total: data.tx.total,
  }).eq('order_id', id)

  await logActivity(company_id, user_id, 'Cập nhật đơn ' + order.code)
}

export async function deleteOrder(id) {
  const { user_id, company_id } = await ctx()
  const { data: order } = await supabase.from('orders').select('code').eq('id', id).single()
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
  if (order) await logActivity(company_id, user_id, 'Xoá đơn ' + order.code)
}

export async function setStatus(id, status) {
  const { user_id, company_id } = await ctx()
  const { data: order } = await supabase.from('orders').select('code').eq('id', id).single()
  const { error } = await supabase.from('orders')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  if (order) await logActivity(company_id, user_id, 'Đổi trạng thái ' + order.code + ' → ' + statusLabel(status))
}

export async function clearAll() {
  const company_id = await currentCompanyId()
  if (!company_id) return
  await supabase.from('orders').delete().eq('company_id', company_id)
  await supabase.from('beneficiaries').delete().eq('company_id', company_id)
  await supabase.from('receivers').delete().eq('company_id', company_id)
  await supabase.from('senders').delete().eq('company_id', company_id)
  await supabase.from('activity_logs').delete().eq('company_id', company_id)
}
