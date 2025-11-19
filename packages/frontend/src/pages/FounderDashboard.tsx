import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export function FounderDashboard() {
  const { user } = useAuth()

  // Only allow admin users to access this dashboard
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div style={{ width: '100%', height: '100vh', border: 'none' }}>
      <iframe
        src="/marketplace-founder-dashboard.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        title="Founder Dashboard"
      />
    </div>
  )
}
