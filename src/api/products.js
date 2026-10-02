// Client for the products API (backend/routes/productRoutes.js).
import { request, sendJson } from './client'

// The API caps `limit` at 100, so walk every page. Includes hidden (inactive) products.
export async function fetchAllProducts() {
  const products = []
  let page = 1
  let pages = 1
  do {
    const data = await request(`/products?includeInactive=true&sort=newest&limit=100&page=${page}`)
    products.push(...data.products)
    pages = data.pagination.pages
    page += 1
  } while (page <= pages)
  return products
}

// formData: multipart body with image files under "images" (see ProductFormModal)
export async function createProduct(formData) {
  const data = await request('/products', { method: 'POST', body: formData })
  return data.product
}

// body: FormData (full form, may include images) or a plain object (quick inline edits, sent as JSON)
export async function updateProduct(id, body) {
  const data =
    body instanceof FormData
      ? await request(`/products/${id}`, { method: 'PATCH', body })
      : await sendJson(`/products/${id}`, 'PATCH', body)
  return data.product
}

export async function deleteProduct(id) {
  await request(`/products/${id}`, { method: 'DELETE' })
}
