import { NavLink, useLocation } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'
import { useAuth } from '../context/useAuth'

const linkBase = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition'
const linkIdle = 'text-stone-300 hover:bg-stone-800 hover:text-white'
const linkActive = 'bg-amber-500/15 text-amber-300'
const currentYear = new Date().getFullYear()

export default function Sidebar({ open, onClose }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const activeCategory = new URLSearchParams(location.search).get('category')

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden ${open ? 'block' : 'hidden'}`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-stone-900 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-stone-800 px-6">
          <span className="text-2xl">💎</span>
          <span className="text-lg font-semibold tracking-wide text-white">Zelora Admin</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" onClick={onClose}>
          <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
            <span>🏠</span> Home
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
            <span>📦</span> Orders
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
            <span>✉️</span> Messages
          </NavLink>
          <NavLink to="/reviews" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
            <span>⭐</span> Reviews
          </NavLink>
          <NavLink to="/instagram" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
            <span>📸</span> Instagram
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `${linkBase} ${isActive && !activeCategory ? linkActive : linkIdle}`
            }
          >
            <span>🛍️</span> All Products
          </NavLink>

          <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Categories
          </p>
          {CATEGORIES.map((category) => (
            <NavLink
              key={category.id}
              to={`/products?category=${category.id}`}
              className={`${linkBase} ${activeCategory === category.id ? linkActive : linkIdle}`}
            >
              <span>{category.icon}</span> {category.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-stone-800 p-4">
          {user && (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-stone-400" title={user.email}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-stone-300 transition hover:bg-stone-800 hover:text-white"
              >
                Log out
              </button>
            </div>
          )}
          <p className="text-xs text-stone-500">© {currentYear} Zelora Fine Jewellery</p>
        </div>
      </aside>
    </>
  )
}
