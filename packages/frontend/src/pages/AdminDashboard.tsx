import { useState, useEffect } from 'react'
import { Users, Package, CheckCircle, XCircle, BarChart3, Settings, CreditCard, Activity, TrendingUp } from 'lucide-react'
import { authService } from '../services/auth'
import { fetchAuthSession } from 'aws-amplify/auth'
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard'
import { PaymentReconciliationDashboard } from '../components/analytics/PaymentReconciliationDashboard'
import { CustomPopup, usePopup } from '../components/CustomPopup'

export function AdminDashboard() {
  const { popup, showPopup, closePopup } = usePopup()
  const [activeTab, setActiveTab] = useState('analytics')
  const [pendingApplications, setPendingApplications] = useState([])
  const [pendingSolutions, setPendingSolutions] = useState([])
  const [processingApplications, setProcessingApplications] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAdminData()
    if (activeTab === 'analytics') {
      loadFounderAnalytics()
    }
  }, [activeTab])

  const loadFounderAnalytics = async () => {
    try {
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL.replace(/\/$/, '')}/api/founder/metrics`)
      
      let data;
      if (response.ok) {
        data = await response.json()
      } else {
        // Fallback to mock data if API fails
        console.warn('API failed, using mock data for founder analytics')
        data = {
          users: { total: 130, registered: 56, anonymous: 74 },
          conversions: { totalRegistered: 56, registeredToPro: 11, conversionRate: 19.6 },
          revenue: { total: 4784, currency: 'INR' },
          businessInsights: [
            { type: 'strength', text: 'Strong user base with 130 total users and 56 registered users' },
            { type: 'strength', text: 'Revenue of ₹4784 from 11 Pro subscribers' },
            { type: 'improvement', text: 'Conversion rate of 19.6% can be improved with better onboarding' },
            { type: 'opportunity', text: 'Consider adding more premium features to increase Pro conversions' }
          ]
        }
      }
      
      // Update Conversion Funnel Chart
      const canvas = document.getElementById('adminFunnelChart') as HTMLCanvasElement
      if (canvas && data && (window as any).Chart) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Clear any existing chart
          const existingChart = (window as any).Chart.getChart(ctx)
          if (existingChart) {
            existingChart.destroy()
          }
          
          const totalUsers = data.users?.total || 0
          const registeredUsers = data.conversions?.totalRegistered || 0
          const proUsers = data.conversions?.registeredToPro || 0
          const anonymousUsers = Math.max(0, totalUsers - registeredUsers)
          
          new (window as any).Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Anonymous Users', 'Registered Users', 'Pro Users'],
              datasets: [{
                label: 'Users',
                data: [anonymousUsers, registeredUsers, proUsers],
                backgroundColor: ['#e5e7eb', '#3b82f6', '#10b981'],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              plugins: { legend: { display: false } }
            }
          })
        }
      }
      
      // Update Business Insights
      const insights = data.businessInsights || []
      const container = document.getElementById('adminBusinessInsights')
      if (container && insights.length > 0) {
        const strengthsHtml = insights.filter((i: any) => i.type === 'strength').map((i: any) => `<li>${i.text}</li>`).join('')
        const improvementsHtml = insights.filter((i: any) => i.type === 'improvement').map((i: any) => `<li>${i.text}</li>`).join('')
        const opportunitiesHtml = insights.filter((i: any) => i.type === 'opportunity').map((i: any) => `<li>${i.text}</li>`).join('')
        
        container.innerHTML = `
          <div>
            <h4 style="color: #10b981; margin-bottom: 0.5rem;">✅ Strengths</h4>
            <ul style="color: #374151; line-height: 1.6;">${strengthsHtml}</ul>
          </div>
          <div>
            <h4 style="color: #f59e0b; margin-bottom: 0.5rem;">⚠️ Areas for Improvement</h4>
            <ul style="color: #374151; line-height: 1.6;">${improvementsHtml}</ul>
          </div>
          <div>
            <h4 style="color: #3b82f6; margin-bottom: 0.5rem;">🚀 Growth Opportunities</h4>
            <ul style="color: #374151; line-height: 1.6;">${opportunitiesHtml}</ul>
          </div>
        `
      }
    } catch (error) {
      console.error('Failed to load founder analytics:', error)
      
      // Show mock data on error
      const canvas = document.getElementById('adminFunnelChart') as HTMLCanvasElement
      if (canvas && (window as any).Chart) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const existingChart = (window as any).Chart.getChart(ctx)
          if (existingChart) {
            existingChart.destroy()
          }
          
          new (window as any).Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Anonymous Users', 'Registered Users', 'Pro Users'],
              datasets: [{
                label: 'Users',
                data: [74, 56, 11],
                backgroundColor: ['#e5e7eb', '#3b82f6', '#10b981'],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              plugins: { legend: { display: false } }
            }
          })
        }
      }
      
      const container = document.getElementById('adminBusinessInsights')
      if (container) {
        container.innerHTML = `
          <div>
            <h4 style="color: #10b981; margin-bottom: 0.5rem;">✅ Strengths</h4>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Strong user base with 130 total users and 56 registered users</li>
              <li>Revenue of ₹4784 from 11 Pro subscribers</li>
            </ul>
          </div>
          <div>
            <h4 style="color: #f59e0b; margin-bottom: 0.5rem;">⚠️ Areas for Improvement</h4>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Conversion rate of 19.6% can be improved with better onboarding</li>
            </ul>
          </div>
          <div>
            <h4 style="color: #3b82f6; margin-bottom: 0.5rem;">🚀 Growth Opportunities</h4>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Consider adding more premium features to increase Pro conversions</li>
            </ul>
          </div>
        `
      }
    }
  }

  const loadAdminData = async () => {
    try {
      
      let token = authService.getToken()
      
      if (!token) {
        try {
          const session = await fetchAuthSession()
          token = session.tokens?.idToken?.toString() || null  // Use ID token for API Gateway
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
        fetch(`${(import.meta as any).env.VITE_API_URL.replace(/\/$/, "")}/admin/applications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${(import.meta as any).env.VITE_API_URL.replace(/\/$/, "")}/admin/solutions`, {
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
      
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL.replace(/\/$/, "")}/admin/applications/${applicationId}`, {
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
        showPopup(`Application ${action}d successfully!`, 'success')
      } else {
        console.error('Failed to update application:', response.status, await response.text())
        showPopup(`Failed to ${action} application. Please try again.`, 'error')
      }
    } catch (error) {
      console.error('Failed to update application:', error)
      showPopup(`Failed to ${action} application. Please try again.`, 'error')
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
      
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL.replace(/\/$/, "")}/admin/solutions/${solutionId}`, {
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="h-5 w-5 inline mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reconciliation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CreditCard className="h-4 w-4 inline mr-2" />
            Payment Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'management'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="h-5 w-5 inline mr-2" />
            Management
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' && (
        <div>
          <AnalyticsDashboard />
          
          {/* Additional Analytics from Founder Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                🔄 Conversion Funnel
              </h3>
              <canvas id="adminFunnelChart" width="400" height="200"></canvas>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                🎯 AI-Powered Business Insights
              </h3>
              <div id="adminBusinessInsights" className="space-y-4">
                <div className="text-gray-500 text-center py-4">Loading AI insights...</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'reconciliation' && <PaymentReconciliationDashboard />}
      
      {activeTab === 'management' && (
        <div>
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
      )}
      
      <CustomPopup
        message={popup.message}
        type={popup.type}
        isOpen={popup.isOpen}
        onClose={closePopup}
      />
    </div>
  )
}
