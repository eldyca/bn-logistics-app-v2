import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { num, fmt } from '../lib/format'
import AddressFields from '../components/AddressFields'
import PayoutAddress from '../components/PayoutAddress'
import CurrencyInput from '../components/CurrencyInput'
import { VN_BANKS } from '../lib/banks'

const BANK_METHOD = 'Chuyển khoản ngân hàng'
const CASH_METHOD = 'Tiền mặt'

const EMPTY = {
  sender: { phone: '', first: '', last: '', middle: '', country: 'United States', state: '', city: '', zip: '', addr: '', msg: '', note: '' },
  ben: { phone: '', phone2: '', last: '', first: '', last2: '', first2: '', country: 'Vietnam', state: '', city: '', zip: '', province: '', delivery: BANK_METHOD, addr: '', payoutAddr: '' },
  bank: { name: '', account: '', holder: '', branch: '' },
  tx: { send: '0.00', rate: '1.00', cur: 'VND', taxPct: '1', feePct: '3', pay: 'Tiền mặt', memo: '' },
  employee: '',
  status: 'pending',
}

export default function CreateOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { orders, addOrder, updateOrder } = useOrders()
  const { displayName, isAdmin } = useAuth()
  const editing = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)

  // Tạo đơn mới: tự điền "Nhân viên nhận đơn" = tên tài khoản đang đăng nhập
  useEffect(() => {
    if (editing) return
    if (displayName) setForm((f) => (f.employee ? f : { ...f, employee: displayName }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, editing])

  // Gợi ý người gửi/người nhận cũ theo Tên / Họ / Số điện thoại (lấy từ đơn đã lưu)
  const [sSug, setSSug] = useState([])
  const [sOpen, setSOpen] = useState(false)
  const [rSug, setRSug] = useState([])
  const [rOpen, setROpen] = useState(false)
  const suppressRef = useRef(false)
  const suppressRRef = useRef(false)
  const sFocusRef = useRef(false)
  const rFocusRef = useRef(false)

  function matchPeople(side) {
    const p = side === 'sender' ? form.sender : form.ben
    const ph = (p.phone || '').trim().toLowerCase()
    const fn = (p.first || '').trim().toLowerCase()
    const ln = (p.last || '').trim().toLowerCase()
    if (ph.replace(/\D/g, '').length < 3 && fn.length < 2 && ln.length < 2) return []
    const seen = new Set()
    const out = []
    for (const o of orders) {
      const x = side === 'sender' ? o.sender : o.ben
      if (!x) continue
      const ok =
        (ph && (x.phone || '').toLowerCase().includes(ph)) ||
        (fn && (x.first || '').toLowerCase().includes(fn)) ||
        (ln && (x.last || '').toLowerCase().includes(ln))
      if (!ok) continue
      // Khoá theo cả CẶP gửi–nhận để mỗi gợi ý là một đơn riêng
      const s = o.sender || {}, b = o.ben || {}
      const key = (s.phone || '') + '|' + (s.first || '') + '|' + (s.last || '') + '#' +
        (b.phone || '') + '|' + (b.first || '') + '|' + (b.last || '')
      if (seen.has(key)) continue
      seen.add(key)
      // p = người khớp để hiển thị dòng chính; other = người đối ứng; order = đơn đầy đủ
      out.push({ p: x, other: side === 'sender' ? b : s, order: o })
      if (out.length >= 6) break
    }
    return out
  }

  useEffect(() => {
    if (suppressRef.current) { suppressRef.current = false; return }
    const h = setTimeout(() => {
      const rows = matchPeople('sender')
      setSSug(rows); setSOpen(rows.length > 0 && sFocusRef.current)
    }, 300)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sender.phone, form.sender.first, form.sender.last])

  useEffect(() => {
    if (suppressRRef.current) { suppressRRef.current = false; return }
    const h = setTimeout(() => {
      const rows = matchPeople('ben')
      setRSug(rows); setROpen(rows.length > 0 && rFocusRef.current)
    }, 300)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ben.phone, form.ben.first, form.ben.last])

  // Bấm 1 gợi ý -> điền CẢ người gửi + người nhận (và ngân hàng) từ đơn cũ
  function pickPair(order) {
    if (!order) return
    suppressRef.current = true
    suppressRRef.current = true
    const s = order.sender || {}
    const b = order.ben || {}
    setForm((f) => ({
      ...f,
      sender: {
        ...f.sender,
        phone: s.phone || '', first: s.first || '', last: s.last || '', middle: s.middle || '',
        country: s.country || f.sender.country, state: s.state || '', city: s.city || '', zip: s.zip || '',
        addr: s.addr || '', msg: s.msg ?? f.sender.msg, note: s.note ?? f.sender.note,
      },
      ben: {
        ...f.ben,
        phone: b.phone || '', phone2: b.phone2 || '', first: b.first || '', last: b.last || '',
        country: b.country || f.ben.country, state: b.state || '', city: b.city || '', zip: b.zip || '',
        province: b.province || b.state || '', delivery: b.delivery || f.ben.delivery,
        addr: b.addr || '', payoutAddr: b.payoutAddr || '',
      },
      bank: order.bank ? { ...order.bank } : f.bank,
    }))
    setSSug([]); setSOpen(false)
    setRSug([]); setROpen(false)
  }

  useEffect(() => {
    if (editing) {
      const r = orders.find((o) => String(o.id) === String(id))
      if (r) {
        suppressRef.current = true
        suppressRRef.current = true
        setForm({
          status: r.status,
          sender: { ...EMPTY.sender, ...r.sender },
          ben: {
            ...EMPTY.ben, ...r.ben,
            delivery: [CASH_METHOD, BANK_METHOD].includes(r.ben.delivery)
              ? r.ben.delivery
              : (r.bank?.name ? BANK_METHOD : CASH_METHOD),
          },
          bank: { ...EMPTY.bank, ...r.bank },
          tx: {
            send: r.tx.send, rate: r.tx.rate || 1, cur: r.tx.cur || 'VND',
            taxPct: r.tx.taxPct ?? 1, feePct: r.tx.feePct ?? 3,
            pay: r.tx.pay, memo: r.tx.memo,
          },
          employee: r.employee || '',
        })
      }
    } else {
      setForm(EMPTY)
    }
  }, [id, editing, orders])

  const set = (group, key, value) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }))
  const setSenderField = (k, v) => set('sender', k, v)
  const setBenField = (k, v) => set('ben', k, v)

  const isBank = (form.ben.delivery || '').includes('Chuyển khoản')
  const isVnd = form.tx.cur === 'VND'

  const computed = useMemo(() => {
    const send = num(form.tx.send)
    const receive = form.tx.cur === 'USD' ? send : send * num(form.tx.rate)
    const tax = send * (num(form.tx.taxPct) / 100)
    const fee = send * (num(form.tx.feePct) / 100)
    const total = send + tax + fee
    return { receive, tax, fee, total }
  }, [form.tx])

  async function save() {
    const miss = []
    if (!form.sender.phone.trim()) miss.push(t('order.senderInfo'))
    if (!form.sender.first.trim() || !form.sender.last.trim()) miss.push(t('order.firstName'))
    if (!form.sender.addr.trim()) miss.push(t('order.address'))
    if (!form.ben.phone.trim()) miss.push(t('order.receiverInfo'))
    if (!form.ben.first.trim() || !form.ben.last.trim()) miss.push(t('order.firstName'))
    if (num(form.tx.send) <= 0) miss.push(t('order.sendAmount'))
    const employeeName = (form.employee || '').trim() || (displayName || '').trim()
    if (!employeeName) miss.push(t('order.employee'))
    if (miss.length) {
      alert(t('order.fillRequired') + miss.join(', '))
      return
    }
    const payload = {
      status: form.status,
      sender: { ...form.sender },
      ben: { ...form.ben },
      bank: isBank ? { ...form.bank } : { name: '', account: '', holder: '', branch: '' },
      tx: {
        send: num(form.tx.send), rate: isVnd ? num(form.tx.rate) : 1, receive: computed.receive,
        cur: form.tx.cur,
        taxPct: num(form.tx.taxPct), feePct: num(form.tx.feePct),
        tax: computed.tax, fee: computed.fee,
        pay: form.tx.pay, total: computed.total, memo: form.tx.memo.trim(),
      },
      employee: employeeName,
    }
    setBusy(true)
    try {
      if (editing) {
        await updateOrder(id, payload)
        navigate('/receipt/' + id)
      } else {
        const newId = await addOrder(payload)
        navigate('/receipt/' + newId)
      }
    } catch (e) {
      alert(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  const msgLeft = 75 - (form.sender.msg?.length || 0)

  return (
    <div className="order-form">
      <div className="viewtitle">{editing ? t('order.editTitle') : t('order.createTitle')}</div>
      <div className="viewsub">{t('order.subtitle')}</div>

      {/* SENDER */}
      <div className="panel panel--sender">
        <div className="phead">{t('order.senderInfo')}</div>
        <div className="pbody">
          <div className="field"><label>{t('order.phone')} <span className="r">*</span></label>
            <div className="ac-wrap">
              <input type="tel" value={form.sender.phone} autoComplete="off"
                onChange={(e) => set('sender', 'phone', e.target.value)}
                onFocus={() => { sFocusRef.current = true; if (sSug.length) setSOpen(true) }}
                onBlur={() => { sFocusRef.current = false; setTimeout(() => setSOpen(false), 150) }} />
              {sOpen && sSug.length > 0 && (
                <ul className="ac-list">
                  {sSug.map((s, i) => (
                    <li key={i} className="ac-item" onMouseDown={(e) => { e.preventDefault(); pickPair(s.order) }}>
                      <span className="ac-phone">{s.p.phone}</span>
                      <span className="ac-name">{`${s.p.first} ${s.p.last}`.trim()}</span>
                      {(s.other?.first || s.other?.last || s.other?.phone) && (
                        <span className="ac-addr">→ Nhận: {`${s.other.first || ''} ${s.other.last || ''}`.trim()}{s.other.phone ? ` (${s.other.phone})` : ''}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="grid-3">
            <div className="field tight"><label>{t('order.lastName')} <span className="r">*</span></label>
              <input value={form.sender.last} onChange={(e) => set('sender', 'last', e.target.value)} /></div>
            <div className="field tight"><label>{t('order.firstName')} <span className="r">*</span></label>
              <input value={form.sender.first} onChange={(e) => set('sender', 'first', e.target.value)} /></div>
            <div className="field tight"><label>{t('order.middleName')}</label>
              <input value={form.sender.middle} onChange={(e) => set('sender', 'middle', e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <AddressFields value={form.sender} onField={setSenderField} idPrefix="s" />
          </div>
          <div className="field full tight" style={{ marginTop: 12 }}>
            <label>{t('order.message')}</label>
            <textarea maxLength={75} value={form.sender.msg} onChange={(e) => set('sender', 'msg', e.target.value)} />
            <span className="hint">{msgLeft} {t('order.charsLeft')}</span>
          </div>
          <div className="field full tight" style={{ marginTop: 12 }}>
            <label>{t('order.senderNote')}</label>
            <textarea value={form.sender.note} onChange={(e) => set('sender', 'note', e.target.value)} />
          </div>
        </div>
      </div>

      {/* RECEIVER */}
      <div className="panel panel--receiver">
        <div className="phead">{t('order.receiverInfo')}</div>
        <div className="pbody">
          <div className="grid">
            <div className="field"><label>{t('order.phone')} <span className="r">*</span></label>
              <div className="ac-wrap">
                <input type="tel" value={form.ben.phone} autoComplete="off"
                  onChange={(e) => set('ben', 'phone', e.target.value)}
                  onFocus={() => { rFocusRef.current = true; if (rSug.length) setROpen(true) }}
                  onBlur={() => { rFocusRef.current = false; setTimeout(() => setROpen(false), 150) }} />
                {rOpen && rSug.length > 0 && (
                  <ul className="ac-list">
                    {rSug.map((s, i) => (
                      <li key={i} className="ac-item" onMouseDown={(e) => { e.preventDefault(); pickPair(s.order) }}>
                        <span className="ac-phone">{s.p.phone}</span>
                        <span className="ac-name">{`${s.p.first} ${s.p.last}`.trim()}</span>
                        {(s.other?.first || s.other?.last || s.other?.phone) && (
                          <span className="ac-addr">← Gửi: {`${s.other.first || ''} ${s.other.last || ''}`.trim()}{s.other.phone ? ` (${s.other.phone})` : ''}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="field"><label>{t('order.otherPhone')}</label>
              <input type="tel" value={form.ben.phone2} onChange={(e) => set('ben', 'phone2', e.target.value)} /></div>
          </div>
          <div className="grid">
            <div className="field tight"><label>{t('order.lastName')} <span className="r">*</span></label>
              <input value={form.ben.last} onChange={(e) => set('ben', 'last', e.target.value)} /></div>
            <div className="field tight"><label>{t('order.firstName')} <span className="r">*</span></label>
              <input value={form.ben.first} onChange={(e) => set('ben', 'first', e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <AddressFields value={form.ben} onField={setBenField} idPrefix="b" />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>{t('order.deliveryMethod')}</label>
            <select value={form.ben.delivery} onChange={(e) => set('ben', 'delivery', e.target.value)}>
              <option>{CASH_METHOD}</option>
              <option>{BANK_METHOD}</option>
            </select>
          </div>
          {!isBank && (
            <div className="field full" style={{ marginTop: 12 }}>
              <label>{t('order.payoutAddress')}</label>
              <PayoutAddress
                value={form.ben.payoutAddr}
                onChange={(v) => set('ben', 'payoutAddr', v)}
                placeholder="14391 Deanann Pl, Garden Grove, CA 92843"
              />
            </div>
          )}
        </div>
      </div>

      {/* BANK (chỉ khi chuyển khoản ngân hàng) */}
      {isBank && (
        <div className="panel panel--bank">
          <div className="phead">{t('order.bankInfo')}</div>
          <div className="pbody">
            <div className="field"><label>{t('order.bankName')}</label>
              <input list="vn-bank-list" value={form.bank.name} onChange={(e) => set('bank', 'name', e.target.value)} placeholder="Vietcombank" autoComplete="off" />
              <datalist id="vn-bank-list">
                {VN_BANKS.map((b) => <option key={b} value={b} />)}
              </datalist>
            </div>
            <div className="grid">
              <div className="field tight"><label>{t('order.accountNumber')}</label>
                <input inputMode="numeric" value={form.bank.account} onChange={(e) => set('bank', 'account', e.target.value)} /></div>
              <div className="field tight"><label>{t('order.accountHolder')}</label>
                <input value={form.bank.holder} onChange={(e) => set('bank', 'holder', e.target.value)} /></div>
            </div>
            <div className="field full" style={{ marginTop: 12 }}>
              <label>{t('order.branch')}</label>
              <input value={form.bank.branch} onChange={(e) => set('bank', 'branch', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION */}
      <div className="panel panel--tx">
        <div className="phead">{t('order.txInfo')}</div>
        <div className="pbody">
          <div className="field"><label>{t('order.sendAmount')} <span className="r">*</span></label>
            <CurrencyInput value={form.tx.send} onChange={(v) => set('tx', 'send', v)} unit="USD" />
          </div>
          <div className="grid">
            <div className="field"><label>{t('order.receiveCurrency')}</label>
              <select value={form.tx.cur} onChange={(e) => set('tx', 'cur', e.target.value)}>
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select></div>
            {isVnd && (
              <div className="field"><label>{t('order.rate')}</label>
                <input type="number" min="0" step="0.0001" value={form.tx.rate} onChange={(e) => set('tx', 'rate', e.target.value)} /></div>
            )}
          </div>
          <div className="field"><label>{t('order.receiveAmount')}</label>
            <CurrencyInput value={fmt(computed.receive)} unit={form.tx.cur} readOnly />
          </div>
          <div className="grid">
            <div className="field"><label>{t('order.taxPercent')}</label>
              <input type="number" min="0" step="0.01" value={form.tx.taxPct} onChange={(e) => set('tx', 'taxPct', e.target.value)} /></div>
            <div className="field"><label>{t('order.feePercent')}</label>
              <input type="number" min="0" step="0.01" value={form.tx.feePct} onChange={(e) => set('tx', 'feePct', e.target.value)} /></div>
          </div>
          <div className="grid">
            <div className="field"><label>{t('order.tax')}</label>
              <input type="text" readOnly value={fmt(computed.tax)} /></div>
            <div className="field"><label>{t('order.fee')}</label>
              <input type="text" readOnly value={fmt(computed.fee)} /></div>
          </div>
          <div className="grid">
            <div className="field"><label>{t('order.paymentMethod')} <span className="r">*</span></label>
              <select value={form.tx.pay} onChange={(e) => set('tx', 'pay', e.target.value)}>
                <option>Tiền mặt</option><option>Chuyển khoản</option><option>Thẻ</option>
              </select></div>
            <div className="field"><label>{t('order.status')}</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="pending">{t('status.pending')}</option>
                <option value="processing">{t('status.processing')}</option>
                <option value="completed">{t('status.completed')}</option>
                <option value="cancelled">{t('status.cancelled')}</option>
              </select></div>
          </div>
          <div className="field"><label>{t('order.total')}</label>
            <CurrencyInput value={fmt(computed.total)} unit="USD" readOnly bold />
          </div>
          <div className="field full tight"><label>{t('order.memo')}</label>
            <textarea value={form.tx.memo} onChange={(e) => set('tx', 'memo', e.target.value)} /></div>
          <div className="field full tight"><label>{t('order.employee')} <span className="r">*</span></label>
            <input value={form.employee} onChange={(e) => setForm((f) => ({ ...f, employee: e.target.value }))}
              placeholder={t('order.employee')} readOnly={!isAdmin}
              style={!isAdmin ? { background: 'var(--bg-soft,#f1f1f4)', cursor: 'not-allowed' } : undefined}
              title={!isAdmin ? 'Tự lấy theo tài khoản đang đăng nhập' : undefined} /></div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => navigate(-1)} disabled={busy}>{t('order.cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? t('order.saving') : editing ? t('order.update') : t('order.save')}
        </button>
      </div>
    </div>
  )
}
