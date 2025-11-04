import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserDebug } from '../components/UserDebug'

export function SolutionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)

  // Mock solution data - replace with actual API call
  const solution = {
    id,
    name: 'Advanced Analytics Dashboard',
    description: 'Comprehensive analytics solution with real-time reporting and data visualization.',
    price: 2999,
    currency: 'INR',
    category: 'Analytics',
    vendor: 'TechCorp Solutions',
    features: [
      'Real-time data processing',
      'Interactive dashboards',
      'Custom reporting',
      '24/7 support'
    ]
  }

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/solutions/${id}` } } })
      return
    }

    setIsProcessing(true)
    
    try {
      // Create payment order
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          solutionId: id,
          amount: solution.price,
          currency: solution.currency,
          userId: user?.userId,
          userEmail: user?.email,
          userName: user?.profile.name
        })
      })

      const data = await response.json()
      
      if (data.success && data.redirectUrl) {
        // Redirect to PhonePe payment page
        window.location.href = data.redirectUrl
      } else {
        throw new Error(data.message || 'Payment initiation failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment initiation failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <UserDebug />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Solution Image */}
        <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-500">Solution Preview</span>
        </div>

        {/* Solution Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{solution.name}</h1>
            <p className="text-lg text-gray-600 mt-2">by {solution.vendor}</p>
            <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full mt-2">
              {solution.category}
            </span>
          </div>

          <p className="text-gray-700">{solution.description}</p>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Features</h3>
            <ul className="space-y-2">
              {solution.features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold text-gray-900">
                  ₹{solution.price.toLocaleString()}
                </span>
                <span className="text-gray-600 ml-2">one-time purchase</span>
              </div>
            </div>

            {/* Purchase Button - Only for customers */}
            {isAuthenticated && user?.role === 'customer' && (
              <button
                onClick={handlePurchase}
                disabled={isProcessing}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Buy Now with PhonePe'}
              </button>
            )}

            {isAuthenticated && user?.role !== 'customer' && (
              <div className="w-full mt-6 bg-gray-100 text-gray-600 py-3 px-6 rounded-lg text-center">
                Purchase available for customers only
              </div>
            )}

            {!isAuthenticated && (
              <>
                <button
                  onClick={() => navigate('/login', { state: { from: { pathname: `/solutions/${id}` } } })}
                  className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Login to Purchase
                </button>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Please <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">login</button> as a customer to purchase
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}