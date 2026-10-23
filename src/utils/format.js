export const LOW_STOCK_THRESHOLD = 5

const formatters = {}

export function formatPrice(value, currency = 'PKR') {
  formatters[currency] ??= new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
  return formatters[currency].format(value || 0)
}

// Products with sizes keep stock per size; the top-level stock is only used when there are none.
export function totalStock(product) {
  return product.sizes?.length
    ? product.sizes.reduce((sum, size) => sum + (size.stock || 0), 0)
    : product.stock || 0
}

const dateFormatter = new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

// Mirrors isDiscountActive / currentPrice in backend/models/Product.js (the backend is the source of truth at checkout).
export function isDiscountActive(product, now = new Date()) {
  const { percent, startsAt, endsAt } = product.discount || {}
  if (!(percent > 0)) return false
  if (startsAt && new Date(startsAt) > now) return false
  if (endsAt && new Date(endsAt) < now) return false
  return true
}

export function salePrice(product) {
  return isDiscountActive(product) ? Math.round(product.price * (1 - product.discount.percent / 100)) : product.price
}

// 'scheduled' | 'active' | 'ended' | null — for the discount badge
export function discountState(product, now = new Date()) {
  const { percent, startsAt, endsAt } = product.discount || {}
  if (!(percent > 0)) return null
  if (startsAt && new Date(startsAt) > now) return 'scheduled'
  if (endsAt && new Date(endsAt) < now) return 'ended'
  return 'active'
}
