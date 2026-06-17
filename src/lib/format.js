export const num = (v) => parseFloat(v) || 0

export const fmt = (n) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0)

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
