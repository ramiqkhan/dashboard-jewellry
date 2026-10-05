// Shared fetch helper for the Zelora API. Attaches the admin login token to every request.
const API_URL = (import.meta.env.VITE_API_URL || 'https://backend-jewellry.vercel.app/api').replace(/\/$/, '')

// --- Session (token from POST /auth/login) ---------------------------------
// "Keep me signed in" stores it in localStorage, otherwise sessionStorage (cleared when the browser closes).
const SESSION_KEY = 'zelora-admin-session'

function readStored(storageName) {
  try {
    const session = JSON.parse(window[storageName].getItem(SESSION_KEY))
    return session?.token && session.expiresAt > Date.now() ? session : null
  } catch {
    return null
  }
}

let session = readStored('localStorage') || readStored('sessionStorage')
let unauthorizedHandler = () => {}

export function getSession() {
  return session
}

export function saveSession(next, remember) {
  session = next
  try {
    ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(next))
  } catch {
    // Storage blocked — the session still lasts until the page is reloaded.
  }
}

export function clearSession() {
  session = null
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Nothing to clear.
  }
}

// Called when the server rejects the token (expired, or the secret changed)
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

// --- Requests --------------------------------------------------------------
export async function request(path, options = {}) {
  const headers = new Headers(options.headers)
  if (session) headers.set('Authorization', `Bearer ${session.token}`)

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error(`Can't reach the server at ${API_URL}. Is the backend running?`)
  }

  const data = await response.json().catch(() => ({}))
  if (response.status === 401 && session) {
    clearSession()
    unauthorizedHandler()
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`)
  }
  return data
}

export function sendJson(path, method, body) {
  return request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// { status: 'pending', search: '' } -> "?status=pending" (empty values dropped)
export function toQuery(params = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== null && value !== undefined) search.set(key, value)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}
