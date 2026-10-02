// Client for the orders API (backend/routes/orderRoutes.js).
import { request, sendJson, toQuery } from './client'

// params: status, paymentStatus, paymentMethod, search, from, to, sort, page, limit
// -> { orders, pagination: { total, page, limit, pages } }
export function fetchOrders(params) {
  return request(`/orders${toQuery(params)}`)
}

// Every order matching the filters (used for Excel export). The API caps `limit` at 100.
export async function fetchAllOrders(params) {
  const orders = []
  let page = 1
  let pages = 1
  do {
    const data = await fetchOrders({ ...params, limit: 100, page })
    orders.push(...data.orders)
    pages = data.pagination.pages
    page += 1
  } while (page <= pages)
  return orders
}

// changes: { status?, paymentStatus?, note? }
export async function updateOrderStatus(id, changes) {
  const data = await sendJson(`/orders/${id}/status`, 'PATCH', changes)
  return data.order
}
