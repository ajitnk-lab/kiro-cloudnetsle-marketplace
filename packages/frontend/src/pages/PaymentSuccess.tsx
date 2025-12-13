import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

export function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const transactionId = searchParams.get('transactionId')
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed'>('loading')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!transactionId) {
        setPaymentStatus('failed')
        return
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/payments/status/${transactionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        const data = await response.json()
        
        if (data.success && data.status === 'SUCCESS') {
          setPaymentStatus('success')
        } else {
          setPaymentStatus('failed')
        }
      } catch (error) {
        console.error('Payment verification error:', error)
        setPaymentStatus('failed')
      }
    }

    verifyPayment()
  }, [transactionId])

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying payment...</p>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your payment has been processed successfully. You now have access to your purchased solution.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">Transaction ID</p>
            <p className="font-mono text-sm text-gray-900">{transactionId}</p>
          </div>

          <div className="space-y-3">
            <Link
              to="/profile"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Purchases
            </Link>
            <Link
              to="/catalog"
              className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          We couldn't process your payment. Please try again or contact support if the issue persists.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <Link
            to="/catalog"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    </div>
  )
}
