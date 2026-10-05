import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const currentYear = new Date().getFullYear()

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

export default function Login() {
  const { user, login, expiredMessage } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Where to go after logging in: the page the user originally asked for
  const from = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search ?? ''}`
    : '/'

  if (user) return <Navigate to={from} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (!email.trim() || !password) return setError('Please enter your email and password.')

    setSubmitting(true)
    setError('')
    try {
      await login(email.trim(), password, remember)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-900 bg-linear-to-br from-stone-900 via-stone-900 to-amber-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-5xl">💎</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-wide text-white">Zelora Admin</h1>
          <p className="mt-1 text-sm text-stone-400">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-7 shadow-2xl" noValidate>
          {(error || expiredMessage) && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error || expiredMessage}
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">Email</span>
            <input
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">Password</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} pr-16`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-stone-500 hover:text-stone-800"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 accent-amber-600"
            />
            Keep me signed in for 7 days
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">© {currentYear} Zelora Fine Jewellery</p>
      </div>
    </div>
  )
}
