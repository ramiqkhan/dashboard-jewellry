import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/reviews'
import ReviewFormModal from '../components/ReviewFormModal'

// Same order as the website: display order, then newest first
const byDisplayOrder = (a, b) => a.sortOrder - b.sortOrder || new Date(b.createdAt) - new Date(a.createdAt)

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // null | { review } (review undefined = add)
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }

  const load = useCallback(() => {
    let cancelled = false
    api.fetchAllReviews().then(
      (items) => {
        if (cancelled) return
        setReviews(items)
        setStatus('ready')
      },
      (err) => {
        if (cancelled) return
        setError(err.message)
        setStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => load(), [load])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  function refresh() {
    setStatus('loading')
    load()
  }

  function replace(saved) {
    setReviews((prev) => [saved, ...prev.filter((item) => item._id !== saved._id)].sort(byDisplayOrder))
  }

  async function handleSave(formData) {
    const editing = modal.review
    const saved = editing ? await api.updateReview(editing._id, formData) : await api.createReview(formData)
    replace(saved)
    setNotice({ type: 'success', text: editing ? 'Review saved.' : 'Review added.' })
  }

  async function toggleVisible(review) {
    try {
      replace(await api.updateReview(review._id, { isActive: !review.isActive }))
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  async function handleDelete(review) {
    if (!window.confirm('Delete this review? Its screenshot is removed too and this can\'t be undone.')) return
    try {
      await api.deleteReview(review._id)
      setReviews((prev) => prev.filter((item) => item._id !== review._id))
      setNotice({ type: 'success', text: 'Review deleted.' })
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  const visibleCount = reviews.filter((review) => review.isActive).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">Customer Reviews</h1>
          <p className="mt-1 text-stone-500">
            {status === 'ready'
              ? `${visibleCount} shown on the website, ${reviews.length - visibleCount} hidden`
              : 'Loading reviews…'}
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
            onClick={() => setModal({})}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
          >
            <span className="text-lg leading-none">+</span> Add review
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

      {status === 'loading' && reviews.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center text-stone-500">Loading reviews…</div>
      ) : status === 'error' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center">
          <p className="font-medium text-red-700">Couldn't load reviews</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-4xl">⭐</p>
          <p className="mt-3 font-medium text-stone-700">No reviews yet</p>
          <p className="text-sm text-stone-500">Click "Add review" and upload a customer's DM or story screenshot.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              className={`flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm ${
                review.isActive ? '' : 'opacity-50'
              }`}
            >
              {review.image?.url ? (
                <img src={review.image.url} alt="" className="aspect-[3/4] w-full bg-stone-100 object-cover" />
              ) : (
                <div className="flex aspect-[3/4] items-center bg-stone-50 p-4 text-sm italic text-stone-600">
                  “{review.text}”
                </div>
              )}
              <div className="flex flex-1 flex-col gap-1 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-stone-800">{review.customerName || 'Customer'}</span>
                  {review.rating && <span className="shrink-0 text-xs text-amber-500">{'★'.repeat(review.rating)}</span>}
                </div>
                {review.image?.url && review.text && <p className="line-clamp-2 text-xs text-stone-500">{review.text}</p>}
                {review.product && <p className="truncate text-xs text-amber-700">🔗 {review.product.name}</p>}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-stone-600">
                    <input
                      type="checkbox"
                      checked={review.isActive}
                      onChange={() => toggleVisible(review)}
                      className="h-3.5 w-3.5 accent-emerald-600"
                    />
                    Visible
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="mr-1 text-xs text-stone-400" title="Display order">
                      #{review.sortOrder}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModal({ review })}
                      className="rounded p-1 text-stone-500 transition hover:bg-amber-50 hover:text-amber-700"
                      aria-label="Edit review"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(review)}
                      className="rounded p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete review"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <ReviewFormModal review={modal.review} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  )
}
