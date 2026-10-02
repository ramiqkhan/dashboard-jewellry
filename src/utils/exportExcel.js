import { getCategory, getCollection } from '../data/categories'
import { getOrderStatus, getPaymentMethod, getPaymentStatus } from '../data/orders'
import { formatDate, totalStock } from './format'

// Writes rows (array of plain objects) to a real .xlsx file. The xlsx library is
// loaded on demand so it doesn't bloat the initial page load.
async function downloadSheet(rows, columnWidths, sheetName, fileName) {
  const { utils, writeFile } = await import('xlsx')
  const sheet = utils.json_to_sheet(rows)
  sheet['!cols'] = columnWidths.map((wch) => ({ wch }))
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, sheet, sheetName)
  writeFile(workbook, fileName)
}

export function exportProductsToExcel(products, fileName = 'products.xlsx') {
  const rows = products.map((product, index) => {
    const stock = totalStock(product)
    return {
      '#': index + 1,
      SKU: product.sku,
      'Product Name': product.name,
      Category: getCategory(product.category)?.label ?? product.category,
      Collections: product.collections.map((id) => getCollection(id)?.label ?? id).join(', '),
      Price: product.price,
      Currency: product.currency,
      Stock: stock,
      Sizes: product.sizes.map((size) => `${size.label} (${size.stock})`).join(', '),
      'Stock Value': product.price * stock,
      'New Arrival': product.isNewArrival ? 'Yes' : 'No',
      Active: product.isActive ? 'Yes' : 'No',
      Badge: product.badge,
      Brand: product.brand,
      Image: product.images[0]?.url ?? '',
    }
  })
  return downloadSheet(rows, [5, 14, 34, 12, 24, 10, 8, 7, 34, 13, 11, 7, 18, 24, 50], 'Products', fileName)
}

export function exportOrdersToExcel(orders, fileName = 'orders.xlsx') {
  const rows = orders.map((order, index) => {
    const address = order.shippingAddress
    return {
      '#': index + 1,
      'Order #': order.orderNumber,
      Date: formatDate(order.createdAt),
      Status: getOrderStatus(order.status).label,
      Customer: order.customer.name,
      Email: order.customer.email,
      Phone: order.customer.phone,
      Address: [address.line1, address.line2].filter(Boolean).join(', '),
      City: address.city,
      Province: address.province,
      'Postal Code': address.postalCode,
      Country: address.country,
      Items: order.items
        .map((item) => `${item.name}${item.size ? ` (${item.size})` : ''} ×${item.quantity}`)
        .join('; '),
      Quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      Subtotal: order.subtotal,
      Shipping: order.shippingFee,
      Total: order.total,
      Currency: order.currency,
      'Payment Method': getPaymentMethod(order.paymentMethod).label,
      'Payment Status': getPaymentStatus(order.paymentStatus).label,
      'Customer Note': order.notes,
    }
  })
  return downloadSheet(
    rows,
    [5, 13, 20, 11, 22, 28, 15, 34, 14, 14, 11, 11, 50, 9, 11, 9, 11, 8, 17, 14, 30],
    'Orders',
    fileName,
  )
}
