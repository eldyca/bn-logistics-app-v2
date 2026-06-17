import { jsPDF } from 'jspdf'
import { fmt, fdate, ftime } from './format'

// Sinh biên nhận A4. company = {name,address,phone,logo_url}, order = mapped order,
// t = hàm dịch i18next, employee = email nhân viên.
export function buildReceiptPdf({ company, order, t, employee }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 16
  let y = 16

  // Logo
  if (company?.logo_url && company.logo_url.startsWith('data:image')) {
    try {
      doc.addImage(company.logo_url, 'PNG', M, y, 24, 24)
    } catch {
      /* ignore bad image */
    }
  }

  // Company info (right of logo)
  doc.setFont('helvetica', 'bold').setFontSize(15)
  doc.text(company?.name || 'Company', M + 28, y + 6)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90)
  if (company?.address) doc.text(company.address, M + 28, y + 12)
  if (company?.phone) doc.text((t('receipt.phone') + ': ') + company.phone, M + 28, y + 17)
  doc.setTextColor(0)

  y += 30
  doc.setDrawColor(200).line(M, y, W - M, y)
  y += 10

  // Title
  doc.setFont('helvetica', 'bold').setFontSize(14)
  doc.text(t('receipt.title'), W / 2, y, { align: 'center' })
  y += 10

  // Transaction meta
  doc.setFontSize(10).setFont('helvetica', 'normal')
  const meta = [
    [t('receipt.transactionNo'), order.code],
    [t('receipt.date'), fdate(order.createdAt)],
    [t('receipt.time'), new Date(order.createdAt).toLocaleTimeString()],
    [t('receipt.employee'), employee || ''],
  ]
  meta.forEach((row, i) => {
    const col = i % 2
    const line = Math.floor(i / 2)
    const x = M + col * 90
    doc.setTextColor(90).text(row[0] + ':', x, y + line * 6)
    doc.setTextColor(0).text(String(row[1] || ''), x + 32, y + line * 6)
  })
  y += 18

  // Sender / Receiver boxes
  const boxTop = y
  const colW = (W - M * 2 - 6) / 2
  function party(title, x, info) {
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(0)
    doc.text(title, x, boxTop)
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(40)
    const lines = [
      t('receipt.name') + ': ' + info.name,
      t('receipt.phone') + ': ' + info.phone,
      t('receipt.address') + ': ' + info.addr,
    ]
    doc.text(lines, x, boxTop + 6, { maxWidth: colW })
  }
  party(t('receipt.sender'), M, {
    name: order.sender.first + ' ' + order.sender.last,
    phone: order.sender.phone,
    addr: [order.sender.addr, order.sender.city, order.sender.state, order.sender.country].filter(Boolean).join(', '),
  })
  party(t('receipt.receiver'), M + colW + 6, {
    name: order.ben.first + ' ' + order.ben.last,
    phone: order.ben.phone,
    addr: [order.ben.addr, order.ben.city, order.ben.state || order.ben.province, order.ben.country].filter(Boolean).join(', '),
  })
  y = boxTop + 30

  doc.setDrawColor(220).line(M, y, W - M, y)
  y += 8

  // Transfer details
  doc.setFont('helvetica', 'bold').setFontSize(11).text(t('receipt.transfer'), M, y)
  y += 7
  doc.setFont('helvetica', 'normal').setFontSize(10)
  const fee = order.tx.charge + order.tx.comm + order.tx.fee + order.tx.tax
  const rows = [
    [t('receipt.amount'), fmt(order.tx.send)],
    [t('receipt.fee'), fmt(fee)],
    [t('receipt.delivery'), order.ben.delivery || ''],
    [t('receipt.notes'), order.tx.memo || ''],
  ]
  rows.forEach((r) => {
    doc.setTextColor(90).text(r[0] + ':', M, y)
    doc.setTextColor(0).text(String(r[1]), M + 50, y, { maxWidth: W - M * 2 - 50 })
    y += 7
  })
  // Total emphasized
  doc.setDrawColor(220).line(M, y, W - M, y)
  y += 7
  doc.setFont('helvetica', 'bold').setFontSize(12)
  doc.text(t('receipt.total') + ':', M, y)
  doc.text(fmt(order.tx.total), M + 50, y)
  y += 18

  // Signatures
  const sigY = Math.max(y, 250)
  doc.setDrawColor(120)
  doc.line(M, sigY, M + 70, sigY)
  doc.line(W - M - 70, sigY, W - M, sigY)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90)
  doc.text(t('receipt.senderSignature'), M, sigY + 5)
  doc.text(t('receipt.companySignature'), W - M - 70, sigY + 5)

  // Footer
  doc.setFontSize(9).setTextColor(120)
  const footer = company?.receipt_footer || t('receipt.thanks')
  doc.text(footer, W / 2, 285, { align: 'center' })

  return doc
}

export function downloadReceiptPdf(opts) {
  const doc = buildReceiptPdf(opts)
  doc.save('receipt-' + (opts.order.code || 'order') + '.pdf')
}
