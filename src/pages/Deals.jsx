import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/deals'
import { useProducts } from '../context/useProducts'
import DealFormModal from '../components/DealFormModal'

const STATUS = {
  live: { label: 'Live', className: 'bg-emerald-100 text-emerald-700' },
  scheduled: { label: 'Scheduled', className: 'bg-sky-100 text-sky-700' },
  ended: { label: 'Ended', className: 'bg-stone-200 text-stone-600' },
  hidden: { label: 'Hidden', className: 'bg-stone-100 text-stone-500' },
}

const formatDate = (value) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function dateRange(deal) {
  if (!deal.startsAt && !deal.endsAt) return 'No end date'
  if (!deal.startsAt) return `Until ${formatDate(deal.endsAt)}`
  if (!deal.endsAt) return `From ${formatDate(deal.startsAt)}`
  return `${formatDate(deal.startsAt)} → ${formatDate(deal.endsAt)}`
}

export default function Deals() {
  const { refresh: refreshProducts } = useProducts()
  const [deals, setDeals] = useState([])
  const [loaded, setLoaded] = useState({ done: false, error: '' })
  const [modal, setModal] = useState(null) // null | { deal } (deal undefined = create)
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.fetchDeals().then(
      (items) => {
        if (cancelled) return
        setDeals(items)
        setLoaded({ done: true, error: '' })
      },
      (err) => !cancelled && setLoaded({ done: true, error: err.message }),
    )
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  // Deals change product prices, so reload both lists after any change
  const reloadAll = useCallback(() => {
    setReloadKey((key) => key + 1)
    refreshProducts()
  }, [refreshProducts])

  async function handleSave(formData) {
    const editing = modal.deal
    const saved = editing ? await api.updateDeal(editing._id, formData) : await api.createDeal(formData)
    setNotice({ type: 'success', text: `${editing ? 'Saved' : 'Created'} “${saved.title}”.` })
    reloadAll()
  }

  async function toggleVisible(deal) {
    try {
      await api.updateDeal(deal._id, { isActive: !deal.isActive })
      reloadAll()
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  async function handleDelete(deal) {
    if (!window.confirm(`Delete “${deal.title}”? Its products go back to their normal prices.`)) return
    try {
      await api.deleteDeal(deal._id)
      setNotice({ type: 'success', text: `Deleted “${deal.title}”.` })
      reloadAll()
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  const dealsById = Object.fromEntries(deals.map((deal) => [deal._id, deal]))
  const liveCount = deals.filter((deal) => deal.status === 'live').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">Deals</h1>
          <p className="mt-1 text-stone-500">
            {loaded.done ? `${liveCount} live on the Deals page · ${deals.length} total` : 'Loading deals…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reloadAll}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-stone-50"
            title="Reload from server"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={() => setModal({})}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
          >
            <span className="text-lg leading-none">+</span> Create deal
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

      {loaded.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center">
          <p className="font-medium text-red-700">Couldn't load deals</p>
          <p className="mt-1 text-sm text-red-600">{loaded.error}</p>
          <button
            type="button"
            onClick={reloadAll}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      ) : !loaded.done ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center text-stone-500">Loading deals…</div>
      ) : deals.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-4xl">🏷️</p>
          <p className="mt-3 font-medium text-stone-700">No deals yet</p>
          <p className="text-sm text-stone-500">Click "Create deal", pick a discount and the products it applies to.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {deals.map((deal) => {
            const status = STATUS[deal.status]
            return (
              <div
                key={deal._id}
                className={`flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm ${
                  deal.status === 'ended' || deal.status === 'hidden' ? 'opacity-70' : ''
                }`}
              >
                {deal.banner?.url ? (
                  <img src={deal.banner.url} alt="" className="aspect-[3/1] w-full bg-stone-100 object-cover" />
                ) : (
                  <div className="flex aspect-[6/1] items-center justify-center bg-gradient-to-r from-stone-800 to-stone-700 text-2xl font-bold text-amber-300">
                    -{deal.percent}%
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-stone-800">
                        {deal.title}
                        {deal.badge && (
                          <span className="ml-2 rounded bg-stone-900 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-white">
                            {deal.badge}
                          </span>
                        )}
                      </h2>
                      {deal.subtitle && <p className="truncate text-sm text-stone-500">{deal.subtitle}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                    <span className="font-semibold text-rose-700">{deal.percent}% off</span>
                    <span>
                      {deal.productCount} {deal.productCount === 1 ? 'product' : 'products'}
                    </span>
                    <span className="text-stone-500">{dateRange(deal)}</span>
                  </div>

                  {deal.products.length > 0 && (
                    <div className="flex -space-x-2 pt-1">
                      {deal.products.slice(0, 8).map((product) =>
                        product.images?.[0] ? (
                          <img
                            key={product._id}
                            src={product.images[0].url}
                            alt={product.name}
                            title={product.name}
                            className="h-9 w-9 rounded-full border-2 border-white object-cover"
                          />
                        ) : (
                          <span
                            key={product._id}
                            title={product.name}
                            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-stone-100 text-xs text-stone-500"
                          >
                            {product.name[0]}
                          </span>
                        ),
                      )}
                      {deal.products.length > 8 && (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-stone-100 text-xs text-stone-600">
                          +{deal.products.length - 8}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between border-t border-stone-100 pt-3">
                    <label className="flex cursor-pointer items-center gap-1.5 text-sm text-stone-600">
                      <input
                        type="checkbox"
                        checked={deal.isActive}
                        onChange={() => toggleVisible(deal)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      Visible
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="mr-1 text-xs text-stone-400" title="Display order">
                        #{deal.sortOrder}
                      </span>
                      <button
                        type="button"
                        onClick={() => setModal({ deal })}
                        className="rounded p-1.5 text-stone-500 transition hover:bg-amber-50 hover:text-amber-700"
                        aria-label={`Edit ${deal.title}`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(deal)}
                        className="rounded p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${deal.title}`}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <DealFormModal deal={modal.deal} dealsById={dealsById} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
