import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { partnerService } from '../services/partner'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, AlertCircle } from 'lucide-react'

export function AddSolution() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [partnerStatus, setPartnerStatus] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    pricing: {
      model: 'upfront',
      amount: '',
      currency: 'INR',
      billingCycle: 'month'
    },
    features: [''],
    requirements: {
      system: '',
      users: '',
      storage: ''
    },
    tags: ['']
  })

  useEffect(() => {
    checkPartnerStatus()
  }, [])

  const checkPartnerStatus = async () => {
    try {
      setCheckingStatus(true)
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${await (user as any)?.getIdToken()}`
        }
      })
      const data = await response.json()
      setPartnerStatus(data.user?.partnerStatus || null)
    } catch (error) {
      console.error('Failed to check partner status:', error)
      setError('Failed to verify partner status')
    } finally {
      setCheckingStatus(false)
    }
  }

  const categories = [
    'Business Software',
    'Developer Tools',
    'Analytics',
    'E-commerce',
    'Productivity',
    'Security',
    'Marketing',
    'Finance'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Clean up empty features and tags
      const cleanData = {
        ...formData,
        features: formData.features.filter(f => f.trim()),
        tags: formData.tags.filter(t => t.trim()),
        pricing: {
          ...formData.pricing,
          amount: parseInt(formData.pricing.amount)
        }
      }

      await partnerService.createSolution(cleanData)
      navigate('/partner/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }))
  }

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }))
  }

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, '']
    }))
  }

  const updateTag = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.map((t, i) => i === index ? value : t)
    }))
  }

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/partner/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Add New Solution</h1>
        <p className="text-gray-600 mt-2">Create a new software solution for the marketplace</p>
      </div>

      {checkingStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <p className="text-blue-600">Checking partner status...</p>
        </div>
      )}

      {!checkingStatus && partnerStatus !== 'approved' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h3 className="text-yellow-800 font-medium">Partner Approval Required</h3>
              <p className="text-yellow-700 mt-1">
                {partnerStatus === 'pending' 
                  ? 'Your partner application is pending admin approval. You cannot create solutions until approved.'
                  : partnerStatus === 'rejected'
                  ? 'Your partner application was rejected. Please contact support.'
                  : 'You must apply for partner status before creating solutions.'
                }
              </p>
              {!partnerStatus && (
                <button
                  onClick={() => navigate('/partner/application')}
                  className="mt-2 text-yellow-800 underline hover:text-yellow-900"
                >
                  Apply for Partner Status
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!checkingStatus && partnerStatus === 'approved' && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Solution Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter solution name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your solution..."
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing Model *
              </label>
              <select
                value={formData.pricing.model}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  pricing: { ...prev.pricing, model: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="upfront">One-time Payment</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (INR) *
              </label>
              <input
                type="number"
                required
                value={formData.pricing.amount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  pricing: { ...prev.pricing, amount: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            {formData.pricing.model === 'subscription' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Cycle
                </label>
                <select
                  value={formData.pricing.billingCycle}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    pricing: { ...prev.pricing, billingCycle: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
          
          {formData.features.map((feature, index) => (
            <div key={index} className="flex gap-2 mb-3">
              <input
                type="text"
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter feature"
              />
              {formData.features.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addFeature}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + Add Feature
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Requirements
              </label>
              <input
                type="text"
                value={formData.requirements.system}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  requirements: { ...prev.requirements, system: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Windows 10+, macOS 10.15+, or web browser"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Requirements
              </label>
              <input
                type="text"
                value={formData.requirements.users}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  requirements: { ...prev.requirements, users: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Up to 50 users included"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Storage Requirements
              </label>
              <input
                type="text"
                value={formData.requirements.storage}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  requirements: { ...prev.requirements, storage: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Cloud-based storage included"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
          
          {formData.tags.map((tag, index) => (
            <div key={index} className="flex gap-2 mb-3">
              <input
                type="text"
                value={tag}
                onChange={(e) => updateTag(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tag"
              />
              {formData.tags.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addTag}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + Add Tag
          </button>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/partner/dashboard')}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Solution'}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}
