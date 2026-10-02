import { useEffect, useRef, useState } from 'react'
import { CATEGORIES, COLLECTIONS } from '../data/categories'

// Mirrors backend/middleware/upload.js
const MAX_IMAGES = 10
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

const DEFAULTS = {
  name: '',
  sku: '',
  brand: 'ZELORA FINE JEWELLERY',
  category: CATEGORIES[0].id,
  collections: [],
  isNewArrival: false,
  isActive: true,
  price: '',
  currency: 'PKR',
  priceNote: 'Taxes & Insured Express Shipping Included',
  description: '',
  badge: '',
  sizeLabel: 'Size',
  sizes: [],
  stock: '0',
  specifications: '',
}

function toForm(product, defaultCategory) {
  if (!product) return { ...DEFAULTS, category: defaultCategory || DEFAULTS.category }
  return {
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    collections: product.collections,
    isNewArrival: product.isNewArrival,
    isActive: product.isActive,
    price: String(product.price),
    currency: product.currency,
    priceNote: product.priceNote,
    description: product.description,
    badge: product.badge,
    sizeLabel: product.sizeLabel,
    sizes: product.sizes.map((size) => ({ label: size.label, stock: String(size.stock) })),
    stock: String(product.stock ?? 0),
    specifications: product.specifications.join('\n'),
  }
}

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

