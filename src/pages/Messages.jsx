import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/messages'

const PAGE_SIZE = 20

const TABS = [
  { id: '', label: 'All', countKey: 'all' },
  { id: 'new', label: 'New', countKey: 'new' },
  { id: 'read', label: 'Read', countKey: 'read' },
  { id: 'replied', label: 'Replied', countKey: 'replied' },
]

const STATUS_STYLES = {
  new: 'bg-amber-100 text-amber-800',
  read: 'bg-stone-100 text-stone-600',
  replied: 'bg-emerald-100 text-emerald-700',
}

const formatDate = (value) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// One message: collapsed shows a preview, expanded shows the full text and actions
function MessageCard({ message, subjectLabel, expanded, onToggle, onUpdate, onDelete }) {
  const isNew = message.status === 'new'

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
        isNew ? 'border-amber-300' : 'border-stone-200'
      }`}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-stone-50">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isNew ? 'bg-amber-500' : 'bg-transparent'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`text-stone-800 ${isNew ? 'font-semibold' : 'font-medium'}`}>{message.fullName}</span>
            <span className="text-sm text-stone-500">{message.email}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[message.status]}`}>
              {message.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-amber-700">{subjectLabel}</p>
          {!expanded && <p className="mt-1 truncate text-sm text-stone-600">{message.message}</p>}
        </div>
        <span className="shrink-0 whitespace-nowrap text-xs text-stone-400">{formatDate(message.createdAt)}</span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-stone-100 px-5 py-4 sm:pl-11">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{message.message}</p>

          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline text-stone-500">Email: </dt>
              <dd className="inline">
                <a href={`mailto:${message.email}`} className="text-amber-700 hover:underline">
                  {message.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="inline text-stone-500">Phone: </dt>
              <dd className="inline">
                {message.phone ? (
                  <a href={`tel:${message.phone}`} className="text-amber-700 hover:underline">
                    {message.phone}
                  </a>
                ) : (
                  <span className="text-stone-400">Not given</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={message.status}
              onChange={(event) => onUpdate(message._id, { status: event.target.value }).catch(() => {})}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-amber-500"
              aria-label="Status"
            >
              <option value="new">Mark as new</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
            </select>
            <button
              type="button"
              onClick={() => onDelete(message)}
              className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-stone-400 hover:bg-red-50 hover:text-red-600"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Messages() {
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null) // { messages, counts, pagination }
  const [subjects, setSubjects] = useState([])
  const [loaded, setLoaded] = useState({ key: null, error: '' }) // which request last finished, and how
  const [expandedId, setExpandedId] = useState(null)
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }
  const [reloadKey, setReloadKey] = useState(0)

  // Wait until typing pauses before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    api.fetchContactOptions().then((data) => setSubjects(data.subjects), () => {})
  }, [])

  const requestKey = `${status}|${search}|${page}|${reloadKey}`
  useEffect(() => {
    let cancelled = false
    api.fetchMessages({ status, search, page, limit: PAGE_SIZE }).then(
      (data) => {
        if (cancelled) return
        setResult(data)
        setLoaded({ key: requestKey, error: '' })
      },
      (err) => {
        if (cancelled) return
        setLoaded({ key: requestKey, error: err.message })
      },
    )
    return () => {
      cancelled = true
    }
  }, [status, search, page, requestKey])

  // Loading until the response for the current filters arrives
  const loadState = loaded.key !== requestKey ? 'loading' : loaded.error ? 'error' : 'ready'
  const error = loaded.error

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  // Updates one message in place and keeps the tab counts right
  async function handleUpdate(id, changes) {
    try {
      const before = result.messages.find((item) => item._id === id)
      const saved = await api.updateMessage(id, changes)
      setResult((prev) => {
        const counts = { ...prev.counts }
        if (before && before.status !== saved.status) {
          counts[before.status] -= 1
          counts[saved.status] += 1
        }
        return { ...prev, counts, messages: prev.messages.map((item) => (item._id === id ? saved : item)) }
      })
      return saved
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
      throw err
    }
  }

  function toggle(message) {
    const opening = expandedId !== message._id
    setExpandedId(opening ? message._id : null)
    // Opening a new message marks it as read
    if (opening && message.status === 'new') handleUpdate(message._id, { status: 'read' }).catch(() => {})
  }

  async function handleDelete(message) {
    if (!window.confirm(`Delete the message from ${message.fullName}? This can't be undone.`)) return
    try {
      await api.deleteMessage(message._id)
      setNotice({ type: 'success', text: 'Message deleted.' })
      setExpandedId(null)
      refresh()
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  const labelFor = (value) => subjects.find((s) => s.value === value)?.label ?? value
  const counts = result?.counts
  const pagination = result?.pagination

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">Messages</h1>
          <p className="mt-1 text-stone-500">
            {counts ? `${counts.new} new · ${counts.all} total from the contact form` : 'Loading messages…'}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loadState === 'loading'}
          className="self-start rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-50 sm:self-auto"
          title="Check for new messages"
        >
          ↻ Refresh
        </button>
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {TABS.map((tab) => {
            const active = tab.id === status
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setStatus(tab.id)
                  setPage(1)
                }}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'border-amber-600 bg-amber-600 text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-700'
                }`}
              >
                {tab.label}
                {counts && (
                  <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-stone-100'}`}>
                    {counts[tab.countKey]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name, email, phone, message…"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 lg:w-80"
        />
      </div>

      {loadState === 'error' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center">
          <p className="font-medium text-red-700">Couldn't load messages</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      ) : !result ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center text-stone-500">Loading messages…</div>
      ) : result.messages.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-4xl">✉️</p>
          <p className="mt-3 font-medium text-stone-700">
            {search || status ? 'No messages match' : 'No messages yet'}
          </p>
          <p className="text-sm text-stone-500">
            {search || status
              ? 'Try a different tab or search.'
              : 'Messages sent from the contact form on your website will appear here.'}
          </p>
        </div>
      ) : (
        <div className={`space-y-3 ${loadState === 'loading' ? 'opacity-60' : ''}`}>
          {result.messages.map((message) => (
            <MessageCard
              key={message._id}
              message={message}
              subjectLabel={labelFor(message.subject)}
              expanded={expandedId === message._id}
              onToggle={() => toggle(message)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            ← Newer
          </button>
          <span className="text-stone-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.pages}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
          >
            Older →
          </button>
        </div>
      )}
    </div>
  )
}
