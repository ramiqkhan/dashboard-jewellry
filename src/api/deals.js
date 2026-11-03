// Client for the deals API (backend/routes/dealRoutes.js).
import { request, sendJson } from './client'

// Every deal with its status ('live' | 'scheduled' | 'ended' | 'hidden') and products
export async function fetchDeals() {
  const data = await request('/deals?includeInactive=true')
  return data.deals
}

// formData: multipart body, optional banner image under "banner" (see DealFormModal)
export async function createDeal(formData) {
  const data = await request('/deals', { method: 'POST', body: formData })
  return data.deal
}

// body: FormData (full form, may include a new banner) or a plain object (quick toggles, sent as JSON)
export async function updateDeal(id, body) {
  const data =
    body instanceof FormData
      ? await request(`/deals/${id}`, { method: 'PATCH', body })
      : await sendJson(`/deals/${id}`, 'PATCH', body)
  return data.deal
}

export async function deleteDeal(id) {
  await request(`/deals/${id}`, { method: 'DELETE' })
}