function Field({ label, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

function Section({ title, children }) {
  return (
    <fieldset className="space-y-4 border-t border-stone-200 pt-5 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-sm font-semibold uppercase tracking-wider text-stone-500">{title}</legend>
      {children}
    </fieldset>
  )
}

export default function ProductFormModal({ product, defaultCategory, onSave, onClose }) {
  const editing = Boolean(product)
  const [form, setForm] = useState(() => toForm(product, defaultCategory))
  const [removeIds, setRemoveIds] = useState([])
  const [newImages, setNewImages] = useState([]) // [{ file, preview }]
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const existingImages = product?.images ?? []
  const keptCount = existingImages.filter((img) => !removeIds.includes(img.publicId)).length

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, saving])

  // Free the preview URLs when the modal closes
  const newImagesRef = useRef(newImages)
  useEffect(() => {
    newImagesRef.current = newImages
  }, [newImages])
  useEffect(() => () => newImagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview)), [])

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function bind(field) {
    return { value: form[field], onChange: (event) => set(field, event.target.value) }
  }

  function toggleCollection(id) {
    set('collections', form.collections.includes(id) ? form.collections.filter((c) => c !== id) : [...form.collections, id])
  }

  function updateSize(index, field, value) {
    set('sizes', form.sizes.map((size, i) => (i === index ? { ...size, [field]: value } : size)))
  }

  function addImages(event) {
    const files = [...event.target.files]
    event.target.value = ''

    const bad = files.find((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES)
    if (bad) return setError(`"${bad.name}" must be a JPG, PNG, WEBP or AVIF image of 5MB or less.`)
    if (keptCount + newImages.length + files.length > MAX_IMAGES) {
      return setError(`A product can have at most ${MAX_IMAGES} images.`)
    }

    setError('')
    setNewImages((prev) => [...prev, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
  }

  function removeNewImage(index) {
    URL.revokeObjectURL(newImages[index].preview)
    setNewImages((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleRemoveExisting(publicId) {
    setRemoveIds((prev) => (prev.includes(publicId) ? prev.filter((id) => id !== publicId) : [...prev, publicId]))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const price = Number(form.price)
    const stock = Number(form.stock)
    const sizes = form.sizes
      .filter((size) => size.label.trim())
      .map((size) => ({ label: size.label.trim(), stock: Number(size.stock) || 0 }))

    if (!form.name.trim()) return setError('Product name is required.')
    if (!form.sku.trim()) return setError('SKU is required.')
    if (form.price === '' || !(price >= 0)) return setError('Enter a valid price.')
    if (!sizes.length && (!Number.isInteger(stock) || stock < 0)) return setError('Stock must be a whole number (0 or more).')
    if (sizes.some((size) => !Number.isInteger(size.stock) || size.stock < 0)) {
      return setError('Each size stock must be a whole number (0 or more).')
    }

    // multipart/form-data: arrays go as JSON strings (the backend parses them), images as files
    const body = new FormData()
    for (const field of ['name', 'sku', 'brand', 'category', 'currency', 'priceNote', 'description', 'badge', 'sizeLabel']) {
      body.append(field, form[field].trim())
    }
    body.append('price', String(price))
    body.append('stock', String(sizes.length ? 0 : stock))
    body.append('isNewArrival', String(form.isNewArrival))
    body.append('isActive', String(form.isActive))
    body.append('collections', JSON.stringify(form.collections))
    body.append('sizes', JSON.stringify(sizes))
    body.append(
      'specifications',
      JSON.stringify(form.specifications.split('\n').map((line) => line.trim()).filter(Boolean)),
    )
    if (removeIds.length) body.append('removeImages', JSON.stringify(removeIds))
    newImages.forEach((img) => body.append('images', img.file))

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={saving ? undefined : onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-800">{editing ? `Edit “${product.name}”` : 'Add new product'}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Section title="Basic info">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name *" className="sm:col-span-2">
                <input autoFocus className={inputClass} {...bind('name')} placeholder="e.g. The Royal Solitaire Diamond Ring" />
              </Field>
              <Field label="SKU *" hint="Must be unique, e.g. ZLR-RNG-02">
                <input className={`${inputClass} font-mono uppercase`} {...bind('sku')} placeholder="ZLR-RNG-02" />
              </Field>
              <Field label="Category *">
                <select className={inputClass} {...bind('category')}>
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Brand">
                <input className={inputClass} {...bind('brand')} />
              </Field>
              <Field label="Badge" hint="Optional label, e.g. HAUTE JOAILLERIE">
                <input className={inputClass} {...bind('badge')} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {COLLECTIONS.map((collection) => (
                <label key={collection.id} className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={form.collections.includes(collection.id)}
                    onChange={() => toggleCollection(collection.id)}
                    className="h-4 w-4 accent-amber-600"
                  />
                  {collection.label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={form.isNewArrival}
                  onChange={(event) => set('isNewArrival', event.target.checked)}
                  className="h-4 w-4 accent-amber-600"
                />
                New arrival
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => set('isActive', event.target.checked)}
                  className="h-4 w-4 accent-amber-600"
                />
                Visible in store
              </label>
            </div>
          </Section>

          <Section title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Price *">
                <input type="number" min="0" step="1" className={inputClass} {...bind('price')} placeholder="185000" />
              </Field>
              <Field label="Currency">
                <input className={`${inputClass} uppercase`} {...bind('currency')} />
              </Field>
              <Field label="Price note" className="sm:col-span-3">
                <input className={inputClass} {...bind('priceNote')} />
              </Field>
            </div>
          </Section>

          <Section title="Sizes & stock">
            <p className="text-xs text-stone-500">
              Add sizes if the product comes in sizes (e.g. US 6, 18 Inch) — stock is then tracked per size. Leave empty to
              use a single stock number.
            </p>
            {form.sizes.length > 0 ? (
              <>
                <Field label="Size heading" hint='Shown above the sizes on the product page, e.g. "Select Size"'>
                  <input className={inputClass} {...bind('sizeLabel')} />
                </Field>
                <div className="space-y-2">
                  {form.sizes.map((size, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        className={inputClass}
                        value={size.label}
                        onChange={(event) => updateSize(index, 'label', event.target.value)}
                        placeholder="Size, e.g. US 7"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className={`${inputClass} w-32`}
                        value={size.stock}
                        onChange={(event) => updateSize(index, 'stock', event.target.value)}
                        placeholder="Stock"
                        aria-label="Stock"
                      />
                      <button
                        type="button"
                        onClick={() => set('sizes', form.sizes.filter((_, i) => i !== index))}
                        className="rounded-lg px-3 text-stone-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove size"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Field label="Stock" className="max-w-xs">
                <input type="number" min="0" step="1" className={inputClass} {...bind('stock')} />
              </Field>
            )}
            <button
              type="button"
              onClick={() => set('sizes', [...form.sizes, { label: '', stock: '0' }])}
              className="text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              + Add size
            </button>
          </Section>

          <Section title="Details">
            <Field label="Description">
              <textarea rows={3} className={inputClass} {...bind('description')} />
            </Field>
            <Field label="Specifications" hint="One per line">
              <textarea rows={4} className={inputClass} {...bind('specifications')} placeholder={'18K Solid Yellow Gold\n1.5 Carat Diamond'} />
            </Field>
          </Section>

          <Section title={`Images (${keptCount + newImages.length}/${MAX_IMAGES})`}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {existingImages.map((img) => {
                const removed = removeIds.includes(img.publicId)
                return (
                  <div key={img.publicId || img.url} className="relative">
                    <img
                      src={img.url}
                      alt={img.alt}
                      className={`aspect-square w-full rounded-lg object-cover ${removed ? 'opacity-30 grayscale' : ''}`}
                    />
                    {img.publicId && (
                      <button
                        type="button"
                        onClick={() => toggleRemoveExisting(img.publicId)}
                        className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-stone-700 shadow hover:bg-white"
                      >
                        {removed ? 'Undo' : '✕'}
                      </button>
                    )}
                  </div>
                )
              })}
              {newImages.map((img, index) => (
                <div key={img.preview} className="relative">
                  <img src={img.preview} alt="" className="aspect-square w-full rounded-lg object-cover ring-2 ring-emerald-500" />
                  <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">NEW</span>
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-stone-700 shadow hover:bg-white"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {keptCount + newImages.length < MAX_IMAGES && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-stone-400 transition hover:border-amber-400 hover:text-amber-600">
                  <span className="text-2xl">+</span>
                  <span className="text-xs">Add images</span>
                  <input type="file" multiple accept={IMAGE_TYPES.join(',')} onChange={addImages} className="hidden" />
                </label>
              )}
            </div>
            <p className="text-xs text-stone-500">JPG, PNG, WEBP or AVIF, up to 5MB each. The first image is the main one.</p>
          </Section>
        </div>

        <div className="border-t border-stone-200 px-6 py-4">
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? (newImages.length ? 'Uploading…' : 'Saving…') : editing ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
