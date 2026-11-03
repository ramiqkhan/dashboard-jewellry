import { useEffect, useState } from 'react'
import { useProducts } from '../context/useProducts'
import { formatPrice } from '../utils/format'
import FormModal, { Field, inputClass } from './FormModal'

// Mirrors backend/middleware/upload.js and models/Deal.js
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_PERCENT = 90

// Date <-> value for <input type="datetime-local"> (local time)
function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : '')

function toForm(deal) {
  return {
    title: deal?.title ?? '',
    subtitle: deal?.subtitle ?? '',
    badge: deal?.badge ?? '',
    percent: deal?.percent ? String(deal.percent) : '',
    startsAt: toLocalInput(deal?.startsAt),
    endsAt: toLocalInput(deal?.endsAt),
    products: (deal?.products ?? []).map((product) => product._id),
    sortOrder: String(deal?.sortOrder ?? 0),
    isActive: deal?.isActive ?? true,
  }
}

// dealsById: { [dealId]: deal } — to say which other deal a product is already in
export default function DealFormModal({ deal, dealsById, onSave, onClose }) {
  const editing = Boolean(deal)
  const { products } = useProducts()
  const [form, setForm] = useState(() => toForm(deal))
  const [newBanner, setNewBanner] = useState(null) // { file, preview }
  const [removeBanner, setRemoveBanner] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Free the preview URL when it is replaced or the modal closes
  useEffect(() => () => newBanner && URL.revokeObjectURL(newBanner.preview), [newBanner])

  const bannerUrl = newBanner?.preview ?? (!removeBanner ? deal?.banner?.url : '')
  const percent = Number(form.percent)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function bind(field) {
    return { value: form[field], onChange: (event) => set(field, event.target.value) }
  }

  function toggleProduct(id) {
    set('products', form.products.includes(id) ? form.products.filter((p) => p !== id) : [...form.products, id])
  }

  function pickBanner(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      return setError(`"${file.name}" must be a JPG, PNG, WEBP or AVIF image of 5MB or less.`)
    }
    setError('')
    setNewBanner({ file, preview: URL.createObjectURL(file) })
  }

  // Another live/scheduled deal that already discounts this product (ended/hidden ones don't block)
  function otherDeal(product) {
    const dealId = product.discount?.deal
    if (!dealId || dealId === deal?._id) return null
    const other = dealsById[dealId]
    return other && ['live', 'scheduled'].includes(other.status) ? other : null
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) return setError('Give the deal a title.')
    if (!(percent >= 1 && percent <= MAX_PERCENT)) return setError(`Discount must be between 1% and ${MAX_PERCENT}%.`)
    if (form.startsAt && form.endsAt && form.endsAt <= form.startsAt) return setError('The end date must be after the start date.')
    if (!form.products.length) return setError('Pick at least one product for this deal.')
    if (!Number.isInteger(Number(form.sortOrder))) return setError('Display order must be a whole number.')

    const body = new FormData()
    body.append('title', form.title.trim())
    body.append('subtitle', form.subtitle.trim())
    body.append('badge', form.badge.trim())
    body.append('percent', String(percent))
    body.append('startsAt', fromLocalInput(form.startsAt))
    body.append('endsAt', fromLocalInput(form.endsAt))
    body.append('products', JSON.stringify(form.products))
    body.append('sortOrder', form.sortOrder)
    body.append('isActive', String(form.isActive))
    if (newBanner) body.append('banner', newBanner.file)
    else if (removeBanner) body.append('removeBanner', 'true')

    setSaving(true)
    setError('')
    try {
      await onSave(body)
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const search = productSearch.trim().toLowerCase()
  const listed = products
    .filter((product) => !search || [product.name, product.sku].some((text) => text?.toLowerCase().includes(search)))
    // Selected products first, then by name
    .sort((a, b) => form.products.includes(b._id) - form.products.includes(a._id) || a.name.localeCompare(b.name))

  return (
    <FormModal
      title={editing ? `Edit “${deal.title}”` : 'Create a deal'}
      saving={saving}
      error={error}
      submitLabel={editing ? 'Save deal' : 'Create deal'}
      savingLabel={newBanner ? 'Uploading…' : 'Saving…'}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *" className="sm:col-span-2">
          <input autoFocus className={inputClass} {...bind('title')} maxLength={100} placeholder="e.g. Eid Sale" />
        </Field>
        <Field label="Subtitle" hint="Shown under the title on the Deals page" className="sm:col-span-2">
          <input className={inputClass} {...bind('subtitle')} maxLength={300} placeholder="e.g. 30% off selected rings & necklaces" />
        </Field>
        <Field label="Discount % *" hint={`1–${MAX_PERCENT}, applied to every product in the deal`}>
          <input type="number" min="1" max={MAX_PERCENT} step="1" className={inputClass} {...bind('percent')} placeholder="30" />
        </Field>
        <Field label="Badge" hint='Optional label, e.g. "FLASH SALE"'>
          <input className={`${inputClass} uppercase`} {...bind('badge')} maxLength={30} />
        </Field>
        <Field label="Starts" hint="Leave empty to start right away">
          <input type="datetime-local" className={inputClass} {...bind('startsAt')} />
        </Field>
        <Field label="Ends" hint="Leave empty to run until you hide it">
          <input type="datetime-local" min={form.startsAt || undefined} className={inputClass} {...bind('endsAt')} />
        </Field>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-stone-700">Banner image</span>
        {bannerUrl ? (
          <div className="relative">
            <img src={bannerUrl} alt="" className="aspect-[3/1] w-full rounded-lg bg-stone-100 object-cover" />
            <div className="absolute right-2 top-2 flex gap-1">
              <label className="cursor-pointer rounded bg-white/90 px-2 py-1 text-xs font-medium text-stone-700 shadow hover:bg-white">
                Change
                <input type="file" accept={IMAGE_TYPES.join(',')} onChange={pickBanner} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => (newBanner ? setNewBanner(null) : setRemoveBanner(true))}
                className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-white"
                aria-label="Remove banner"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <label className="flex aspect-[6/1] cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 text-sm text-stone-400 transition hover:border-amber-400 hover:text-amber-600">
            <span className="text-xl">+</span> Upload a wide banner (optional)
            <input type="file" accept={IMAGE_TYPES.join(',')} onChange={pickBanner} className="hidden" />
          </label>
        )}
        <p className="mt-1 text-xs text-stone-500">
          Wide image (about 3:1), JPG/PNG/WEBP up to 5MB.
          {removeBanner && !newBanner && (
            <button type="button" onClick={() => setRemoveBanner(false)} className="ml-2 font-medium text-amber-700">
              Undo remove
            </button>
          )}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <span className="text-sm font-medium text-stone-700">
            Products * <span className="font-normal text-stone-500">({form.products.length} selected)</span>
          </span>
          <input
            type="search"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Search name or SKU…"
            className="w-48 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-amber-500"
          />
        </div>
        <div className="max-h-72 divide-y divide-stone-100 overflow-y-auto rounded-lg border border-stone-200">
          {listed.length === 0 && <p className="px-3 py-6 text-center text-sm text-stone-400">No products found.</p>}
          {listed.map((product) => {
            const checked = form.products.includes(product._id)
            const blockedBy = otherDeal(product)
            const dealPrice = percent >= 1 && percent <= MAX_PERCENT ? Math.round(product.price * (1 - percent / 100)) : null
            return (
              <label
                key={product._id}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-stone-50 ${
                  checked ? 'bg-amber-50/60' : ''
                } ${blockedBy && !checked ? 'opacity-60' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProduct(product._id)}
                  className="h-4 w-4 accent-amber-600"
                />
                {product.images?.[0] ? (
                  <img src={product.images[0].url} alt="" className="h-9 w-9 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded bg-stone-100 text-stone-400">—</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-stone-800">
                    {product.name}
                    {!product.isActive && <span className="ml-1.5 text-xs font-normal text-stone-400">(hidden)</span>}
                  </span>
                  <span className="block text-xs text-stone-500">
                    {product.sku}
                    {blockedBy && <span className="ml-2 text-amber-700">· in “{blockedBy.title}”</span>}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs tabular-nums">
                  {checked && dealPrice !== null ? (
                    <>
                      <span className="block text-stone-400 line-through">{formatPrice(product.price, product.currency)}</span>
                      <span className="block font-semibold text-rose-700">{formatPrice(dealPrice, product.currency)}</span>
                    </>
                  ) : (
                    <span className="text-stone-600">{formatPrice(product.price, product.currency)}</span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-stone-500">
          The deal price replaces any discount set on the product itself while the deal is visible. A product can only be in
          one running deal at a time.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <Field label="Display order" hint="Lower numbers show first" className="w-40">
          <input type="number" step="1" className={inputClass} {...bind('sortOrder')} />
        </Field>
        <label className="flex items-center gap-2 pb-6 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
            className="h-4 w-4 accent-amber-600"
          />
          Visible on the website (hidden deals don't discount anything)
        </label>
      </div>
    </FormModal>
  )
}
