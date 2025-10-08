import { useState, useEffect } from 'react'
import { Users, Package, CheckCircle, XCircle, Clock } from 'lucide-react'

export function AdminDashboard() {
  const [pendingApplications, setPendingApplications] = useState([])
  const [pendingSolutions, setPendingSolutions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      // Load pending partner applications and solutions
      const [applications, solutions] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/admin/applications`).then(r => r.json()),
        fetch(`${import.meta.env.VITE_API_URL}/admin/solutions`).then(r => r.json())
      ])
      setPendingApplications(applications.applications || [])
      setPendingSolutions(solutions.solutions || [])
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/admin/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      loadAdminData()
    } catch (error) {
      console.error('Failed to update application:', error)
    }
  }

  const handleSolutionAction = async (solutionId: string, action: 'approve' | 'reject') => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/admin/solutions/${solutionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      loadAdminData()
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
                      <button
                        onClick={() => handleApplicationAction(app.applicationId, 'approve')}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleApplicationAction(app.applicationId, 'reject')}
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
