import { useEffect, useState } from 'react'
import FormModal, { Field, inputClass } from './FormModal'

// Mirrors backend/middleware/upload.js
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

const INSTAGRAM_URL = /^https:\/\/(www\.)?instagram\.com\//i

function toForm(post) {
  return {
    postUrl: post?.postUrl ?? '',
    caption: post?.caption ?? '',
    sortOrder: String(post?.sortOrder ?? 0),
    isActive: post?.isActive ?? true,
  }
}

export default function InstagramFormModal({ post, profile, onSave, onClose }) {
  const editing = Boolean(post)
  const [form, setForm] = useState(() => toForm(post))
  const [newMedia, setNewMedia] = useState(null) // { file, preview, type }
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Free the preview URL when it is replaced or the modal closes
  useEffect(() => () => newMedia && URL.revokeObjectURL(newMedia.preview), [newMedia])

  const media = newMedia ?? (post ? { preview: post.media.url, type: post.media.type, poster: post.posterUrl } : null)

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function bind(field) {
    return { value: form[field], onChange: (event) => set(field, event.target.value) }
  }

  function pickMedia(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return

    const isVideo = VIDEO_TYPES.includes(file.type)
    if (!isVideo && !IMAGE_TYPES.includes(file.type)) {
      return setError(`"${file.name}" must be a JPG, PNG, WEBP, AVIF image or an MP4, MOV, WEBM video.`)
    }
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
      return setError(isVideo ? 'Videos must be 50MB or smaller.' : 'Images must be 5MB or smaller.')
    }
    setError('')
    setNewMedia({ file, preview: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const postUrl = form.postUrl.trim()
    if (!media) return setError('Upload a photo or video.')
    if (postUrl && !INSTAGRAM_URL.test(postUrl)) {
      return setError('The link must be an Instagram link, e.g. https://www.instagram.com/p/…')
    }
    if (!Number.isInteger(Number(form.sortOrder))) return setError('Display order must be a whole number.')

    const body = new FormData()
    body.append('postUrl', postUrl)
    body.append('caption', form.caption.trim())
    body.append('sortOrder', form.sortOrder)
    body.append('isActive', String(form.isActive))
    if (newMedia) body.append('media', newMedia.file)

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

  const accept = [...IMAGE_TYPES, ...VIDEO_TYPES].join(',')

  return (
    <FormModal
      title={editing ? 'Edit Instagram post' : 'Add Instagram post'}
      saving={saving}
      error={error}
      submitLabel={editing ? 'Save changes' : 'Add post'}
      savingLabel={newMedia ? 'Uploading…' : 'Saving…'}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
        <div>
          <span className="mb-1 block text-sm font-medium text-stone-700">Photo or reel *</span>
          {media ? (
            <div className="relative">
              {media.type === 'video' ? (
                <video
                  src={media.preview}
                  poster={media.poster}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="aspect-[3/4] w-full rounded-lg bg-stone-900 object-cover"
                />
              ) : (
                <img src={media.preview} alt="" className="aspect-[3/4] w-full rounded-lg bg-stone-100 object-cover" />
              )}
              <label className="absolute inset-x-1 bottom-1 cursor-pointer rounded bg-white/90 py-1 text-center text-xs font-medium text-stone-700 shadow hover:bg-white">
                Change
                <input type="file" accept={accept} onChange={pickMedia} className="hidden" />
              </label>
            </div>
          ) : (
            <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-center text-stone-400 transition hover:border-amber-400 hover:text-amber-600">
              <span className="text-2xl">+</span>
              <span className="px-2 text-xs">Upload photo or video</span>
              <input type="file" accept={accept} onChange={pickMedia} className="hidden" />
            </label>
          )}
          <p className="mt-1 text-xs text-stone-500">Images up to 5MB, videos (MP4, MOV) up to 50MB.</p>
        </div>

        <div className="space-y-4">
          <Field
            label="Instagram link"
            hint={`Not shown on the website — clicking the picture opens this link.${
              profile?.url ? ` Leave empty to open your profile (${profile.handle}).` : ''
            }`}
          >
            <input
              autoFocus
              type="url"
              className={inputClass}
              {...bind('postUrl')}
              placeholder="https://www.instagram.com/p/…"
            />
          </Field>
          <Field label="Caption" hint="Optional, shown when hovering over the picture (e.g. a celebrity's name)">
            <input className={inputClass} {...bind('caption')} maxLength={150} placeholder="e.g. Samar Jafri" />
          </Field>
          <Field label="Display order" hint="Lower numbers show first" className="max-w-[12rem]">
            <input type="number" step="1" className={inputClass} {...bind('sortOrder')} />
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
