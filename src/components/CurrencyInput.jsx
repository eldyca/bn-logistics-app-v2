import { groupThousands, toNumberString } from '../lib/format'

// Ô nhập tiền: input số bên trái + ô đơn vị (suffix) bên phải, cùng một khối .inunit.
// - readOnly: caller truyền chuỗi đã format sẵn (vd fmt(receive)) -> hiển thị nguyên trạng.
// - nhập tay: lưu giá trị thô (không dấu phẩy) qua onChange, hiển thị có dấu phẩy hàng nghìn.
export default function CurrencyInput({ value, onChange, unit, readOnly = false, placeholder, bold = false }) {
  const shown = readOnly ? (value ?? '') : groupThousands(value)
  return (
    <div className="inunit">
      <input
        type="text"
        inputMode="decimal"
        value={shown}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={readOnly ? undefined : (e) => onChange(toNumberString(e.target.value))}
        style={bold ? { fontWeight: 700 } : undefined}
      />
      <span className="unit">{unit}</span>
    </div>
  )
}
