import { useState } from 'react'
import {
  PAYMENT_STATUSES,
  STATUS_TRANSITIONS,
  getOrderStatus,
  getPaymentMethod,
  getPaymentStatus,
} from '../data/orders'
import { formatDate, formatPrice } from '../utils/format'

// A select that looks like a coloured badge. `options` excludes the current value.
function BadgeSelect({ value, label, badge, options, onChange, ariaLabel }) {
  const [saving, setSaving] = useState(false)

  async function handleChange(event) {
    setSaving(true)
    try {
      await onChange(event.target.value)
    } catch {
      // The page shows the error; the select stays at the server value.
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={saving || options.length === 0}
      aria-label={ariaLabel}
      className={`w-full cursor-pointer appearance-none rounded-full px-3 py-1 text-center text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-600 disabled:cursor-default ${badge} ${
        saving ? 'opacity-50' : ''
      }`}
    >
      <option value={value}>{label}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default function OrdersTable({ orders, startIndex, onOpen, onUpdate }) {
  const th = 'border border-stone-300 bg-stone-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-600'
  const td = 'border border-stone-200 px-3 py-2 text-sm text-stone-800'

  return (
    <div className="overflow-auto rounded-lg border border-stone-300 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={`${th} w-12 text-center`}>#</th>
            <th className={th}>Order #</th>
            <th className={th}>Date</th>
            <th className={th}>Customer</th>
            <th className={th}>Phone</th>
            <th className={th}>City</th>
            <th className={`${th} text-right`}>Items</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={th}>Payment</th>
            <th className={`${th} w-32 text-center`}>Paid?</th>
            <th className={`${th} w-36 text-center`}>Status</th>
            <th className={`${th} w-16`} />
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => {
            const status = getOrderStatus(order.status)
            const payment = getPaymentStatus(order.paymentStatus)
            const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
            const nextStatuses = STATUS_TRANSITIONS[order.status]?.map(getOrderStatus) ?? []

            return (
              <tr key={order._id} className="even:bg-stone-50/60 hover:bg-amber-50/60">
                <td className={`${td} bg-stone-100 px-2 text-center text-xs text-stone-500`}>{startIndex + index + 1}</td>
                <td className={`${td} whitespace-nowrap`}>
                  <button
                    type="button"
                    onClick={() => onOpen(order)}
                    className="font-mono text-xs font-semibold text-amber-700 hover:underline"
                  >
                    {order.orderNumber}
                  </button>
                </td>
                <td className={`${td} whitespace-nowrap text-stone-600`}>{formatDate(order.createdAt)}</td>
                <td className={td}>
                  <div className="font-medium">{order.customer.name}</div>
                  <div className="text-xs text-stone-500">{order.customer.email}</div>
                </td>
                <td className={`${td} whitespace-nowrap text-stone-600`}>{order.customer.phone}</td>
                <td className={`${td} text-stone-600`}>{order.shippingAddress.city}</td>
                <td className={`${td} text-right tabular-nums`}>{quantity}</td>
                <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums`}>
                  {formatPrice(order.total, order.currency)}
                </td>
                <td className={`${td} whitespace-nowrap text-stone-600`}>{getPaymentMethod(order.paymentMethod).label}</td>
                <td className={`${td} px-2`}>
                  <BadgeSelect
                    key={order.paymentStatus}
                    value={order.paymentStatus}
                    label={payment.label}
                    badge={payment.badge}
                    options={PAYMENT_STATUSES.filter((option) => option.id !== order.paymentStatus)}
                    onChange={(paymentStatus) => onUpdate(order, { paymentStatus })}
                    ariaLabel={`Payment status for ${order.orderNumber}`}
                  />
                </td>
                <td className={`${td} px-2`}>
                  <BadgeSelect
                    key={order.status}
                    value={order.status}
                    label={status.label}
                    badge={status.badge}
                    options={nextStatuses.map((next) => ({ id: next.id, label: `→ ${next.label}` }))}
                    onChange={(next) => onUpdate(order, { status: next })}
                    ariaLabel={`Status for ${order.orderNumber}`}
                  />
                </td>
                <td className={`${td} text-center`}>
                  <button
                    type="button"
                    onClick={() => onOpen(order)}
                    className="rounded px-2 py-1 text-xs font-medium text-stone-600 hover:bg-amber-50 hover:text-amber-700"
                  >
                    View
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
