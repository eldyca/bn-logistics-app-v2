// Xuất biên nhận ra PDF khổ Letter (8.5 x 11 inch) bằng cách "chụp" phần biên
// nhận đang hiển thị (#receipt-sheet). Giữ nguyên layout + dấu tiếng Việt, luôn
// co vừa GỌN trong 1 trang (contain), không tràn trang, không cắt chữ.
// jspdf + html2canvas nạp động -> chỉ tải khi bấm Tải PDF.
export async function downloadReceiptPdf({ order } = {}) {
  const el = document.getElementById('receipt-sheet')
  if (!el) return

  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })

  // Letter: 215.9 x 279.4 mm
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const pageW = 215.9
  const pageH = 279.4
  const margin = 8
  const maxW = pageW - margin * 2
  const maxH = pageH - margin * 2

  // Co vừa cả chiều rộng và chiều cao (contain) -> luôn 1 trang
  const ratio = Math.min(maxW / canvas.width, maxH / canvas.height)
  const w = canvas.width * ratio
  const h = canvas.height * ratio
  const x = (pageW - w) / 2
  const y = margin

  doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h)
  doc.save('receipt-' + (order?.code || 'order') + '.pdf')
}
