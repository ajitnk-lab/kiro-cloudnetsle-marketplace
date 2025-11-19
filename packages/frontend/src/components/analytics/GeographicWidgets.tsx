import { Globe, MapPin, TrendingUp, Users } from 'lucide-react'

interface GeographicData {
  sessions: {
    total: number
    byCountry: Record<string, number>
    byCity: Record<string, number>
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

interface GeographicWidgetsProps {
  data: GeographicData | null
  loading: boolean
  onCountryClick?: (country: string) => void
}

export function GeographicWidgets({ data, loading, onCountryClick }: GeographicWidgetsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getCountryName = (code: string) => {
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'IN': 'India',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'DE': 'Germany',
      'Unknown': 'Unknown Location'
    }
    return countryNames[code] || code
  }

  const getTopCountries = (countryData: Record<string, number>, limit = 5) => {
    return Object.entries(countryData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No geographic data available</p>
      </div>
    )
  }

  const topRevenueCountries = getTopCountries(data.revenue.byCountry)
  const topUserCountries = getTopCountries(data.users.byCountry)

  return (
    <div className="space-y-8">
      {/* Geographic Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Globe className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Countries</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(data.users.byCountry).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Top Country</p>
              <p className="text-lg font-bold text-gray-900">
                {topUserCountries[0] ? getCountryName(topUserCountries[0][0]) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.sessions.total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* World Map Placeholder & Country Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* World Map Widget */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Global Distribution
          </h3>
          <div className="relative h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Globe className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Interactive World Map</p>
              <p className="text-sm text-gray-500 mt-2">
                {data.users.total} users across {Object.keys(data.users.byCountry).length} countries
              </p>
            </div>
          </div>
        </div>

        {/* Revenue by Country */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Revenue by Country
          </h3>
          <div className="space-y-3">
            {topRevenueCountries.map(([country, revenue], index) => {
              const percentage = data.revenue.byCountry[country] 
                ? (data.revenue.byCountry[country] / Object.values(data.revenue.byCountry).reduce((a, b) => a + b, 0)) * 100
                : 0
              
              return (
                <button
                  key={country}
                  onClick={() => onCountryClick?.(country)}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-yellow-500' :
                      index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {getCountryName(country)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(revenue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage.toFixed(1)}% • Click to filter
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Users by Country & Geographic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Users by Country */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Users by Country
          </h3>
          <div className="space-y-3">
            {topUserCountries.map(([country, users], index) => {
              const percentage = (users / data.users.total) * 100
              
              return (
                <div key={country}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {getCountryName(country)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {users} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' :
                        index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Geographic Insights */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Geographic Insights
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">Market Concentration</span>
                <span className="text-lg font-bold text-blue-900">
                  {topUserCountries[0] ? 
                    `${((topUserCountries[0][1] / data.users.total) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Top country represents {topUserCountries[0] ? 
                  `${((topUserCountries[0][1] / data.users.total) * 100).toFixed(1)}%` 
                  : '0%'
                } of total users
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">Revenue per User</span>
                <span className="text-lg font-bold text-green-900">
                  {data.users.total > 0 ? 
                    formatCurrency(Object.values(data.revenue.byCountry).reduce((a, b) => a + b, 0) / data.users.total)
                    : '₹0'
                  }
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {data.users.total > 0 ? 
                  `₹${Object.values(data.revenue.byCountry).reduce((a, b) => a + b, 0).toLocaleString()} ÷ ${data.users.total} users = ₹${Math.round(Object.values(data.revenue.byCountry).reduce((a, b) => a + b, 0) / data.users.total)}`
                  : 'No revenue data available'
                }
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-purple-800">Market Diversity</span>
                <span className="text-lg font-bold text-purple-900">
                  {Object.keys(data.users.byCountry).length} countries
                </span>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Active user presence across markets
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
