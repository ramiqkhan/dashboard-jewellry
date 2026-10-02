import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProductsProvider } from './context/ProductsContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Products from './pages/Products'
import Orders from './pages/Orders'

function App() {
  return (
    <ProductsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProductsProvider>
  )
}

export default App
