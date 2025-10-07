import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
// import { useToast } from '../components/Toast';
// import { useApiError } from '../hooks/useApiError';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Eye,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  totalEarnings: number;
  monthlyEarnings: number;
  totalSales: number;
  monthlySales: number;
  totalSolutions: number;
  activeSolutions: number;
  averageRating: number;
  totalViews: number;
  conversionRate: number;
  topSolutions: Array<{
    solutionId: string;
    name: string;
    sales: number;
    revenue: number;
    views: number;
    rating: number;
  }>;
  monthlyData: Array<{
    month: string;
    earnings: number;
    sales: number;
    views: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    sales: number;
    revenue: number;
    percentage: number;
  }>;
}

const PartnerAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalSales: 0,
    monthlySales: 0,
    totalSolutions: 0,
    activeSolutions: 0,
    averageRating: 0,
    totalViews: 0,
    conversionRate: 0,
    topSolutions: [],
    monthlyData: [],
    categoryBreakdown: []
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'solutions' | 'earnings' | 'performance'>('overview');

  useEffect(() => {
    if (user?.role === 'partner') {
      loadAnalyticsData();
    }
  }, [user, selectedPeriod]);

  const loadAnalyticsData = async () => {
    // Mock analytics data - in production, this would come from your analytics API
    const mockData: AnalyticsData = {
      totalEarnings: 125750,
      monthlyEarnings: 18500,
      totalSales: 342,
      monthlySales: 47,
      totalSolutions: 8,
      activeSolutions: 6,
      averageRating: 4.6,
      totalViews: 15420,
      conversionRate: 2.8,
      topSolutions: [
        {
          solutionId: 'sol-001',
          name: 'Project Management Pro',
          sales: 89,
          revenue: 44500,
          views: 3200,
          rating: 4.8
        },
        {
          solutionId: 'sol-002',
          name: 'Analytics Dashboard',
          sales: 67,
          revenue: 33500,
          views: 2800,
          rating: 4.5
        },
        {
          solutionId: 'sol-003',
          name: 'CRM Solution',
          sales: 54,
          revenue: 27000,
          views: 2100,
          rating: 4.3
        }
      ],
      monthlyData: [
        { month: 'Jan', earnings: 12500, sales: 25, views: 1200 },
        { month: 'Feb', earnings: 15200, sales: 32, views: 1450 },
        { month: 'Mar', earnings: 18500, sales: 47, views: 1680 },
        { month: 'Apr', earnings: 16800, sales: 38, views: 1520 },
        { month: 'May', earnings: 21200, sales: 52, views: 1890 },
        { month: 'Jun', earnings: 19500, sales: 45, views: 1750 }
      ],
      categoryBreakdown: [
        { category: 'Business Software', sales: 156, revenue: 78000, percentage: 45.6 },
        { category: 'Development Tools', sales: 98, revenue: 29400, percentage: 28.7 },
        { category: 'Analytics & Data', sales: 88, revenue: 18200, percentage: 25.7 }
      ]
    };

    setAnalyticsData(mockData);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthIndicator = (current: number, previous: number) => {
    const growth = ((current - previous) / previous) * 100;
    const isPositive = growth > 0;
    
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUpRight className="h-4 w-4 mr-1" />
        ) : (
          <ArrowDownRight className="h-4 w-4 mr-1" />
        )}
        <span className="text-sm font-medium">{Math.abs(growth).toFixed(1)}%</span>
      </div>
    );
  };

  if (user?.role !== 'partner') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to partners.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-gray-600 mt-2">Track your solution performance and earnings</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button
              onClick={loadAnalyticsData}
              className="btn-outline flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.totalEarnings)}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            {getGrowthIndicator(analyticsData.monthlyEarnings, 15200)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalSales}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            {getGrowthIndicator(analyticsData.monthlySales, 38)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Solutions</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.activeSolutions}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">of {analyticsData.totalSolutions} total</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.averageRating}</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-600">Conversion: {formatPercentage(analyticsData.conversionRate)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('solutions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'solutions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Solution Performance
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'earnings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Earnings Report
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Performance Insights
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trends */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
            <div className="space-y-4">
              {analyticsData.monthlyData.slice(-6).map((data, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{data.month}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">{formatCurrency(data.earnings)}</span>
                    <span className="text-xs text-gray-500">{data.sales} sales</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
            <div className="space-y-4">
              {analyticsData.categoryBreakdown.map((category, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">{category.category}</span>
                    <span className="text-sm font-medium">{formatCurrency(category.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{category.sales} sales</span>
                    <span className="text-xs text-gray-500">{formatPercentage(category.percentage)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'solutions' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Solutions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solution
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.topSolutions.map((solution) => (
                    <tr key={solution.solutionId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{solution.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solution.sales}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(solution.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solution.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-sm text-gray-900">{solution.rating}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage((solution.sales / solution.views) * 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'earnings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Breakdown</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Gross Revenue</span>
                <span className="text-lg font-semibold">{formatCurrency(analyticsData.totalEarnings + 25000)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <span className="text-gray-600">Platform Commission (15%)</span>
                <span className="text-lg font-semibold text-red-600">-{formatCurrency(25000)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <span className="text-gray-600">Net Earnings</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(analyticsData.totalEarnings)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Schedule</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Next Payout</span>
                <span className="text-sm font-medium">Dec 1, 2024</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Amount</span>
                <span className="text-sm font-medium">{formatCurrency(analyticsData.monthlyEarnings)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className="text-sm font-medium text-green-600">Pending</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Strong Growth</span>
                </div>
                <p className="text-sm text-blue-800">
                  Your monthly sales increased by 23% compared to last month. Keep up the great work!
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Eye className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-900">Optimization Opportunity</span>
                </div>
                <p className="text-sm text-yellow-800">
                  Your conversion rate is below average. Consider updating your solution descriptions.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Star className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">Excellent Rating</span>
                </div>
                <p className="text-sm text-green-800">
                  Your average rating of 4.6 is above the platform average. Great customer satisfaction!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Optimize pricing strategy</p>
                  <p className="text-xs text-gray-600">Consider A/B testing different price points</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Expand to new categories</p>
                  <p className="text-xs text-gray-600">Analytics & Data category shows high demand</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Improve solution visibility</p>
                  <p className="text-xs text-gray-600">Add more keywords and better descriptions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerAnalyticsPage;