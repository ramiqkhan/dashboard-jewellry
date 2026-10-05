// Client for the Instagram posts API (backend/routes/instagramRoutes.js).
import { request, sendJson } from './client'

// -> { profile: { handle, url }, posts }. Includes hidden posts.
export function fetchInstagramPosts() {
  return request('/instagram?includeInactive=true&limit=50')
}

// formData: multipart body with the photo/video under "media" (see InstagramFormModal)
export async function createInstagramPost(formData) {
  const data = await request('/instagram', { method: 'POST', body: formData })
  return data.post
}

// body: FormData (full form, may include a new file) or a plain object (quick toggles, sent as JSON)
export async function updateInstagramPost(id, body) {
  const data =
    body instanceof FormData
      ? await request(`/instagram/${id}`, { method: 'PATCH', body })
      : await sendJson(`/instagram/${id}`, 'PATCH', body)
  return data.post
}

export async function deleteInstagramPost(id) {
  await request(`/instagram/${id}`, { method: 'DELETE' })
}
