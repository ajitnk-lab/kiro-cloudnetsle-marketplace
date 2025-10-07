// React import not needed in React 17+
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Star, 
  DollarSign, 
  Tag, 
  CheckCircle, 
  Users, 
  Download,
  Shield,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { catalogService } from '../services/catalog'
import { Solution } from '../types/solution'

export function SolutionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [solution, setSolution] = useState<Solution | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSolution = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)
        const data = await catalogService.getSolution(id)
        setSolution(data)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load solution')
      } finally {
        setLoading(false)
      }
    }

    loadSolution()
  }, [id])

  const formatPrice = (solution: Solution) => {
    const { pricing } = solution
    if (pricing.model === 'subscription') {
      return `₹${pricing.amount.toLocaleString()}/${pricing.billingCycle}`
    }
    return `₹${pricing.amount.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading solution...</span>
        </div>
      </div>
    )
  }

  if (error || !solution) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Solution Not Found</h3>
            <p className="text-gray-600 mb-4">{error || 'The requested solution could not be found.'}</p>
            <Link to="/catalog" className="btn-primary">
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link 
          to="/catalog" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalog
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Solution Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {solution.category}
              </span>
              <span className="text-sm text-gray-500">by {solution.partnerName}</span>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{solution.name}</h1>
            
            <p className="text-lg text-gray-600 mb-6">{solution.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {solution.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Solution Images */}
          {solution.assets.images.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Screenshots</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {solution.assets.images.map((image, index) => (
                  <div key={index} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image}
                      alt={`${solution.name} screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          {solution.features && solution.features.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {solution.features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Requirements */}
          {solution.requirements && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Requirements</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {typeof solution.requirements === 'object' && solution.requirements.system && (
                  <div>
                    <span className="font-medium text-gray-900">System: </span>
                    <span className="text-gray-700">{solution.requirements.system}</span>
                  </div>
                )}
                {typeof solution.requirements === 'object' && solution.requirements.storage && (
                  <div>
                    <span className="font-medium text-gray-900">Storage: </span>
                    <span className="text-gray-700">{solution.requirements.storage}</span>
                  </div>
                )}
                {typeof solution.requirements === 'object' && solution.requirements.users && (
                  <div>
                    <span className="font-medium text-gray-900">Users: </span>
                    <span className="text-gray-700">{solution.requirements.users}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            {/* Pricing Card */}
            <div className="card mb-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatPrice(solution)}
                </div>
                <div className="text-sm text-gray-600">
                  {solution.pricing.model === 'subscription' ? 'Monthly subscription' : 'One-time purchase'}
                </div>
              </div>

              <button 
                onClick={() => navigate(`/checkout/${solution.solutionId}`)}
                className="w-full btn-primary mb-4"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {solution.pricing.model === 'subscription' ? 'Start Subscription' : 'Purchase Now'}
              </button>

              <button className="w-full btn-outline">
                <Download className="h-4 w-4 mr-2" />
                Free Trial
              </button>
            </div>

            {/* Solution Info */}
            <div className="card mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Solution Information</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium text-gray-900">{solution.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Partner</span>
                  <span className="font-medium text-gray-900">{solution.partnerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="font-medium text-gray-900">
                    {new Date(solution.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-4">Trust & Security</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-sm text-gray-700">Verified Partner</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-500 mr-3" />
                  <span className="text-sm text-gray-700">24/7 Support</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-500 mr-3" />
                  <span className="text-sm text-gray-700">Money-back Guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}