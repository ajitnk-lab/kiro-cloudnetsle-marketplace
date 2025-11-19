import { useState, useEffect } from 'react'
import { TrendingUp, Users, DollarSign, Globe, Activity, Download } from 'lucide-react'
import { authService } from '../../services/auth'
import { fetchAuthSession } from 'aws-amplify/auth'
import { GeographicWidgets } from './GeographicWidgets'

interface BusinessMetrics {
  revenue: {
    total: number
    totalINR: string
    calculation: {
      completedTransactions: number
      pricePerUpgrade: number
      formula: string
      breakdown: string
    }
    transactions: number
    byCountry: Record<string, number>
  }
  users: {
    total: number
    calculation: {
      anonymousUsers: number
      registeredUsers: number
      proUsers: number
      breakdown: string
    }
    byRole: Record<string, number>
    byCountry: Record<string, number>
  }
  conversions: {
    rate: number
    calculation: {
      formula: string
      breakdown: string
    }
    registeredToPro: number
    totalRegistered: number
  }
}

interface GeographicData {
  sessions: {
    total: number
    byCountry: Record<string, number>
    byCity: Record<string, number>
    byTimezone: Record<string, number>
    byDevice: Record<string, number>
  }
  revenue: {
    byCountry: Record<string, number>
    transactionsByCountry: Record<string, number>
  }
  users: {
    total: number
    byCountry: Record<string, number>
    byRole: Record<string, number>
  }
}

interface UsageData {
  usage: {
    totalUsers: number
    userCalculation?: {
      uniqueUsers: number
      totalEntitlements: number
      breakdown: string
      formula: string
    }
    tierDistribution: Record<string, number>
    usageByCountry: Record<string, number>
    avgUsagePerUser: number
    totalSearches: number
    searchCalculation?: {
      totalUsers: number
      totalSearches: number
      breakdown: string
      formula: string
    }
  }
  sessions: {
    total: number
    deviceUsage: Record<string, number>
    browserUsage: Record<string, number>
    countryActivity: Record<string, number>
    hourlyActivity: Record<string, number>
  }
  performance: {
    totalRequests: number
    avgResponseTime: number
    statusCodes: Record<string, number>
    endpointUsage: Record<string, number>
  }
}

export function AnalyticsDashboard() {
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [geographicData, setGeographicData] = useState<GeographicData | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Export functionality
  const exportToCSV = () => {
    if (!businessMetrics || !usageData) return

    const csvData = [
      ['Metric', 'Value'],
      ['Total Revenue', businessMetrics.revenue.totalINR],
      ['Revenue Calculation', businessMetrics.revenue.calculation.formula],
      ['Total Users', businessMetrics.users.total],
      ['User Breakdown', businessMetrics.users.calculation.breakdown],
      ['Total Searches', usageData.usage.totalSearches],
      ['Search Calculation', usageData.usage.searchCalculation?.formula || 'Sum of all user usage'],
      ['Conversion Rate', `${businessMetrics.conversions.rate}%`],
      ['Conversion Calculation', businessMetrics.conversions.calculation.formula],
      ['Active FAISS Users', usageData.usage.totalUsers]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const getAuthToken = async () => {
    let token = authService.getToken()
    
    if (!token) {
      try {
        const session = await fetchAuthSession()
        token = session.tokens?.idToken?.toString() || null
        if (token) {
          authService.setToken(token)
        }
      } catch (error) {
        console.error('Failed to get session token:', error)
      }
    }
    
    return token
  }

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getAuthToken()
      if (!token) {
        setError('Authentication required')
        return
      }

      const headers = { 'Authorization': `Bearer ${token}` }
      const baseUrl = (import.meta as any).env.VITE_API_URL

      // Load all analytics data in parallel
      const [businessRes, geographicRes, usageRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/business-metrics`, { headers }),
        fetch(`${baseUrl}/api/analytics/geographic`, { headers }),
        fetch(`${baseUrl}/api/analytics/usage`, { headers })
      ])

      if (businessRes.ok) {
        const data = await businessRes.json()
        setBusinessMetrics(data)
      } else {
        console.error('Failed to load business metrics:', businessRes.status)
      }

      if (geographicRes.ok) {
        const data = await geographicRes.json()
        setGeographicData(data)
      } else {
        console.error('Failed to load geographic data:', geographicRes.status)
      }

      if (usageRes.ok) {
        const data = await usageRes.json()
        setUsageData(data)
      } else {
        console.error('Failed to load usage data:', usageRes.status)
      }

    } catch (error) {
      console.error('Failed to load analytics data:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={loadAnalyticsData}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex space-x-3">
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={loadAnalyticsData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Presets */}
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {businessMetrics ? businessMetrics.revenue.totalINR : '₹0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {businessMetrics ? businessMetrics.revenue.calculation.breakdown : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {businessMetrics ? businessMetrics.users.total.toLocaleString() : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {businessMetrics ? businessMetrics.users.calculation.breakdown : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {businessMetrics ? formatPercentage(businessMetrics.conversions.rate) : '0%'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {businessMetrics ? businessMetrics.conversions.calculation.breakdown : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Searches</p>
              <p className="text-2xl font-bold text-gray-900">
                {usageData ? usageData.usage.totalSearches.toLocaleString() : '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {usageData ? usageData.usage.searchCalculation?.breakdown || 'Across all users' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Geographic Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Revenue by Country
          </h3>
          <div className="space-y-3">
            {businessMetrics && Object.entries(businessMetrics.revenue.byCountry).map(([country, revenue]) => (
              <div key={country} className="flex justify-between items-center">
                <span className="text-gray-600">{country}</span>
                <span className="font-semibold">{formatCurrency(revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Users by Role
          </h3>
          <div className="space-y-3">
            {businessMetrics && Object.entries(businessMetrics.users.byRole).map(([role, count]) => (
              <div key={role} className="flex justify-between items-center">
                <span className="text-gray-600 capitalize">{role}</span>
                <span className="font-semibold">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Analytics */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Usage Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-xl font-bold">{usageData ? usageData.usage.totalUsers.toLocaleString() : '0'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {usageData ? usageData.usage.userCalculation?.breakdown || 'Users with solution entitlements' : ''}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Usage per User</p>
            <p className="text-xl font-bold">{usageData ? usageData.usage.avgUsagePerUser.toFixed(1) : '0'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total API Requests</p>
            <p className="text-xl font-bold">{usageData ? usageData.performance.totalRequests.toLocaleString() : '0'}</p>
          </div>
        </div>
      </div>

      {/* Geographic Dashboard Widgets */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Globe className="h-6 w-6 mr-2" />
          Geographic Analytics
        </h2>
        <GeographicWidgets 
          data={geographicData} 
          loading={loading} 
        />
      </div>
    </div>
  )
}
