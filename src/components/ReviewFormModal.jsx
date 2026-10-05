import { useEffect, useState } from 'react'
import { useProducts } from '../context/useProducts'
import FormModal, { Field, inputClass } from './FormModal'

// Mirrors backend/middleware/upload.js
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function toForm(review) {
  return {
    customerName: review?.customerName ?? '',
    text: review?.text ?? '',
    rating: review?.rating ? String(review.rating) : '',
    product: review?.product?._id ?? review?.product ?? '',
    sortOrder: String(review?.sortOrder ?? 0),
    isActive: review?.isActive ?? true,
  }
}

export default function ReviewFormModal({ review, onSave, onClose }) {
  const editing = Boolean(review)
  const { products } = useProducts()
  const [form, setForm] = useState(() => toForm(review))
  const [newImage, setNewImage] = useState(null) // { file, preview }
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Free the preview URL when it is replaced or the modal closes
  useEffect(() => () => newImage && URL.revokeObjectURL(newImage.preview), [newImage])

  const currentImage = newImage?.preview ?? (!removeImage ? review?.image?.url : '')

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function bind(field) {
    return { value: form[field], onChange: (event) => set(field, event.target.value) }
  }

  function pickImage(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      return setError(`"${file.name}" must be a JPG, PNG, WEBP or AVIF image of 5MB or less.`)
    }
    setError('')
    setNewImage({ file, preview: URL.createObjectURL(file) })
  }

  function clearImage() {
    if (newImage) setNewImage(null)
    else setRemoveImage(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!currentImage && !form.text.trim()) return setError('Add a screenshot or write the review text.')
    if (!Number.isInteger(Number(form.sortOrder))) return setError('Display order must be a whole number.')

    const body = new FormData()
    body.append('customerName', form.customerName.trim())
    body.append('text', form.text.trim())
    body.append('rating', form.rating)
    body.append('product', form.product)
    body.append('sortOrder', form.sortOrder)
    body.append('isActive', String(form.isActive))
    if (newImage) body.append('image', newImage.file)
    else if (removeImage) body.append('removeImage', 'true')

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
    <FormModal
      title={editing ? 'Edit review' : 'Add customer review'}
      saving={saving}
      error={error}
      submitLabel={editing ? 'Save changes' : 'Add review'}
      savingLabel={newImage ? 'Uploading…' : 'Saving…'}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
        <div>
          <span className="mb-1 block text-sm font-medium text-stone-700">Screenshot</span>
          {currentImage ? (
            <div className="relative">
              <img src={currentImage} alt="" className="aspect-[3/4] w-full rounded-lg bg-stone-100 object-cover" />
              <div className="absolute inset-x-1 bottom-1 flex gap-1">
                <label className="flex-1 cursor-pointer rounded bg-white/90 py-1 text-center text-xs font-medium text-stone-700 shadow hover:bg-white">
                  Change
                  <input type="file" accept={IMAGE_TYPES.join(',')} onChange={pickImage} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={clearImage}
                  className="rounded bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow hover:bg-white"
                  aria-label="Remove screenshot"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-center text-stone-400 transition hover:border-amber-400 hover:text-amber-600">
              <span className="text-2xl">+</span>
              <span className="px-2 text-xs">Upload DM / story screenshot</span>
              <input type="file" accept={IMAGE_TYPES.join(',')} onChange={pickImage} className="hidden" />
            </label>
          )}
          <p className="mt-1 text-xs text-stone-500">JPG, PNG, WEBP or AVIF, up to 5MB.</p>
          {removeImage && !newImage && (
            <button type="button" onClick={() => setRemoveImage(false)} className="mt-1 text-xs font-medium text-amber-700">
              Undo remove
            </button>
          )}
        </div>

        <div className="space-y-4">
          <Field label="Customer name" hint="Optional">
            <input autoFocus className={inputClass} {...bind('customerName')} placeholder="e.g. Ayesha K." />
          </Field>
          <Field label="Review text" hint="Optional if you uploaded a screenshot">
            <textarea rows={4} className={inputClass} {...bind('text')} placeholder="The fit slayed, it looks so nice on me…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rating">
              <select className={inputClass} {...bind('rating')}>
                <option value="">No rating</option>
                {[5, 4, 3, 2, 1].map((stars) => (
                  <option key={stars} value={stars}>
                    {'★'.repeat(stars)} ({stars})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Display order" hint="Lower numbers show first">
              <input type="number" step="1" className={inputClass} {...bind('sortOrder')} />
            </Field>
          </div>
          <Field label="Product" hint="Optional: also show this review on that product's page">
            <select className={inputClass} {...bind('product')}>
              <option value="">— Not linked —</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
              className="h-4 w-4 accent-amber-600"
            />
            Visible on the website
          </label>
        </div>
      </div>
    </FormModal>
  )
}
