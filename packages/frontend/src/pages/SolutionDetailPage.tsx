import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserDebug } from '../components/UserDebug'
import { BackgroundImage } from '../components/BackgroundImage'
import { CustomPopup, usePopup } from '../components/CustomPopup'
import { generateSolutionUrl } from '../utils/solutionUrls'

export function SolutionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { popup, showPopup, closePopup } = usePopup()
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [solutionToken, setSolutionToken] = useState<string | null>(null)

  // Mock solution data - replace with actual API call
  const solution = {
    id,
    name: 'AWS Solution Finder',
    description: 'AI-powered search engine for AWS repositories with FAISS vector search and Bedrock integration.',
    price: 0, // Free tier available
    currency: 'INR',
    category: 'Developer Tools',
    vendor: 'CloudNetsle',
    features: [
      'Semantic search across 8,500+ AWS repositories',
      'FAISS vector search with embeddings',
      'Amazon Bedrock Nova Pro integration',
      'Real-time repository discovery',
      'Free tier: 10 searches/day',
      'Pro tier: Unlimited searches'
    ],
    solutionId: 'aws-solution-finder'
  }

  // Check if user has access to this solution
  useEffect(() => {
    const checkAccess = async () => {
      if (!isAuthenticated || !user) return

      try {
        // Check if user has a token for this solution
        const response = await fetch(`${import.meta.env.VITE_API_URL}api/validate-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: localStorage.getItem(`solution_token_${solution.solutionId}`),
            userId: user.email
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.valid) {
            setHasAccess(true)
            setSolutionToken(data.token)
          }
        }
      } catch (error) {
        console.error('Error checking solution access:', error)
      }
    }

    checkAccess()
  }, [isAuthenticated, user, solution.solutionId])

  const handleAccessSolution = () => {
    if (hasAccess && solutionToken && user) {
      const solutionUrl = generateSolutionUrl({
        solutionId: solution.solutionId,
        token: solutionToken,
        userEmail: user.email,
        tier: 'registered'
      })
      window.open(solutionUrl, '_blank')
    }
  }

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/solutions/${id}` } } })
      return
    }

    setIsProcessing(true)
    
    try {
      // Create payment order
      const response = await fetch(`${import.meta.env.VITE_API_URL}payments/initiate`, {
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
      showPopup('Payment initiation failed. Please try again.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen">
      <BackgroundImage />
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

            {/* Access/Purchase Buttons */}
            {isAuthenticated && hasAccess && (
              <button
                onClick={handleAccessSolution}
                className="w-full mt-6 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Access Solution</span>
              </button>
            )}

            {/* Purchase Button - Only for customers without access */}
            {isAuthenticated && user?.role === 'customer' && !hasAccess && solution.price > 0 && (
              <button
                onClick={handlePurchase}
                disabled={isProcessing}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Buy Now with PhonePe'}
              </button>
            )}

            {/* Free Registration Button */}
            {isAuthenticated && user?.role === 'customer' && !hasAccess && solution.price === 0 && (
              <button
                onClick={() => window.location.href = `https://marketplace.cloudnestle.com/register?solution_id=${solution.solutionId}`}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Get Free Access
              </button>
            )}

            {isAuthenticated && user?.role !== 'customer' && (
              <div className="w-full mt-6 bg-gray-100 text-gray-600 py-3 px-6 rounded-lg text-center">
                Access available for customers only
              </div>
            )}

            {!isAuthenticated && (
              <>
                <button
                  onClick={() => navigate('/login', { state: { from: { pathname: `/solutions/${id}` } } })}
                  className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Login to Access
                </button>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Please <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">login</button> as a customer to access
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      
      <CustomPopup
        message={popup.message}
        type={popup.type}
        isOpen={popup.isOpen}
        onClose={closePopup}
      />
      </div>
    </div>
  )
}