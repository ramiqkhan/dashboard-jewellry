import { useRef, useState } from 'react'
import { CATEGORIES } from '../data/categories'
import { formatPrice, totalStock } from '../utils/format'
import StockBadge from './StockBadge'

const cellInput =
  'w-full bg-transparent px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-emerald-600 disabled:cursor-wait disabled:opacity-60'

// A spreadsheet-style cell: always editable, saves on blur or Enter, Escape cancels.
// If the value is invalid or the server rejects it, the cell reverts.
function EditableCell({ value, type = 'text', onCommit, className = '' }) {
  const [draft, setDraft] = useState(String(value ?? ''))
  const [saving, setSaving] = useState(false)
  const cancelled = useRef(false)

  async function commit() {
    if (cancelled.current) {
      cancelled.current = false
      return
    }

    let next = draft.trim()
    if (type === 'number') {
      next = Number(draft)
      if (draft.trim() === '' || Number.isNaN(next) || next < 0) return setDraft(String(value))
    } else if (!next) {
      return setDraft(String(value ?? ''))
    }
    if (next === value) return

    setSaving(true)
    try {
      await onCommit(next)
    } catch {
      setDraft(String(value ?? ''))
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      type={type}
      min={type === 'number' ? 0 : undefined}
      value={draft}
      disabled={saving}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          cancelled.current = true
          setDraft(String(value ?? ''))
          event.currentTarget.blur()
        }
      }}
      className={`${cellInput} ${className}`}
    />
  )
}

function ToggleCell({ checked, label, onChange }) {
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    try {
      await onChange(!checked)
    } catch {
      // Error already shown by the page; the checkbox stays at the server value.
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={saving}
      onChange={toggle}
      aria-label={label}
      className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-wait"
    />
  )
}

const COLUMNS = [
  { key: 'image', label: '' },
  { key: 'name', label: 'Product Name', sortable: true },
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'price', label: 'Price', sortable: true, numeric: true },
  { key: 'stock', label: 'Stock', sortable: true, numeric: true },
  { key: 'value', label: 'Stock Value', sortable: true, numeric: true },
  { key: 'isNewArrival', label: 'New', sortable: true, center: true },
  { key: 'isActive', label: 'Active', sortable: true, center: true },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
]

function sortValue(product, key) {
  if (key === 'stock') return totalStock(product)
  if (key === 'value') return product.price * totalStock(product)
  const value = product[key]
  return typeof value === 'string' ? value.toLowerCase() : Number(value)
}

export default function ProductTable({ products, onUpdate, onEdit, onDelete }) {
  const [sort, setSort] = useState({ key: null, direction: 'asc' })

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
    )
  }

  const rows = sort.key
    ? [...products].sort((a, b) => {
        const x = sortValue(a, sort.key)
        const y = sortValue(b, sort.key)
        const result = x < y ? -1 : x > y ? 1 : 0
        return sort.direction === 'asc' ? result : -result
      })
    : products

  const sumStock = products.reduce((sum, product) => sum + totalStock(product), 0)
  const sumValue = products.reduce((sum, product) => sum + product.price * totalStock(product), 0)

  const th = 'border border-stone-300 bg-stone-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-stone-600'
  const td = 'border border-stone-200 p-0 text-sm text-stone-800'

  return (
    <div className="overflow-auto rounded-lg border border-stone-300 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={`${th} w-12 text-center`}>#</th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                onClick={column.sortable ? () => toggleSort(column.key) : undefined}
                className={`${th} ${column.numeric ? 'text-right' : ''} ${column.center ? 'text-center' : ''} ${
                  column.sortable ? 'cursor-pointer select-none hover:bg-stone-200' : ''
                }`}
              >
                {column.label}
                {sort.key === column.key && <span className="ml-1">{sort.direction === 'asc' ? '▲' : '▼'}</span>}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((product, index) => {
            const stock = totalStock(product)
            const hasSizes = product.sizes.length > 0
            const save = (changes) => onUpdate(product._id, changes)

            return (
              <tr
                key={product._id}
                className={`even:bg-stone-50/60 hover:bg-amber-50/60 ${product.isActive ? '' : 'text-stone-400 opacity-70'}`}
              >
                <td className={`${td} bg-stone-100 px-2 text-center text-xs text-stone-500`}>{index + 1}</td>
                <td className={`${td} w-14 p-1`}>
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-stone-100 text-stone-400">—</div>
                  )}
                </td>
                <td className={`${td} min-w-60 font-medium`}>
                  <EditableCell key={product.name} value={product.name} onCommit={(name) => save({ name })} />
                </td>
                <td className={`${td} w-36 font-mono text-xs`}>
                  <EditableCell
                    key={product.sku}
                    value={product.sku}
                    onCommit={(sku) => save({ sku: sku.toUpperCase() })}
                    className="uppercase"
                  />
                </td>
                <td className={`${td} w-40`}>
                  <select
                    value={product.category}
                    onChange={(event) => save({ category: event.target.value }).catch(() => {})}
                    className={`${cellInput} cursor-pointer`}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`${td} w-32`}>
                  <EditableCell
                    key={product.price}
                    type="number"
                    value={product.price}
                    onCommit={(price) => save({ price })}
                    className="text-right tabular-nums"
                  />
                </td>
                <td className={`${td} w-24`}>
                  {hasSizes ? (
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      title={product.sizes.map((size) => `${size.label}: ${size.stock}`).join('\n')}
                      className="w-full px-3 py-2 text-right tabular-nums text-stone-600 underline decoration-dotted underline-offset-4 hover:text-amber-700"
                    >
                      {stock}
                    </button>
                  ) : (
                    <EditableCell
                      key={product.stock}
                      type="number"
                      value={product.stock}
                      onCommit={(value) => save({ stock: Math.round(value) })}
                      className="text-right tabular-nums"
                    />
                  )}
                </td>
                <td className={`${td} whitespace-nowrap px-3 text-right tabular-nums text-stone-600`}>
                  {formatPrice(product.price * stock, product.currency)}
                </td>
                <td className={`${td} text-center`}>
                  <ToggleCell
                    checked={product.isNewArrival}
                    label={`${product.name} is a new arrival`}
                    onChange={(isNewArrival) => save({ isNewArrival })}
                  />
                </td>
                <td className={`${td} text-center`}>
                  <ToggleCell
                    checked={product.isActive}
                    label={`${product.name} is visible in the store`}
                    onChange={(isActive) => save({ isActive })}
                  />
                </td>
                <td className={`${td} whitespace-nowrap px-3`}>
                  <StockBadge stock={stock} />
                </td>
                <td className={`${td} w-24 whitespace-nowrap text-center`}>
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="rounded p-1.5 text-stone-500 transition hover:bg-amber-50 hover:text-amber-700"
                    title="Edit all details"
                    aria-label={`Edit ${product.name}`}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="rounded p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Delete product"
                    aria-label={`Delete ${product.name}`}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr className="bg-stone-100 font-semibold text-stone-800">
            <td className={`${td} px-2 text-center text-xs`}>Σ</td>
            <td className={`${td} px-3 py-2`} colSpan={5}>
              Total ({products.length} {products.length === 1 ? 'product' : 'products'})
            </td>
            <td className={`${td} px-3 text-right tabular-nums`}>{sumStock}</td>
            <td className={`${td} whitespace-nowrap px-3 text-right tabular-nums`}>{formatPrice(sumValue)}</td>
            <td className={td} colSpan={4} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
