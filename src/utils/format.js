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
