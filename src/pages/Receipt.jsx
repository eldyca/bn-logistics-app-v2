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

// Nội dung pháp lý bắt buộc (song ngữ) — in nguyên văn ở cuối biên nhận.
const LEGAL = [
  {
    t: 'RIGHT TO REFUND / QUYỀN ĐƯỢC HOÀN TIỀN',
    en: 'You, as the customer, are entitled to a refund of the money transmitted under this agreement if the Company does not forward the funds received from you within ten (10) days of receipt, or does not transmit an equivalent amount to the beneficiary designated by you within ten (10) days of receiving the funds, unless otherwise instructed by you. If your instructions regarding the timing of the transfer are not followed and the funds have not yet been transmitted, you are entitled to a full refund of your money.',
    vi: 'Quý vị, với tư cách là khách hàng, có quyền được hoàn trả số tiền chuyển theo thỏa thuận này nếu Công Ty không thực hiện việc chuyển số tiền đã nhận từ quý vị trong vòng mười (10) ngày kể từ ngày nhận tiền, hoặc không thực hiện việc chuyển một khoản tiền tương đương cho người thụ hưởng do quý vị chỉ định trong vòng mười (10) ngày kể từ ngày nhận tiền, trừ khi quý vị có chỉ thị khác. Nếu chỉ thị của quý vị về thời điểm chuyển tiền không được thực hiện và số tiền đó vẫn chưa được chuyển đi, quý vị có quyền được hoàn lại toàn bộ số tiền của mình.',
  },
  {
    t: "SENDER'S RIGHT TO CANCEL AND RECEIVE A REFUND / QUYỀN CỦA NGƯỜI GỬI ĐỐI VỚI VIỆC HỦY GIAO DỊCH VÀ HOÀN TIỀN",
    en: 'You may cancel the transaction and receive a full refund within thirty (30) minutes of payment, unless the funds have already been received by the beneficiary or deposited into an account.',
    vi: 'Quý vị có thể hủy giao dịch và được hoàn lại toàn bộ số tiền trong vòng ba mươi (30) phút kể từ thời điểm thanh toán, trừ khi khoản tiền đó đã được người nhận nhận hoặc đã được ghi có vào tài khoản.',
  },
  {
    t: 'ERROR RESOLUTION / GIẢI QUYẾT SAI SÓT',
    en: 'If you believe there is an error in your transaction, please contact us at (626) 885-8259 within forty-eight (48) hours.',
    vi: 'Nếu quý vị cho rằng có sai sót trong giao dịch của mình, vui lòng liên hệ với chúng tôi qua số điện thoại (626) 885-8259 trong vòng bốn mươi tám (48) giờ.',
  },
  {
    t: 'PRIVACY POLICY / CHÍNH SÁCH QUYỀN RIÊNG TƯ',
    en: 'We does not disclose any non-public personal or financial information of its customers to third parties, except as permitted by law or as necessary to process and complete transactions requested and authorized by the customer.',
    vi: 'Chúng tôi không tiết lộ bất kỳ thông tin cá nhân hoặc thông tin tài chính không công khai nào của khách hàng cho bên thứ ba, ngoại trừ các trường hợp được pháp luật cho phép hoặc cần thiết để xử lý và thực hiện giao dịch mà quý khách đã yêu cầu và cho phép.',
  },
]

function L({ k, v }) {
  return <div className="rcpt-line"><span className="lk">{k}:</span> <span className="lv">{v || ''}</span></div>
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
  const senderAddr = [order.sender.addr, order.sender.city, order.sender.state, order.sender.zip].filter(Boolean).join(', ')
  const recvAddr = order.ben.payoutAddr || [order.ben.addr, order.ben.city, order.ben.state || order.ben.province].filter(Boolean).join(', ')

  return (
    <>
      <div className="receipt-actions no-print">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>{t('receipt.back')}</button>
        <button className="btn btn-ghost" onClick={() => window.print()}>In PDF</button>
        <button className="btn btn-primary" onClick={() => downloadReceiptPdf({ order })}>Tải PDF</button>
      </div>

      <div className="rcpt-page" id="receipt-sheet">
        {/* Banner tiêu đề */}
        <div className="rcpt-banner">
          <div className="rcpt-bigttl">CUSTOMER RECEIPT</div>
          <div className="rcpt-subttl">Đại lý (Authorized Agent)</div>
          <div className="rcpt-agent">{co.name}</div>
        </div>

        {/* Header: công ty | thông tin đơn */}
        <div className="rcpt-top">
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
            <tr><td>Order No:</td><td>{order.code}</td></tr>
            <tr><td>Ngày / Date:</td><td>{fdate(order.createdAt)}</td></tr>
            <tr><td>Trạng thái / Status:</td><td>{STATUS_BI[order.status] || order.status}</td></tr>
            <tr><td>Employee / Nhân viên:</td><td>{order.employee || '—'}</td></tr>
          </tbody></table>
        </div>

        {/* Hai cột Sender / Recipient */}
        <table className="rcpt-grid">
          <thead><tr><th>SENDER (Người gửi)</th><th>RECIPIENT (Người nhận)</th></tr></thead>
          <tbody><tr>
            <td>
              <L k="Full Name (Họ tên)" v={`${order.sender.first} ${order.sender.last}`.trim()} />
              <L k="Address (Địa chỉ)" v={senderAddr} />
              <L k="Phone (Điện thoại)" v={order.sender.phone} />
              <L k="Amount to be transmitted (Số tiền gửi)" v={`${fmt(order.tx.send)} USD`} />
              <L k="Transmission fee (Phí giao dịch)" v={`${fmt(order.tx.fee)} USD`} />
              <L k="Transfer tax (Thuế)" v={`${fmt(order.tx.tax)} USD`} />
              <L k="Total (Tổng cộng)" v={`${fmt(order.tx.total)} USD`} />
              <L k="Receive amount (Số tiền nhận)" v={`${fmt(order.tx.receive)} ${order.tx.cur}`} />
              <L k="Currency to be delivered (Giao tiền)" v={order.tx.cur} />
            </td>
            <td>
              <L k="Full Name (Họ tên)" v={`${order.ben.first} ${order.ben.last}`.trim()} />
              <L k="Phone (Điện thoại)" v={order.ben.phone} />
              {isBank ? (
                <>
                  <L k="Bank (Ngân hàng)" v={order.bank.name} />
                  <L k="Account No. (Số tài khoản)" v={order.bank.account} />
                  <L k="Account holder (Chủ tài khoản)" v={order.bank.holder} />
                </>
              ) : (
                <L k="Payout address (Địa chỉ nhận tiền)" v={recvAddr} />
              )}
              <L k="Method of Payment (Thanh toán)" v={order.tx.pay} />
              <L k="Delivery method (Hình thức nhận)" v={order.ben.delivery} />
              <L k="Message (Lời nhắn)" v={order.sender.msg} />
              <L k="Notes (Ghi chú)" v={order.tx.memo} />
            </td>
          </tr></tbody>
        </table>

        {/* Chữ ký */}
        <div className="rcpt-signs">
          <div><div className="rcpt-sigline" />Sender's Signature (Chữ ký người gửi)</div>
          <div><div className="rcpt-sigline" />Received By (Nhận bởi)</div>
        </div>

        {/* Nội dung pháp lý */}
        <div className="rcpt-legal">
          {LEGAL.map((s, i) => (
            <div className="rcpt-legal-sec" key={i}>
              <div className="rcpt-legal-ttl">{s.t}</div>
              <div className="rcpt-legal-en">{s.en}</div>
              <div className="rcpt-legal-vi">{s.vi}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
