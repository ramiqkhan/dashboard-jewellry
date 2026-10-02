import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as ordersApi from '../api/orders'
import { useProducts } from '../context/useProducts'
import { ORDER_SORTS, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, getOrderStatus } from '../data/orders'
import OrdersTable from '../components/OrdersTable'
import OrderDetailModal from '../components/OrderDetailModal'
import { exportOrdersToExcel } from '../utils/exportExcel'
import { formatPrice } from '../utils/format'

const PAGE_SIZE = 20

const selectClass =
  'rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

export default function Orders() {
  const { refresh: refreshProducts } = useProducts()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = ORDER_STATUSES.some((item) => item.id === searchParams.get('status')) ? searchParams.get('status') : ''

  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ search: '', paymentStatus: '', paymentMethod: '', from: '', to: '', sort: 'newest' })
  const [page, setPage] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState({ key: null, orders: [], pagination: null, error: '' })
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }
  const [exporting, setExporting] = useState(false)

  // Server-side query. `to` is inclusive of the whole selected day.
  const params = {
    status,
    ...filters,
    to: filters.to ? `${filters.to}T23:59:59.999` : '',
    page,
    limit: PAGE_SIZE,
  }
  const requestKey = JSON.stringify({ ...params, reloadToken })
  const loading = result.key !== requestKey

  useEffect(() => {
    let cancelled = false
    const query = JSON.parse(requestKey)
    delete query.reloadToken
    ordersApi.fetchOrders(query).then(
      (data) => !cancelled && setResult({ key: requestKey, orders: data.orders, pagination: data.pagination, error: '' }),
      (err) => !cancelled && setResult({ key: requestKey, orders: [], pagination: null, error: err.message }),
    )
    return () => {
      cancelled = true
    }
  }, [requestKey])

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput.trim() ? prev : { ...prev, search: searchInput.trim() }))
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  function setFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setPage(1)
  }

  function selectStatus(id) {
    setSearchParams(id ? { status: id } : {})
    setPage(1)
  }

  function clearFilters() {
    setSearchInput('')
    setFilters({ search: '', paymentStatus: '', paymentMethod: '', from: '', to: '', sort: 'newest' })
    setPage(1)
  }

  // Used by both the table and the detail modal. Returns the updated order, or null if the user backed out.
  async function handleUpdate(order, changes) {
    if (
      changes.status === 'cancelled' &&
      !window.confirm(`Cancel order ${order.orderNumber}? Its items will be returned to stock. This can't be undone.`)
    ) {
      return null
    }

    try {
      const updated = await ordersApi.updateOrderStatus(order._id, changes)
      setResult((prev) => ({ ...prev, orders: prev.orders.map((item) => (item._id === updated._id ? updated : item)) }))
      const what = changes.status ? `marked ${getOrderStatus(updated.status).label.toLowerCase()}` : 'payment updated'
      setNotice({ type: 'success', text: `Order ${updated.orderNumber} ${what}.` })
      // Cancelling puts stock back, so the products list is now stale
      if (changes.status === 'cancelled') refreshProducts()
      return updated
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
      throw err
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all = await ordersApi.fetchAllOrders(params) // walks every page, ignoring the current one
      await exportOrdersToExcel(all, `orders${status ? `-${status}` : ''}.xlsx`)
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    } finally {
      setExporting(false)
    }
  }

  const { orders, pagination, error } = result
  const selected = orders.find((order) => order._id === selectedId)
  const hasFilters = searchInput || filters.paymentStatus || filters.paymentMethod || filters.from || filters.to
  const pageTotal = orders.reduce((sum, order) => sum + (order.status === 'cancelled' ? 0 : order.total), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">
            {status ? `${getOrderStatus(status).label} Orders` : 'All Orders'}
          </h1>
          <p className="mt-1 text-stone-500">
            {pagination ? `${pagination.total} ${pagination.total === 1 ? 'order' : 'orders'}` : 'Loading orders…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !pagination?.total}
            className="rounded-lg border border-emerald-700 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? 'Preparing…' : '⬇ Download Excel'}
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm ${
            notice.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {notice.text}
          <button type="button" onClick={() => setNotice(null)} className="ml-4 opacity-60 hover:opacity-100" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {[{ id: '', label: 'All' }, ...ORDER_STATUSES].map((tab) => {
          const isActive = tab.id === status
          return (
            <button
              key={tab.id || 'all'}
              type="button"
              onClick={() => selectStatus(tab.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'border-amber-600 bg-amber-600 text-white'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Order #, name, email, phone…"
          className={`${selectClass} w-full sm:w-72`}
        />
        <select value={filters.paymentStatus} onChange={(event) => setFilter('paymentStatus', event.target.value)} className={selectClass} aria-label="Payment status">
          <option value="">Any payment status</option>
          {PAYMENT_STATUSES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={filters.paymentMethod} onChange={(event) => setFilter('paymentMethod', event.target.value)} className={selectClass} aria-label="Payment method">
          <option value="">Any payment method</option>
          {PAYMENT_METHODS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          From
          <input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} className={selectClass} />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          To
          <input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} className={selectClass} />
        </label>
        <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)} className={selectClass} aria-label="Sort">
          {ORDER_SORTS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="px-2 py-2 text-sm font-medium text-amber-700 hover:text-amber-800">
            Clear filters
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center">
          <p className="font-medium text-red-700">Couldn't load orders</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      ) : !pagination ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center text-stone-500">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-4xl">📦</p>
          <p className="mt-3 font-medium text-stone-700">{hasFilters || status ? 'No orders match' : 'No orders yet'}</p>
          <p className="text-sm text-stone-500">
            {hasFilters || status ? 'Try a different status or filter.' : 'Orders placed in the store will appear here.'}
          </p>
        </div>
      ) : (
        <div className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <OrdersTable
            orders={orders}
            startIndex={(pagination.page - 1) * pagination.limit}
            onOpen={(order) => setSelectedId(order._id)}
            onUpdate={handleUpdate}
          />
          <div className="flex flex-col gap-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Page {pagination.page} of {Math.max(pagination.pages, 1)} · This page (excl. cancelled):{' '}
              <span className="font-semibold text-stone-800">
                {formatPrice(pageTotal)}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={loading || pagination.page <= 1}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium hover:bg-stone-50 disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || pagination.page >= pagination.pages}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-medium hover:bg-stone-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && <OrderDetailModal order={selected} onUpdate={handleUpdate} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
