import { useState, useEffect } from 'react'
import { Users, Package, CheckCircle, XCircle } from 'lucide-react'
import { authService } from '../services/auth'
import { fetchAuthSession } from 'aws-amplify/auth'

export function AdminDashboard() {
  const [pendingApplications, setPendingApplications] = useState([])
  const [pendingSolutions, setPendingSolutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingApplications, setProcessingApplications] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      let token = authService.getToken()
      
      if (!token) {
        try {
          const session = await fetchAuthSession()
          token = session.tokens?.accessToken?.toString() || null  // Use access token for admin too
          if (token) {
            authService.setToken(token)
          }
        } catch (error) {
          console.error('Failed to get session token:', error)
        }
      }
      
      if (!token) {
        console.error('No auth token found')
        return
      }
      
      console.log('Loading admin data with token:', token ? 'present' : 'missing')
      
      // Load pending partner applications and solutions
      const [applicationsRes, solutionsRes] = await Promise.all([
        fetch(`${(import.meta as any).env.VITE_API_URL}/admin/applications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${(import.meta as any).env.VITE_API_URL}/admin/solutions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      console.log('Applications response:', applicationsRes.status)
      console.log('Solutions response:', solutionsRes.status)

      if (applicationsRes.ok) {
        const applications = await applicationsRes.json()
        console.log('Applications data:', applications)
        setPendingApplications(applications.applications || [])
      } else {
        console.error('Failed to load applications:', applicationsRes.status, await applicationsRes.text())
      }

      if (solutionsRes.ok) {
        const solutions = await solutionsRes.json()
        console.log('Solutions data:', solutions)
        setPendingSolutions(solutions.solutions || [])
      } else {
        console.error('Failed to load solutions:', solutionsRes.status, await solutionsRes.text())
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      // Add to processing set
      setProcessingApplications(prev => new Set(prev).add(applicationId))
      
      let token = authService.getToken()
      if (!token) {
        try {
          const session = await fetchAuthSession()
          token = session.tokens?.accessToken?.toString() || null
          if (token) {
            authService.setToken(token)
          }
        } catch (error) {
          console.error('Failed to get session token:', error)
        }
      }
      
      if (!token) {
        console.error('No auth token found')
        return
      }
      
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL}/admin/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        // Remove from pending applications list
        setPendingApplications(prev => prev.filter((app: any) => app.applicationId !== applicationId))
        alert(`Application ${action}d successfully!`)
      } else {
        console.error('Failed to update application:', response.status, await response.text())
        alert(`Failed to ${action} application. Please try again.`)
      }
    } catch (error) {
      console.error('Failed to update application:', error)
      alert(`Failed to ${action} application. Please try again.`)
    } finally {
      // Remove from processing set
      setProcessingApplications(prev => {
        const newSet = new Set(prev)
        newSet.delete(applicationId)
        return newSet
      })
    }
  }

  const handleSolutionAction = async (solutionId: string, action: 'approve' | 'reject') => {
    try {
      let token = authService.getToken()
      if (!token) {
        try {
          const session = await fetchAuthSession()
          token = session.tokens?.accessToken?.toString() || null
          if (token) {
            authService.setToken(token)
          }
        } catch (error) {
          console.error('Failed to get session token:', error)
        }
      }
      
      if (!token) {
        console.error('No auth token found')
        return
      }
      
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL}/admin/solutions/${solutionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        loadAdminData()
      } else {
        console.error('Failed to update solution:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Failed to update solution:', error)
    }
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Pending Partner Applications */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <Users className="h-6 w-6 mr-2" />
          Pending Partner Applications ({pendingApplications.length})
        </h2>
        
        {pendingApplications.length === 0 ? (
          <p className="text-gray-600">No pending applications</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingApplications.map((app: any) => (
                  <tr key={app.applicationId}>
                    <td className="px-6 py-4 whitespace-nowrap">{app.companyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{app.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApplicationAction(app.applicationId, 'approve')}
                          disabled={processingApplications.has(app.applicationId)}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                        >
                          {processingApplications.has(app.applicationId) ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleApplicationAction(app.applicationId, 'reject')}
                          disabled={processingApplications.has(app.applicationId)}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                        >
                          {processingApplications.has(app.applicationId) ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Solutions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <Package className="h-6 w-6 mr-2" />
          Pending Solutions ({pendingSolutions.length})
        </h2>
        
        {pendingSolutions.length === 0 ? (
          <p className="text-gray-600">No pending solutions</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingSolutions.map((solution: any) => (
                  <tr key={solution.solutionId}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{solution.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{solution.partnerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{solution.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">${solution.pricing?.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSolutionAction(solution.solutionId, 'approve')}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleSolutionAction(solution.solutionId, 'reject')}
                        className="text-red-600 hover:text-red-900"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
