import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/products'
import { ProductsContext } from './useProducts'

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('')

  // Returns a cancel function so a stale response can't overwrite newer state.
  const load = useCallback(() => {
    let cancelled = false
    api.fetchAllProducts().then(
      (items) => {
        if (cancelled) return
        setProducts(items)
        setError('')
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

  function refresh() {
    setStatus('loading')
    load()
  }

  // Mutations throw on failure so the caller can show the server's message.
  async function addProduct(formData) {
    const product = await api.createProduct(formData)
    setProducts((prev) => [product, ...prev])
    return product
  }

  async function updateProduct(id, changes) {
    const product = await api.updateProduct(id, changes)
    setProducts((prev) => prev.map((item) => (item._id === id ? product : item)))
    return product
  }

  async function deleteProduct(id) {
    await api.deleteProduct(id)
    setProducts((prev) => prev.filter((item) => item._id !== id))
  }

  return (
    <ProductsContext.Provider
      value={{ products, status, error, refresh, addProduct, updateProduct, deleteProduct }}
    >
      {children}
    </ProductsContext.Provider>
  )
}
