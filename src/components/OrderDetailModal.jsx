import { useEffect, useState } from 'react'
import {
  PAYMENT_STATUSES,
  STATUS_TRANSITIONS,
  getOrderStatus,
  getPaymentMethod,
  getPaymentStatus,
} from '../data/orders'
import { formatDate, formatPrice } from '../utils/format'

function Badge({ className, children }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</h3>
      <div className="space-y-0.5 text-sm text-stone-700">{children}</div>
    </div>
  )
}

const ACTION_STYLES = {
  confirmed: 'bg-sky-600 hover:bg-sky-700 text-white',
  shipped: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  delivered: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  cancelled: 'border border-red-300 text-red-600 hover:bg-red-50',
}

const ACTION_LABELS = {
  confirmed: 'Confirm order',
  shipped: 'Mark as shipped',
  delivered: 'Mark as delivered',
  cancelled: 'Cancel order',
}

export default function OrderDetailModal({ order, onUpdate, onClose }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, saving])

  async function save(changes) {
    setSaving(true)
    setError('')
    try {
      const updated = await onUpdate(order, changes)
      if (updated && changes.status) setNote('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const status = getOrderStatus(order.status)
  const payment = getPaymentStatus(order.paymentStatus)
  const address = order.shippingAddress
  const nextStatuses = STATUS_TRANSITIONS[order.status] ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={saving ? undefined : onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-label={`Order ${order.orderNumber}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-lg font-semibold text-stone-800">{order.orderNumber}</h2>
              <Badge className={status.badge}>{status.label}</Badge>
              <Badge className={payment.badge}>{payment.label}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-stone-500">Placed {formatDate(order.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Customer">
              <p className="font-medium text-stone-800">{order.customer.name}</p>
              <p>
                <a href={`mailto:${order.customer.email}`} className="text-amber-700 hover:underline">
                  {order.customer.email}
                </a>
              </p>
              <p>
                <a href={`tel:${order.customer.phone}`} className="text-amber-700 hover:underline">
                  {order.customer.phone}
                </a>
              </p>
            </Card>
            <Card title="Ship to">
              <p>{address.line1}</p>
              {address.line2 && <p>{address.line2}</p>}
              <p>{[address.city, address.province, address.postalCode].filter(Boolean).join(', ')}</p>
              <p>{address.country}</p>
            </Card>
            <Card title="Payment">
              <p>{getPaymentMethod(order.paymentMethod).label}</p>
              <label className="mt-2 block">
                <span className="mb-1 block text-xs text-stone-500">Payment status</span>
                <select
                  value={order.paymentStatus}
                  onChange={(event) => save({ paymentStatus: event.target.value })}
                  disabled={saving}
                  className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                >
                  {PAYMENT_STATUSES.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Size</th>
                  <th className="px-4 py-2.5 text-right font-medium">Price</th>
                  <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {order.items.map((item) => (
                  <tr key={`${item.product}-${item.size}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-stone-100" />
                        )}
                        <div>
                          <p className="font-medium text-stone-800">{item.name}</p>
                          <p className="font-mono text-xs text-stone-500">{item.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">{item.size || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatPrice(item.price, order.currency)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatPrice(item.lineTotal, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-stone-200 text-sm">
                <tr>
                  <td colSpan={4} className="px-4 pt-3 text-right text-stone-500">Subtotal</td>
                  <td className="whitespace-nowrap px-4 pt-3 text-right tabular-nums">{formatPrice(order.subtotal, order.currency)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-1 text-right text-stone-500">Shipping</td>
                  <td className="whitespace-nowrap px-4 py-1 text-right tabular-nums">
                    {order.shippingFee ? formatPrice(order.shippingFee, order.currency) : 'Free'}
                  </td>
                </tr>
                <tr className="text-base font-semibold text-stone-800">
                  <td colSpan={4} className="px-4 pb-3 text-right">Total</td>
                  <td className="whitespace-nowrap px-4 pb-3 text-right tabular-nums">{formatPrice(order.total, order.currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {order.notes && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">Customer note: </span>
              {order.notes}
            </div>
          )}

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">History</h3>
            <ol className="space-y-3 border-l-2 border-stone-200 pl-4">
              {order.statusHistory.map((entry, index) => {
                const entryStatus = getOrderStatus(entry.status)
                return (
                  <li key={index} className="relative">
                    <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white bg-stone-400" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={entryStatus.badge}>{entryStatus.label}</Badge>
                      <span className="text-xs text-stone-500">{formatDate(entry.at)}</span>
                    </div>
                    {entry.note && <p className="mt-1 text-sm text-stone-600">{entry.note}</p>}
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        <div className="border-t border-stone-200 px-6 py-4">
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {nextStatuses.length > 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note for this update (optional), e.g. tracking number"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((next) => (
                  <button
                    key={next}
                    type="button"
                    disabled={saving}
                    onClick={() => save({ status: next, note: note.trim() })}
                    className={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${ACTION_STYLES[next]}`}
                  >
                    {ACTION_LABELS[next] ?? getOrderStatus(next).label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-500">This order is {status.label.toLowerCase()} — no further status changes.</p>
          )}
        </div>
      </div>
    </div>
  )
}
