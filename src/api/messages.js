// Client for the contact form messages API (backend/routes/contactRoutes.js).
import { request, sendJson, toQuery } from './client'

// params: status, subject, search, page, limit
// -> { messages, counts: { all, new, read, replied }, pagination }
export function fetchMessages(params) {
  return request(`/contact${toQuery(params)}`)
}

// -> { subjects: [{ value, label }], statuses }
export function fetchContactOptions() {
  return request('/contact/options')
}

// changes: { status?, adminNote? }
export async function updateMessage(id, changes) {
  const data = await sendJson(`/contact/${id}`, 'PATCH', changes)
  return data.contactMessage
}

export async function deleteMessage(id) {
  await request(`/contact/${id}`, { method: 'DELETE' })
}
