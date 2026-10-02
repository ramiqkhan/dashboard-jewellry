import { Link } from 'react-router-dom'
import { useProducts } from '../context/useProducts'
import { CATEGORIES, getCategory } from '../data/categories'
import { formatPrice, LOW_STOCK_THRESHOLD, totalStock } from '../utils/format'
import StockBadge from '../components/StockBadge'

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${accent}`}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-stone-800">{value}</p>
    </div>
  )
}

export default function Home() {
  const { products, status, error, refresh } = useProducts()

  if (status === 'error') {
    return (
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
    )
  }

  const loading = status === 'loading' && products.length === 0
  const show = (value) => (loading ? '…' : value)

  const activeCount = products.filter((product) => product.isActive).length
  const inventoryValue = products.reduce((sum, product) => sum + product.price * totalStock(product), 0)
  const lowStock = products.filter((product) => totalStock(product) <= LOW_STOCK_THRESHOLD)
  const recent = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">Welcome back 👋</h1>
        <p className="mt-1 text-stone-500">Here's what's happening in your store today.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total products" value={show(products.length)} icon="🛍️" accent="bg-amber-100" />
        <StatCard label="Visible in store" value={show(activeCount)} icon="👁️" accent="bg-sky-100" />
        <StatCard label="Inventory value" value={show(formatPrice(inventoryValue))} icon="💰" accent="bg-emerald-100" />
        <StatCard label="Low / out of stock" value={show(lowStock.length)} icon="⚠️" accent="bg-red-100" />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Categories</h2>
          <Link to="/products" className="text-sm font-medium text-amber-700 hover:text-amber-800">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CATEGORIES.map((category) => {
            const count = products.filter((product) => product.category === category.id).length
            return (
              <Link
                key={category.id}
                to={`/products?category=${category.id}`}
                className="group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
              >
                <span className="text-4xl">{category.icon}</span>
                <h3 className="mt-3 font-semibold text-stone-800 group-hover:text-amber-700">{category.label}</h3>
                <p className="text-sm text-stone-500">{category.description}</p>
                <p className="mt-3 text-sm font-medium text-stone-700">
                  {show(count)} {count === 1 ? 'product' : 'products'}
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-stone-800">Recently added</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-stone-500">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="p-5 text-sm text-stone-500">
            No products yet.{' '}
            <Link to="/products" className="font-medium text-amber-700 hover:text-amber-800">
              Add your first product →
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recent.map((product) => {
                  const category = getCategory(product.category)
                  return (
                    <tr key={product._id} className="hover:bg-stone-50">
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center gap-3">
                          {product.images[0] ? (
                            <img src={product.images[0].url} alt="" className="h-9 w-9 rounded object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded bg-stone-100">{category?.icon}</div>
                          )}
                          <span className="font-medium text-stone-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-stone-600">{product.sku}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-stone-600">
                        {category?.icon} {category?.label}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-stone-800">{formatPrice(product.price, product.currency)}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <StockBadge stock={totalStock(product)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
