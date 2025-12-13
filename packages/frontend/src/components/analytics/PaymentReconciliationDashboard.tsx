import { useState, useEffect } from 'react'
import { CreditCard, AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw, Download, Filter } from 'lucide-react'
import { authService } from '../../services/auth'
import { fetchAuthSession } from 'aws-amplify/auth'

interface ReconciliationReport {
  summary: {
    total_transactions: number
    by_status: Record<string, number>
    by_solution: Record<string, number>
    by_tier: Record<string, number>
    by_user_type: Record<string, number>
    by_payment_mode: Record<string, number>
    by_country: Record<string, number>
    amounts: {
      total_amount: number
      completed_amount: number
      failed_amount: number
      refunded_amount: number
      pending_amount: number
    }
  }
  transactions: Array<{
    transaction_id: string
    user_email: string
    user_name: string
    user_tier: string
    solution_name: string
    amount: number
    marketplace_status: string
    phonepe_status: string
    payment_mode: string
    country: string
    created_at: string
    error_code?: string
    settlement_status: string
    settlement_date?: string
  }>
  discrepancies: Array<{
    transaction_id: string
    user_email: string
    solution: string
    tier: string
    marketplace_status: string
    phonepe_status: string
    amount: number
  }>
}

export function PaymentReconciliationDashboard() {
  const [report, setReport] = useState<ReconciliationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    solution: 'all',
    tier: 'all',
    country: 'all'
  })

  const generateReport = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`${(import.meta as any).env.VITE_API_URL.replace(/\/$/, "")}/api/payments/reconciliation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'generate_report',
          startDate: `${filters.startDate}T00:00:00.000Z`,
          endDate: `${filters.endDate}T23:59:59.999Z`,
          filters: {
            solution: filters.solution !== 'all' ? filters.solution : undefined,
            tier: filters.tier !== 'all' ? filters.tier : undefined,
            country: filters.country !== 'all' ? filters.country : undefined
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setReport(data.report)
      } else {
        setError('Failed to generate reconciliation report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const getAuthToken = async () => {
    let token = authService.getToken()
    if (!token) {
      try {
        const session = await fetchAuthSession()
        token = session.tokens?.idToken?.toString() || null
        if (token) authService.setToken(token)
      } catch (error) {
        console.error('Failed to get session token:', error)
      }
    }
    return token
  }

  const exportToCSV = () => {
    if (!report) return

    const csvData = [
      ['Transaction ID', 'User Email', 'User Name', 'Tier', 'Solution', 'Amount', 'Marketplace Status', 'PhonePe Status', 'Payment Mode', 'Country', 'Created At', 'Settlement Status', 'Settlement Date'],
      ...report.transactions.map(t => [
        t.transaction_id,
        t.user_email,
        t.user_name,
        t.user_tier,
        t.solution_name,
        t.amount,
        t.marketplace_status,
        t.phonepe_status,
        t.payment_mode || '',
        t.country,
        t.created_at,
        t.settlement_status,
        t.settlement_date || ''
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-reconciliation-${filters.startDate}-to-${filters.endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount / 100) // Convert paisa to rupees
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-600" />
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    generateReport()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Payment Reconciliation</h1>
        <div className="flex space-x-3">
          <button
            onClick={exportToCSV}
            disabled={!report}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={generateReport}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Report Filters
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solution</label>
            <select
              value={filters.solution}
              onChange={(e) => setFilters(prev => ({ ...prev, solution: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Solutions</option>
              <option value="faiss">FAISS Search</option>
              <option value="marketplace">Marketplace</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Tier</label>
            <select
              value={filters.tier}
              onChange={(e) => setFilters(prev => ({ ...prev, tier: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="registered">Registered</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select
              value={filters.country}
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Countries</option>
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.total_transactions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.by_status.completed || 0}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(report.summary.amounts.completed_amount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.by_status.failed || 0}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(report.summary.amounts.failed_amount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Discrepancies</p>
                  <p className="text-2xl font-bold text-gray-900">{report.discrepancies.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">By Solution</h3>
              <div className="space-y-3">
                {Object.entries(report.summary.by_solution).map(([solution, count]) => (
                  <div key={solution} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{solution === 'faiss' ? 'FAISS Search' : solution}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">By User Tier</h3>
              <div className="space-y-3">
                {Object.entries(report.summary.by_tier).map(([tier, count]) => (
                  <div key={tier} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{tier}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">By Payment Mode</h3>
              <div className="space-y-3">
                {Object.entries(report.summary.by_payment_mode).map(([mode, count]) => (
                  <div key={mode} className="flex justify-between">
                    <span className="text-gray-600">{mode}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Discrepancies Alert */}
          {report.discrepancies.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Status Discrepancies Found ({report.discrepancies.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Transaction ID</th>
                      <th className="text-left py-2">User</th>
                      <th className="text-left py-2">Solution</th>
                      <th className="text-left py-2">Marketplace Status</th>
                      <th className="text-left py-2">PhonePe Status</th>
                      <th className="text-left py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.discrepancies.slice(0, 5).map((discrepancy) => (
                      <tr key={discrepancy.transaction_id} className="border-b">
                        <td className="py-2 text-sm font-mono">{discrepancy.transaction_id.slice(-8)}</td>
                        <td className="py-2 text-sm">{discrepancy.user_email}</td>
                        <td className="py-2 text-sm">{discrepancy.solution}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(discrepancy.marketplace_status)}`}>
                            {discrepancy.marketplace_status}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(discrepancy.phonepe_status)}`}>
                            {discrepancy.phonepe_status}
                          </span>
                        </td>
                        <td className="py-2 text-sm">{formatCurrency(discrepancy.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solution</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.transactions.slice(0, 50).map((transaction) => (
                    <tr key={transaction.transaction_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono">{transaction.transaction_id.slice(-8)}</div>
                        <div className="text-xs text-gray-500">{new Date(transaction.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{transaction.user_name}</div>
                        <div className="text-xs text-gray-500">{transaction.user_email}</div>
                        <div className="text-xs text-blue-600">{transaction.user_tier}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{transaction.solution_name}</div>
                        <div className="text-xs text-gray-500">{transaction.country}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(transaction.phonepe_status)}
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(transaction.phonepe_status)}`}>
                            {transaction.phonepe_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.payment_mode || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{transaction.settlement_status}</div>
                        {transaction.settlement_date && (
                          <div className="text-xs text-gray-500">{transaction.settlement_date}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
