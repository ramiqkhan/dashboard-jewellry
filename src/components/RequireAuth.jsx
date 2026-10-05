import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

// Sends visitors who aren't logged in to /login, remembering where they were going.
export default function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
