// Must match backend/models/Order.js. Labels and colours are dashboard-only.
export const ORDER_STATUSES = [
  { id: 'pending', label: 'Pending', badge: 'bg-amber-100 text-amber-800' },
  { id: 'confirmed', label: 'Confirmed', badge: 'bg-sky-100 text-sky-800' },
  { id: 'shipped', label: 'Shipped', badge: 'bg-indigo-100 text-indigo-800' },
  { id: 'delivered', label: 'Delivered', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'cancelled', label: 'Cancelled', badge: 'bg-red-100 text-red-700' },
]

// Which status an order may move to from its current one
export const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export const PAYMENT_STATUSES = [
  { id: 'pending', label: 'Unpaid', badge: 'bg-stone-100 text-stone-700' },
  { id: 'paid', label: 'Paid', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'refunded', label: 'Refunded', badge: 'bg-purple-100 text-purple-800' },
]

export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on delivery' },
  { id: 'bank-transfer', label: 'Bank transfer' },
]

export const ORDER_SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'total-desc', label: 'Total: high to low' },
  { id: 'total-asc', label: 'Total: low to high' },
]

const find = (list, id) => list.find((item) => item.id === id) ?? { id, label: id, badge: 'bg-stone-100 text-stone-700' }

export const getOrderStatus = (id) => find(ORDER_STATUSES, id)
export const getPaymentStatus = (id) => find(PAYMENT_STATUSES, id)
export const getPaymentMethod = (id) => find(PAYMENT_METHODS, id)
