import { useEffect, useState } from 'react'
import * as authApi from '../api/auth'
import { clearSession, getSession, onUnauthorized, saveSession } from '../api/client'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession)
  const [expiredMessage, setExpiredMessage] = useState('')

  // If any request comes back 401, the token is no longer valid — send the user to the login page.
  useEffect(() => {
    onUnauthorized(() => {
      setSession(null)
      setExpiredMessage('Your session has expired. Please log in again.')
    })
  }, [])

  async function login(email, password, remember) {
    const next = await authApi.login(email, password)
    saveSession(next, remember)
    setExpiredMessage('')
    setSession(next)
  }

  function logout() {
    clearSession()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user: session ? { email: session.email } : null, login, logout, expiredMessage }}>
      {children}
    </AuthContext.Provider>
  )
}
