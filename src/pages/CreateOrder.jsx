import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { num, fmt } from '../lib/format'
import AddressFields from '../components/AddressFields'

const EMPTY = {
  sender: { phone: '', first: '', last: '', middle: '', country: 'United States', state: '', city: '', zip: '', addr: '', msg: '' },
  ben: { phone: '', phone2: '', last: '', first: '', last2: '', first2: '', country: 'Vietnam', state: '', city: '', zip: '', province: '', delivery: 'Giao tận nhà', addr: '' },
  bank: { name: '', account: '', holder: '', branch: '' },
  tx: { send: '0.00', rate: '1.00', taxPct: '0', feePct: '0', pay: 'Tiền mặt', memo: '' },
  major: { first: '', last: '', middle: '', phone: '', addr: '', note1: '', note2: '', note3: '', note4: '' },
  status: 'pending',
}

export default function CreateOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { orders, addOrder, updateOrder } = useOrders()
  const editing = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (editing) {
      const r = orders.find((o) => String(o.id) === String(id))
      if (r) {
        setForm({
          status: r.status,
          sender: { ...EMPTY.sender, ...r.sender },
          ben: { ...EMPTY.ben, ...r.ben },
          bank: { ...r.bank },
          tx: {
            send: r.tx.send, rate: r.tx.rate,
            taxPct: r.tx.taxPct ?? 0, feePct: r.tx.feePct ?? 0,
            pay: r.tx.pay, memo: r.tx.memo,
          },
          major: { ...EMPTY.major, ...(r.major || {}) },
        })
      }
    } else {
      setForm(EMPTY)
    }
  }, [id, editing, orders])

  const set = (group, key, value) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }))
  const setSenderField = (k, v) => set('sender', k, v)
  const setBenField = (k, v) => set('ben', k, v)

  const computed = useMemo(() => {
    const send = num(form.tx.send)
    const rate = num(form.tx.rate)
    const receive = send * rate
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
    if (!form.ben.addr.trim()) miss.push(t('order.address'))
    if (num(form.tx.send) <= 0) miss.push(t('order.sendAmount'))
    if (miss.length) {
      alert(t('order.fillRequired') + miss.join(', '))
      return
    }
    const payload = {
      status: form.status,
      sender: { ...form.sender },
      ben: { ...form.ben },
      bank: { ...form.bank },
      tx: {
        send: num(form.tx.send), rate: num(form.tx.rate), receive: computed.receive,
        taxPct: num(form.tx.taxPct), feePct: num(form.tx.feePct),
        tax: computed.tax, fee: computed.fee,
        pay: form.tx.pay, total: computed.total, memo: form.tx.memo.trim(),
      },
      major: {
        first: form.major.first.trim(), last: form.major.last.trim(),
        middle: form.major.middle.trim(), phone: form.major.phone.trim(),
        addr: form.major.addr.trim(),
        note1: form.major.note1.trim(), note2: form.major.note2.trim(),
        note3: form.major.note3.trim(), note4: form.major.note4.trim(),
      },
    }
    setBusy(true)
    try {
      if (editing) await updateOrder(id, payload)
      else await addOrder(payload)
      navigate('/search-orders')
    } catch (e) {
      alert(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  const msgLeft = 75 - (form.sender.msg?.length || 0)

  return (
    <>
      <div className="viewtitle">{editing ? t('order.editTitle') : t('order.createTitle')}</div>
      <div className="viewsub">{t('order.subtitle')}</div>

      {/* SENDER */}
      <div className="panel">
        <div className="phead">{t('order.senderInfo')}</div>
        <div className="pbody">
          <div className="field"><label>{t('order.phone')} <span className="r">*</span></label>
            <input type="tel" value={form.sender.phone} onChange={(e) => set('sender', 'phone', e.target.value)} /></div>
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
        </div>
      </div>

      {/* RECEIVER */}
      <div className="panel">
        <div className="phead">{t('order.receiverInfo')}</div>
        <div className="pbody">
          <div className="grid">
            <div className="field"><label>{t('order.phone')} <span className="r">*</span></label>
              <input type="tel" value={form.ben.phone} onChange={(e) => set('ben', 'phone', e.target.value)} /></div>
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
              <option>Giao tận nhà</option><option>Nhận tại quầy</option><option>Chuyển khoản ngân hàng</option>
            </select>
          </div>
        </div>
      </div>

      {/* BANK */}
      <div className="panel">
        <div className="phead">{t('order.bankInfo')}</div>
        <div className="pbody">
          <div className="field"><label>{t('order.bankName')}</label>
            <input value={form.bank.name} onChange={(e) => set('bank', 'name', e.target.value)} placeholder="Vietcombank" /></div>
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

      {/* MAJOR CUSTOMER */}
      <div className="panel">
        <div className="phead">{t('order.majorCustomer')}</div>
        <div className="pbody">
          <div className="grid-3">
            <div className="field tight"><label>{t('order.firstName')}</label>
              <input value={form.major.first} onChange={(e) => set('major', 'first', e.target.value)} /></div>
            <div className="field tight"><label>{t('order.lastName')}</label>
              <input value={form.major.last} onChange={(e) => set('major', 'last', e.target.value)} /></div>
            <div className="field tight"><label>{t('order.middleName')}</label>
              <input value={form.major.middle} onChange={(e) => set('major', 'middle', e.target.value)} /></div>
          </div>
          <div className="field" style={{ marginTop: 12 }}><label>{t('order.phone')}</label>
            <input type="tel" value={form.major.phone} onChange={(e) => set('major', 'phone', e.target.value)} /></div>
          <div className="field full" style={{ marginTop: 12 }}><label>{t('order.address')}</label>
            <input value={form.major.addr} onChange={(e) => set('major', 'addr', e.target.value)} /></div>
          <div className="grid" style={{ marginTop: 12 }}>
            <div className="field tight"><label>{t('order.note1')}</label>
              <input value={form.major.note1} onChange={(e) => set('major', 'note1', e.target.value)} /></div>
            <div className="field tight"><label>{t('order.note2')}</label>
              <input value={form.major.note2} onChange={(e) => set('major', 'note2', e.target.value)} /></div>
          </div>
          <div className="grid" style={{ marginTop: 12 }}>
            <div className="field tight"><label>{t('order.note3')}</label>
              <input value={form.major.note3} onChange={(e) => set('major', 'note3', e.target.value)} /></div>
            <div className="field tight"><label>{t('order.note4')}</label>
              <input value={form.major.note4} onChange={(e) => set('major', 'note4', e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* TRANSACTION */}
      <div className="panel">
        <div className="phead">{t('order.txInfo')}</div>
        <div className="pbody">
          <div className="grid">
            <div className="field"><label>{t('order.sendAmount')} <span className="r">*</span></label>
              <input type="number" min="0" step="0.01" value={form.tx.send} onChange={(e) => set('tx', 'send', e.target.value)} /></div>
            <div className="field"><label>{t('order.rate')}</label>
              <input type="number" min="0" step="0.0001" value={form.tx.rate} onChange={(e) => set('tx', 'rate', e.target.value)} /></div>
          </div>
          <div className="field"><label>{t('order.receiveAmount')}</label>
            <input type="text" readOnly value={fmt(computed.receive)} /></div>
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
            <input type="text" readOnly value={fmt(computed.total)} style={{ fontWeight: 700 }} /></div>
          <div className="field full tight"><label>{t('order.memo')}</label>
            <textarea value={form.tx.memo} onChange={(e) => set('tx', 'memo', e.target.value)} /></div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => navigate(-1)} disabled={busy}>{t('order.cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? t('order.saving') : editing ? t('order.update') : t('order.save')}
        </button>
      </div>
    </>
  )
}
