import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { fetchOrder } from '../lib/data'
import { fmt, fdate } from '../lib/format'
import { downloadReceiptPdf } from '../lib/receiptPdf'

const STATUS_BI = {
  pending: 'Chờ xử lý / Pending',
  processing: 'Đang xử lý / Processing',
  completed: 'Hoàn tất / Completed',
  cancelled: 'Đã huỷ / Cancelled',
}

function Row({ k, v }) {
  return (
    <div className="rcpt-row"><span className="k">{k}</span><span className="v">{v || '—'}</span></div>
  )
}
function Cell({ k, v, full, total }) {
  return (
    <div className={'cell' + (full ? ' full' : '') + (total ? ' total' : '')}>
      <span className="k">{k}</span><span className="v">{v || '—'}</span>
    </div>
  )
}

function ReceiptCopy({ label, co, order, isBank }) {
  const senderAddr = order.sender.addr
  const recvAddr = order.ben.payoutAddr || [order.ben.addr, order.ben.city, order.ben.state || order.ben.province].filter(Boolean).join(', ')
  return (
    <div className="rcpt-copy">
      <div className="rcpt-copyhead">{label}</div>

      <div className="rcpt-header">
        <div className="rcpt-co">
          {co.logo ? <img className="rcpt-logo" src={co.logo} alt="logo" /> : <div className="rcpt-logo" />}
          <div>
            <div className="rcpt-coname">{co.name}</div>
            {co.address ? <div>{co.address}</div> : null}
            {co.phone ? <div>Tel / ĐT: {co.phone}</div> : null}
            {co.email ? <div>Email: {co.email}</div> : null}
          </div>
        </div>
        <table className="rcpt-meta"><tbody>
          <tr><td>Receipt No:</td><td>{order.code}</td></tr>
          <tr><td>Order No:</td><td>{order.code}</td></tr>
          <tr><td>Ngày / Date:</td><td>{fdate(order.createdAt)}</td></tr>
          <tr><td>Trạng thái / Status:</td><td>{STATUS_BI[order.status] || order.status}</td></tr>
        </tbody></table>
      </div>

      <div className="rcpt-two">
        <div className="rcpt-col">
          <div className="rcpt-secttl">SENDER (Người gửi)</div>
          <Row k="Họ tên / Full Name" v={`${order.sender.first} ${order.sender.last}`.trim()} />
          <Row k="Điện thoại / Phone" v={order.sender.phone} />
          <Row k="Địa chỉ / Address" v={senderAddr} />
          <Row k="Thành phố / City" v={order.sender.city} />
          <Row k="Tiểu bang / State" v={order.sender.state} />
          <Row k="Zip code" v={order.sender.zip} />
        </div>
        <div className="rcpt-col">
          <div className="rcpt-secttl">RECIPIENT (Người nhận)</div>
          <Row k="Họ tên / Full Name" v={`${order.ben.first} ${order.ben.last}`.trim()} />
          <Row k="Điện thoại / Phone" v={order.ben.phone} />
          {isBank ? (
            <>
              <Row k="Ngân hàng / Bank" v={order.bank.name} />
              <Row k="Số tài khoản / Account No." v={order.bank.account} />
              <Row k="Chủ tài khoản / Account Holder" v={order.bank.holder} />
            </>
          ) : (
            <Row k="Địa chỉ nhận tiền / Payout Address" v={recvAddr} />
          )}
        </div>
      </div>

      <div className="rcpt-txttl">TRANSACTION (Thông tin giao dịch)</div>
      <div className="rcpt-tx">
        <Cell k="Số tiền gửi / Send Amount" v={fmt(order.tx.send)} />
        <Cell k="Loại tiền gửi / Send Currency" v="USD" />
        <Cell k="Tỷ giá / Rate" v={order.tx.cur === 'VND' ? fmt(order.tx.rate) : '—'} />
        <Cell k="Loại tiền nhận / Receive Currency" v={order.tx.cur} />
        <Cell k="Số tiền nhận / Receive Amount" v={`${fmt(order.tx.receive)} ${order.tx.cur}`} />
        <Cell k="Thuế / Tax" v={`${fmt(order.tx.tax)} USD`} />
        <Cell k="Phí giao dịch / Transaction Fee" v={`${fmt(order.tx.fee)} USD`} />
        <Cell k="Thanh toán / Payment Method" v={order.tx.pay} />
        <Cell k="Hình thức nhận / Delivery Method" v={order.ben.delivery} full />
        {order.sender.msg ? <Cell k="Lời nhắn / Message" v={order.sender.msg} full /> : null}
        {order.tx.memo ? <Cell k="Ghi chú / Notes" v={order.tx.memo} full /> : null}
        <Cell k="Tổng cộng / Total" v={`${fmt(order.tx.total)} USD`} full total />
      </div>

      <div className="rcpt-signs">
        <div><div className="rcpt-sigline" />Người gửi ký tên / Sender Signature</div>
        <div><div className="rcpt-sigline" />Người nhận ký tên / Recipient Signature</div>
      </div>
    </div>
  )
}

export default function Receipt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { company } = useAuth()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetchOrder(id).then(setOrder).catch((e) => setErr(e.message || String(e)))
  }, [id])

  if (err) return <div className="banner err">{err}</div>
  if (!order) return <div className="empty">{t('common.loading')}</div>

  const co = {
    name: company?.name || 'BN Logistics & Cargo Inc',
    address: company?.address || '',
    phone: company?.phone || '',
    email: company?.email || '',
    logo: company?.logo_url || '',
  }
  const isBank = (order.ben.delivery || '').includes('Chuyển khoản')

  return (
    <>
      <div className="receipt-actions no-print">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>{t('receipt.back')}</button>
        <button className="btn btn-ghost" onClick={() => window.print()}>In PDF</button>
        <button className="btn btn-primary" onClick={() => downloadReceiptPdf({ order })}>Tải PDF</button>
      </div>

      <div className="rcpt-page" id="receipt-sheet">
        <ReceiptCopy label="CUSTOMER COPY (Liên khách hàng)" co={co} order={order} isBank={isBank} />
        <div className="rcpt-cut" />
        <ReceiptCopy label="OFFICE COPY (Liên lưu)" co={co} order={order} isBank={isBank} />
      </div>
    </>
  )
}
