import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { fetchOrder } from '../lib/data'
import { fmt, fdate } from '../lib/format'
import { downloadReceiptPdf } from '../lib/receiptPdf'

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

  const fee = order.tx.charge + order.tx.comm + order.tx.fee + order.tx.tax
  const senderAddr = [order.sender.addr, order.sender.city, order.sender.state, order.sender.country].filter(Boolean).join(', ')
  const recvAddr = [order.ben.addr, order.ben.city, order.ben.state || order.ben.province, order.ben.country].filter(Boolean).join(', ')

  function exportPdf() {
    downloadReceiptPdf({ company, order, t, employee: order.createdByEmail || user?.email })
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
            {company?.phone ? <div>{t('receipt.phone')}: {company.phone}</div> : null}
          </div>
        </div>
        <hr />
        <h2 className="r-title">{t('receipt.title')}</h2>

        <div className="r-meta">
          <div><span>{t('receipt.transactionNo')}:</span> <strong>{order.code}</strong></div>
          <div><span>{t('receipt.date')}:</span> {fdate(order.createdAt)}</div>
          <div><span>{t('receipt.time')}:</span> {new Date(order.createdAt).toLocaleTimeString()}</div>
          <div><span>{t('receipt.employee')}:</span> {order.createdByEmail || user?.email}</div>
        </div>

        <div className="r-parties">
          <div className="r-party">
            <h3>{t('receipt.sender')}</h3>
            <div>{t('receipt.name')}: {order.sender.first} {order.sender.last}</div>
            <div>{t('receipt.phone')}: {order.sender.phone}</div>
            <div>{t('receipt.address')}: {senderAddr}</div>
          </div>
          <div className="r-party">
            <h3>{t('receipt.receiver')}</h3>
            <div>{t('receipt.name')}: {order.ben.first} {order.ben.last}</div>
            <div>{t('receipt.phone')}: {order.ben.phone}</div>
            <div>{t('receipt.address')}: {recvAddr}</div>
          </div>
        </div>

        <h3 className="r-section">{t('receipt.transfer')}</h3>
        <table className="r-table">
          <tbody>
            <tr><td>{t('receipt.amount')}</td><td>{fmt(order.tx.send)}</td></tr>
            <tr><td>{t('receipt.fee')}</td><td>{fmt(fee)}</td></tr>
            <tr><td>{t('receipt.delivery')}</td><td>{order.ben.delivery}</td></tr>
            <tr><td>{t('receipt.notes')}</td><td>{order.tx.memo}</td></tr>
            <tr className="r-total"><td>{t('receipt.total')}</td><td>{fmt(order.tx.total)}</td></tr>
          </tbody>
        </table>

        <div className="r-signs">
          <div><div className="r-sigline" /> {t('receipt.senderSignature')}</div>
          <div><div className="r-sigline" /> {t('receipt.companySignature')}</div>
        </div>

        <div className="r-footer">{company?.receipt_footer || t('receipt.thanks')}</div>
      </div>
    </>
  )
}
