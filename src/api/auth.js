// Client for the admin login API (backend/routes/authRoutes.js).
import { sendJson } from './client'

// -> { token, expiresAt, email }
export async function login(email, password) {
  const { token, expiresAt, email: adminEmail } = await sendJson('/auth/login', 'POST', { email, password })
  return { token, expiresAt, email: adminEmail }
}
