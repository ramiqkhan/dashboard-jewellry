import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/instagram'
import InstagramFormModal from '../components/InstagramFormModal'

// Same order as the website: display order, then newest first
const byDisplayOrder = (a, b) => a.sortOrder - b.sortOrder || new Date(b.createdAt) - new Date(a.createdAt)

// "https://www.instagram.com/p/abc123/" -> "instagram.com/p/abc123"
const shortLink = (url) => url.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '')

export default function Instagram() {
  const [posts, setPosts] = useState([])
  const [profile, setProfile] = useState(null) // { handle, url }
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // null | { post } (post undefined = add)
  const [notice, setNotice] = useState(null) // { type: 'success' | 'error', text }

  const load = useCallback(() => {
    let cancelled = false
    api.fetchInstagramPosts().then(
      (data) => {
        if (cancelled) return
        setPosts(data.posts)
        setProfile(data.profile)
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
    setPosts((prev) => [saved, ...prev.filter((item) => item._id !== saved._id)].sort(byDisplayOrder))
  }

  async function handleSave(formData) {
    const editing = modal.post
    const saved = editing
      ? await api.updateInstagramPost(editing._id, formData)
      : await api.createInstagramPost(formData)
    replace(saved)
    setNotice({ type: 'success', text: editing ? 'Post saved.' : 'Post added.' })
  }

  async function toggleVisible(post) {
    try {
      replace(await api.updateInstagramPost(post._id, { isActive: !post.isActive }))
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  async function handleDelete(post) {
    if (!window.confirm('Delete this post from the website? The uploaded file is removed too.')) return
    try {
      await api.deleteInstagramPost(post._id)
      setPosts((prev) => prev.filter((item) => item._id !== post._id))
      setNotice({ type: 'success', text: 'Post deleted.' })
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    }
  }

  const visibleCount = posts.filter((post) => post.isActive).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 sm:text-3xl">Instagram Posts</h1>
          <p className="mt-1 text-stone-500">
            {status === 'ready'
              ? `${visibleCount} shown under the reviews, ${posts.length - visibleCount} hidden`
              : 'Loading posts…'}
            {profile?.handle && (
              <>
                {' · '}
                <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">
                  {profile.handle}
                </a>
              </>
            )}
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
            <span className="text-lg leading-none">+</span> Add post
          </button>
        </div>
      </div>

      {status === 'ready' && !profile?.handle && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Set <code className="font-mono">INSTAGRAM_HANDLE</code> in the backend's <code className="font-mono">.env</code> so
          posts without a link open your profile.
        </div>
      )}

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

      {status === 'loading' && posts.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white py-16 text-center text-stone-500">Loading posts…</div>
      ) : status === 'error' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-12 text-center">
          <p className="font-medium text-red-700">Couldn't load Instagram posts</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-4xl">📸</p>
          <p className="mt-3 font-medium text-stone-700">No Instagram posts yet</p>
          <p className="text-sm text-stone-500">Click "Add post", upload the photo or reel and paste its Instagram link.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <div
              key={post._id}
              className={`flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm ${
                post.isActive ? '' : 'opacity-50'
              }`}
            >
              <a href={post.link} target="_blank" rel="noopener noreferrer" className="relative block" title="Open on Instagram">
                <img
                  src={post.media.type === 'video' ? post.posterUrl : post.media.url}
                  alt=""
                  className="aspect-[3/4] w-full bg-stone-100 object-cover"
                />
                {post.media.type === 'video' && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">▶ Reel</span>
                )}
              </a>
              <div className="flex flex-1 flex-col gap-1 p-3 text-sm">
                <span className="truncate font-medium text-stone-800">{post.caption || 'No caption'}</span>
                <span
                  className={`truncate text-xs ${post.postUrl ? 'text-stone-500' : 'text-amber-700'}`}
                  title={post.link}
                >
                  🔗 {post.postUrl ? shortLink(post.postUrl) : 'No link: opens your profile'}
                </span>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-stone-600">
                    <input
                      type="checkbox"
                      checked={post.isActive}
                      onChange={() => toggleVisible(post)}
                      className="h-3.5 w-3.5 accent-emerald-600"
                    />
                    Visible
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="mr-1 text-xs text-stone-400" title="Display order">
                      #{post.sortOrder}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModal({ post })}
                      className="rounded p-1 text-stone-500 transition hover:bg-amber-50 hover:text-amber-700"
                      aria-label="Edit post"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      className="rounded p-1 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete post"
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

      {modal && (
        <InstagramFormModal post={modal.post} profile={profile} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
