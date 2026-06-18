// Xuất biên nhận ra PDF A4 bằng cách "chụp" đúng phần biên nhận đang hiển thị
// trên màn hình (#receipt-sheet). Cách này giữ NGUYÊN layout song ngữ và hiển
// thị đúng dấu tiếng Việt (font hệ thống của trình duyệt), khớp với bản in.
// jspdf + html2canvas được nạp động -> chỉ tải khi người dùng bấm Xuất PDF.
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

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 10
  const maxW = pageW - margin * 2
  const maxH = pageH - margin * 2

  // Kích thước ảnh (mm) nếu vừa theo chiều rộng
  let w = maxW
  let h = (canvas.height * w) / canvas.width

  if (h <= maxH) {
    // Vừa trong 1 trang: căn giữa theo chiều rộng
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, w, h)
  } else {
    // Cao hơn 1 trang: cắt ảnh thành nhiều trang A4
    const pxPerMm = canvas.width / w
    const pageHpx = maxH * pxPerMm
    let renderedPx = 0
    let page = 0
    while (renderedPx < canvas.height) {
      const slicePx = Math.min(pageHpx, canvas.height - renderedPx)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = slicePx
      const ctx = slice.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx)
      const sliceH = slicePx / pxPerMm
      if (page > 0) doc.addPage()
      doc.addImage(slice.toDataURL('image/png'), 'PNG', margin, margin, w, sliceH)
      renderedPx += slicePx
      page += 1
    }
  }

  doc.save('receipt-' + (order?.code || 'order') + '.pdf')
}
