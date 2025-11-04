import { useAuth } from '../contexts/AuthContext'

export function UserDebug() {
  const { user, isAuthenticated } = useAuth()
  
  if (!isAuthenticated || !user) {
    return <div className="p-4 bg-red-100 text-red-800">Not authenticated</div>
  }

  return (
    <div className="p-4 bg-blue-100 text-blue-800 text-sm">
      <h3 className="font-bold">Debug Info:</h3>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <p>User ID: {user.userId}</p>
      <p>Name: {user.profile?.name}</p>
    </div>
  )
}
