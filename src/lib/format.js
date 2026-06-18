export const num = (v) => parseFloat(String(v).replace(/,/g, '')) || 0

// Giữ lại chữ số và tối đa một dấu chấm (giá trị thô, không có dấu phẩy).
export function toNumberString(s) {
  let v = String(s ?? '').replace(/,/g, '').replace(/[^\d.]/g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  return v
}

// Hiển thị giá trị đang gõ ở dạng dấu chấm thập phân, KHÔNG chèn dấu phẩy ngăn nghìn.
export function groupThousands(s) {
  return String(s ?? '').replace(/,/g, '')
}

// Định dạng tiền tệ kiểu Mỹ: dấu chấm thập phân, 2 chữ số, KHÔNG dấu phẩy ngăn nghìn.
// 1000 -> "1000.00", 25.5 -> "25.50", 0 -> "0.00"
export const fmt = (n) => (Number(n) || 0).toFixed(2)

export const fdate = (t) => new Date(t).toLocaleDateString('vi-VN')
export const ftime = (t) => new Date(t).toLocaleString('vi-VN')

export const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Hoàn tất',
  cancelled: 'Đã huỷ',
}

export const STATUS_KEYS = Object.keys(STATUS_LABELS)

export function esc(s) {
  return String(s ?? '')
}
