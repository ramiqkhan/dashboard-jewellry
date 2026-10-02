import { LOW_STOCK_THRESHOLD } from '../utils/format'

export default function StockBadge({ stock }) {
  if (stock === 0) {
    return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Out of stock</span>
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Low · {stock}</span>
  }
  return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">In stock · {stock}</span>
}
