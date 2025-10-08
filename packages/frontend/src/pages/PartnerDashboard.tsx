import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { partnerService } from '../services/partner'
import { Plus, Package, TrendingUp, DollarSign, BarChart3 } from 'lucide-react'

export function PartnerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [solutions, setSolutions] = useState([])
  const [stats, setStats] = useState({
    totalSolutions: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingApprovals: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Debug user role
  console.log('Partner Dashboard - User:', user)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [solutionsData] = await Promise.all([
        partnerService.getSolutions()
      ])
      
      setSolutions(solutionsData.solutions || [])
      setStats({
        totalSolutions: solutionsData.solutions?.length || 0,
        totalSales: solutionsData.totalSales || 0,
        totalRevenue: solutionsData.totalRevenue || 0,
        pendingApprovals: solutionsData.solutions?.filter((s: any) => s.status === 'pending').length || 0
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSolution = () => {
    navigate('/partner/solutions/add')
  }

  const handleViewAnalytics = () => {
    navigate('/partner/analytics')
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your solutions and track performance</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button onClick={handleAddSolution} className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Solution</span>
        </button>
        <button onClick={handleViewAnalytics} className="btn-outline flex items-center space-x-2">
          <BarChart3 className="h-4 w-4" />
          <span>View Analytics</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Solutions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSolutions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Solutions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Solutions</h2>
            <button onClick={handleAddSolution} className="btn-primary flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Solution</span>
            </button>
          </div>

          {solutions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No solutions yet</h3>
              <p className="text-gray-500 mb-6">
                Start by adding your first solution to the marketplace!
              </p>
              <button onClick={handleAddSolution} className="btn-primary flex items-center space-x-2 mx-auto">
                <Plus className="h-4 w-4" />
                <span>Add Your First Solution</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {solutions.map((solution: any) => (
                <div key={solution.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{solution.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{solution.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-500">Price: ₹{solution.price}</span>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          solution.status === 'approved' ? 'bg-green-100 text-green-800' :
                          solution.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {solution.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
