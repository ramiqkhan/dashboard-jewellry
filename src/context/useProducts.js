import { createContext, useContext } from 'react'

export const ProductsContext = createContext(null)

export function useProducts() {
  return useContext(ProductsContext)
}
