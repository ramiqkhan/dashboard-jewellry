// Client for the customer reviews API (backend/routes/reviewRoutes.js).
import { request, sendJson } from './client'

// The API caps `limit` at 100, so walk every page. Includes hidden reviews.
export async function fetchAllReviews() {
  const reviews = []
  let page = 1
  let pages = 1
  do {
    const data = await request(`/reviews?includeInactive=true&limit=100&page=${page}`)
    reviews.push(...data.reviews)
    pages = data.pagination.pages
    page += 1
  } while (page <= pages)
  return reviews
}

// formData: multipart body with the screenshot under "image" (see ReviewFormModal)
export async function createReview(formData) {
  const data = await request('/reviews', { method: 'POST', body: formData })
  return data.review
}

// body: FormData (full form, may include a new image) or a plain object (quick toggles, sent as JSON)
export async function updateReview(id, body) {
  const data =
    body instanceof FormData
      ? await request(`/reviews/${id}`, { method: 'PATCH', body })
      : await sendJson(`/reviews/${id}`, 'PATCH', body)
  return data.review
}

export async function deleteReview(id) {
  await request(`/reviews/${id}`, { method: 'DELETE' })
}
