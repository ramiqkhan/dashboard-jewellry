import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProducts } from '../context/useProducts'
import { CATEGORIES, COLLECTIONS, getCategory } from '../data/categories'
import ProductTable from '../components/ProductTable'
import ProductFormModal from '../components/ProductFormModal'
import { exportProductsToExcel } from '../utils/exportExcel'

const FILTERS = [
  { id: 'all', label: 'All products', test: () => true },
  { id: 'new', label: 'New arrivals', test: (product) => product.isNewArrival },
  ...COLLECTIONS.map((collection) => ({
    id: collection.id,
    label: collection.label,
    test: (product) => product.collections.includes(collection.id),
  })),
  { id: 'visible', label: 'Visible in store', test: (product) => product.isActive },
  { id: 'hidden', label: 'Hidden from store', test: (product) => !product.isActive },
]

export default function Products() {
  const { products, status, error, refresh, addProduct, updateProduct, deleteProduct } = useProducts()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [filterId, setFilterId] = useState('all')
  const [modal, setModal] = useState(null) // null | { product } (product undefined = add)
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }

  const activeCategory = getCategory(searchParams.get('category'))?.id ?? null

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  function selectCategory(id) {
    setSearchParams(id ? { category: id } : {})
  }

  // Inline edits from the table. Re-throws so the cell can revert.
  async function handleInlineUpdate(id, changes) {
    try {
      await updateProduct(id, changes)
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
      throw err
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This also removes its images and can't be undone.`)) return
    try {
      await deleteProduct(product._id)
      setNotice({ type: 'success', text: `Deleted "${product.name}".` })
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  async function handleSave(formData) {
    const editing = modal.product
    const saved = editing ? await updateProduct(editing._id, formData) : await addProduct(formData)
    setNotice({ type: 'success', text: editing ? `Saved "${saved.name}".` : `Added "${saved.name}".` })
  }

  const filter = FILTERS.find((item) => item.id === filterId)
  const search = query.trim().toLowerCase()
  const visible = products.filter(
    (product) =>
      (!activeCategory || product.category === activeCategory) &&
      filter.test(product) &&
      (!search ||
        [product.name, product.sku, product.badge, product.description].some((text) =>
          text?.toLowerCase().includes(search),
        )),
  )

  const tabs = [{ id: null, label: 'All', icon: '✨' }, ...CATEGORIES]
  const title = activeCategory ? getCategory(activeCategory).label : 'All Products'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">{title}</h1>
          <p className="mt-1 text-stone-500">
            {status === 'ready' ? `Showing ${visible.length} of ${products.length} products` : 'Loading products…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={refresh}
            disabled={status === 'loading'}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
            title="Reload from server"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={() => exportProductsToExcel(visible, `${activeCategory ?? 'all-products'}.xlsx`)}
            disabled={visible.length === 0}
            className="rounded-lg border border-emerald-700 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⬇ Download Excel
          </button>
          <button
            type="button"
            onClick={() => setModal({})}
            disabled={status !== 'ready'}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span> Add product
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

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 xl:mx-0 xl:px-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeCategory
            const count = tab.id ? products.filter((product) => product.category === tab.id).length : products.length
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => selectCategory(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                <span className={`rounded-full px-1.5 text-xs ${isActive ? 'bg-white/20' : 'bg-stone-100'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={filterId}
            onChange={(event) => setFilterId(event.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            aria-label="Filter products"
          >
            {FILTERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, SKU…"
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 sm:w-64"
          />
        </div>
      </div>

      {status === 'loading' && products.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center text-stone-500">Loading products…</div>
      ) : status === 'error' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center">
          <p className="font-medium text-red-700">Couldn't load products</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 font-medium text-stone-700">{products.length ? 'No products match' : 'No products yet'}</p>
          <p className="text-sm text-stone-500">
            {products.length ? 'Try a different search or filter.' : 'Click "Add product" to create the first one.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-stone-500">
            Tip: click a cell to edit it — Enter saves, Esc cancels. Use ✏️ for sizes, images and descriptions. Click a
            header to sort.
          </p>
          <ProductTable
            products={visible}
            onUpdate={handleInlineUpdate}
            onEdit={(product) => setModal({ product })}
            onDelete={handleDelete}
          />
        </>
      )}

      {modal && (
        <ProductFormModal
          product={modal.product}
          defaultCategory={activeCategory}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
