import { useEffect } from 'react'

export const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

export function Field({ label, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

// Modal shell shared by the review and Instagram forms: header, scrolling body, error + buttons
export default function FormModal({ title, saving, error, submitLabel, savingLabel = 'Saving…', onSubmit, onClose, children }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, saving])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={saving ? undefined : onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
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

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>

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
              {saving ? savingLabel : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
