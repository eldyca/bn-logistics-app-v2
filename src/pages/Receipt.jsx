import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { fetchOrder } from '../lib/data'
import { fmt, fdate } from '../lib/format'
import { downloadReceiptPdf } from '../lib/receiptPdf'

// Nhãn song ngữ Việt / English — luôn hiển thị cả hai bất kể ngôn ngữ đang chọn.
export const RL = {
  title: 'BIÊN NHẬN CHUYỂN TIỀN / TRANSFER RECEIPT',
  orderCode: 'Mã đơn / Order Code',
  date: 'Ngày tạo / Created Date',
  time: 'Giờ / Time',
  employee: 'Nhân viên / Employee',
  sender: 'NGƯỜI GỬI / SENDER',
  receiver: 'NGƯỜI NHẬN / RECEIVER',
  name: 'Họ tên / Name',
  phone: 'Điện thoại / Phone',
  address: 'Địa chỉ / Address',
  transfer: 'CHI TIẾT GIAO DỊCH / TRANSFER DETAILS',
  sendAmount: 'Số tiền gửi / Send Amount',
  rate: 'Tỷ giá / Rate',
  receiveAmount: 'Số tiền nhận / Receive Amount',
  tax: 'Thuế / Tax',
  fee: 'Phí giao dịch / Transaction Fee',
  delivery: 'Hình thức nhận / Delivery Method',
  bankName: 'Ngân hàng / Bank',
  accountNumber: 'Số tài khoản / Account No.',
  accountHolder: 'Chủ tài khoản / Account Holder',
  payout: 'Địa chỉ nhận tiền / Payout Address',
  message: 'Lời nhắn / Message',
  status: 'Trạng thái / Status',
  notes: 'Ghi chú / Notes',
  total: 'Tổng cộng / Total',
  senderSignature: 'Chữ ký người gửi / Sender Signature',
  companySignature: 'Chữ ký công ty / Company Signature',
  thanks: 'Cảm ơn quý khách. / Thank you for your business.',
}

export const STATUS_BI = {
  pending: 'Chờ xử lý / Pending',
  processing: 'Đang xử lý / Processing',
  completed: 'Hoàn tất / Completed',
  cancelled: 'Đã huỷ / Cancelled',
}

export default function Receipt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { company, user } = useAuth()
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetchOrder(id).then(setOrder).catch((e) => setErr(e.message || String(e)))
  }, [id])

  if (err) return <div className="banner err">{err}</div>
  if (!order) return <div className="empty">{t('common.loading')}</div>

  const senderAddr = [order.sender.addr, order.sender.city, order.sender.state, order.sender.country].filter(Boolean).join(', ')
  const recvAddr = [order.ben.addr, order.ben.city, order.ben.state || order.ben.province, order.ben.country].filter(Boolean).join(', ')
  const isBank = order.ben.delivery === 'Chuyển khoản ngân hàng'

  function exportPdf() {
    downloadReceiptPdf({ company, order, employee: order.createdByEmail || user?.email })
  }

  return (
    <>
      <div className="receipt-actions no-print">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>{t('receipt.back')}</button>
        <button className="btn btn-ghost" onClick={() => window.print()}>{t('receipt.print')}</button>
        <button className="btn btn-primary" onClick={exportPdf}>{t('receipt.exportPdf')}</button>
      </div>

      <div className="receipt-sheet" id="receipt-sheet">
        <div className="r-head">
          {company?.logo_url ? <img className="r-logo" src={company.logo_url} alt="logo" /> : null}
          <div className="r-company">
            <div className="r-cname">{company?.name || 'Company'}</div>
            {company?.address ? <div>{company.address}</div> : null}
            {company?.phone ? <div>{RL.phone}: {company.phone}</div> : null}
          </div>
        </div>
        <hr />
        <h2 className="r-title">{RL.title}</h2>

        <div className="r-meta">
          <div><span>{RL.orderCode}:</span> <strong>{order.code}</strong></div>
          <div><span>{RL.date}:</span> {fdate(order.createdAt)}</div>
          <div><span>{RL.time}:</span> {new Date(order.createdAt).toLocaleTimeString()}</div>
          <div><span>{RL.employee}:</span> {order.createdByEmail || user?.email}</div>
        </div>

        <div className="r-parties">
          <div className="r-party">
            <h3>{RL.sender}</h3>
            <div>{RL.name}: {order.sender.first} {order.sender.last}</div>
            <div>{RL.phone}: {order.sender.phone}</div>
            <div>{RL.address}: {senderAddr}</div>
          </div>
          <div className="r-party">
            <h3>{RL.receiver}</h3>
            <div>{RL.name}: {order.ben.first} {order.ben.last}</div>
            <div>{RL.phone}: {order.ben.phone}</div>
            <div>{RL.address}: {recvAddr}</div>
          </div>
        </div>

        <h3 className="r-section">{RL.transfer}</h3>
        <table className="r-table">
          <tbody>
            <tr><td>{RL.sendAmount}</td><td>{fmt(order.tx.send)} USD</td></tr>
            {order.tx.cur === 'VND' && (
              <tr><td>{RL.rate}</td><td>{fmt(order.tx.rate)}</td></tr>
            )}
            <tr><td>{RL.receiveAmount}</td><td>{fmt(order.tx.receive)} {order.tx.cur}</td></tr>
            <tr><td>{RL.tax}</td><td>{fmt(order.tx.tax)} USD</td></tr>
            <tr><td>{RL.fee}</td><td>{fmt(order.tx.fee)} USD</td></tr>
            <tr><td>{RL.delivery}</td><td>{order.ben.delivery}</td></tr>
            {isBank ? (
              <>
                <tr><td>{RL.bankName}</td><td>{order.bank.name}</td></tr>
                <tr><td>{RL.accountNumber}</td><td>{order.bank.account}</td></tr>
                <tr><td>{RL.accountHolder}</td><td>{order.bank.holder}</td></tr>
              </>
            ) : (
              <tr><td>{RL.payout}</td><td>{order.ben.payoutAddr || recvAddr}</td></tr>
            )}
            <tr><td>{RL.status}</td><td>{STATUS_BI[order.status] || order.status}</td></tr>
            {order.sender.msg ? <tr><td>{RL.message}</td><td>{order.sender.msg}</td></tr> : null}
            {order.tx.memo ? <tr><td>{RL.notes}</td><td>{order.tx.memo}</td></tr> : null}
            <tr className="r-total"><td>{RL.total}</td><td>{fmt(order.tx.total)} USD</td></tr>
          </tbody>
        </table>

        <div className="r-signs">
          <div><div className="r-sigline" /> {RL.senderSignature}</div>
          <div><div className="r-sigline" /> {RL.companySignature}</div>
        </div>

        <div className="r-footer">{company?.receipt_footer || RL.thanks}</div>
      </div>
    </>
  )
}
