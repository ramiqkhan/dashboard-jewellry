import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProductsProvider } from './context/ProductsContext'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Reviews from './pages/Reviews'
import Instagram from './pages/Instagram'
import Messages from './pages/Messages'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Everything else needs a login. Products load only once signed in. */}
          <Route
            element={
              <RequireAuth>
                <ProductsProvider>
                  <Layout />
                </ProductsProvider>
              </RequireAuth>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/instagram" element={<Instagram />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
