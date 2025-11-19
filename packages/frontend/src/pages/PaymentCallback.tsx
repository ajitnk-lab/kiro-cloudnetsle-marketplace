import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'

interface PaymentStatus {
  status: 'success' | 'failed' | 'pending' | 'processing'
  message: string
  transactionId?: string
  merchantOrderId?: string
}

const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'processing',
    message: 'Processing your payment...'
  })

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const merchantOrderId = searchParams.get('merchantOrderId')
        
        if (!merchantOrderId) {
          setPaymentStatus({
            status: 'failed',
            message: 'Invalid payment callback - missing order ID'
          })
          return
        }

        // Check payment status with backend
        const response = await fetch(`${import.meta.env.VITE_API_URL}payments/status/${merchantOrderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        const data = await response.json()
        
        if (response.ok) {
          setPaymentStatus({
            status: data.status === 'COMPLETED' ? 'success' : 
                   data.status === 'FAILED' ? 'failed' : 'pending',
            message: data.message || 'Payment status updated',
            transactionId: data.transactionId,
            merchantOrderId: data.merchantOrderId
          })
        } else {
          setPaymentStatus({
            status: 'failed',
            message: data.message || 'Failed to verify payment status'
          })
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
        setPaymentStatus({
          status: 'failed',
          message: 'Unable to verify payment status. Please contact support.'
        })
      }
    }

    checkPaymentStatus()
  }, [searchParams])

  const getStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-500 mx-auto" />
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500 mx-auto" />
      default:
        return <Clock className="w-16 h-16 text-blue-500 mx-auto animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (paymentStatus.status) {
      case 'success': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'pending': return 'text-yellow-600'
      default: return 'text-blue-600'
    }
  }

  const getStatusTitle = () => {
    switch (paymentStatus.status) {
      case 'success': return '🎉 Payment Successful!'
      case 'failed': return '❌ Payment Failed'
      case 'pending': return '⏳ Payment Pending'
      default: return '🔄 Processing Payment...'
    }
  }

  const handleContinue = () => {
    if (paymentStatus.status === 'success') {
      // Redirect to AWS Solution Finder with Pro access
      window.location.href = 'https://awssolutionfinder.solutions.cloudnestle.com'
    } else if (paymentStatus.status === 'failed') {
      // Redirect back to upgrade page
      navigate('/solutions/61deb2fb-6e5e-4cda-ac5d-ff20202a8788')
    } else {
      // Redirect to profile page
      navigate('/profile')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {getStatusIcon()}
          <h2 className={`mt-6 text-3xl font-bold ${getStatusColor()}`}>
            {getStatusTitle()}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {paymentStatus.message}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {paymentStatus.transactionId && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Transaction ID:</span>
                <span className="text-sm text-gray-900">{paymentStatus.transactionId}</span>
              </div>
              {paymentStatus.merchantOrderId && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Order ID:</span>
                  <span className="text-sm text-gray-900">{paymentStatus.merchantOrderId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Amount:</span>
                <span className="text-sm text-gray-900">₹299</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Plan:</span>
                <span className="text-sm text-gray-900">AWS Solution Finder Pro</span>
              </div>
            </div>
          )}

          {paymentStatus.status === 'success' && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800">🚀 Pro Features Activated:</h3>
              <ul className="mt-2 text-sm text-green-700 space-y-1">
                <li>✅ Unlimited searches per day</li>
                <li>✅ Access to all AWS repositories</li>
                <li>✅ Saved searches and collections</li>
                <li>✅ Priority support</li>
                <li>✅ Export functionality</li>
              </ul>
            </div>
          )}

          {paymentStatus.status === 'failed' && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <h3 className="text-sm font-medium text-red-800">💡 What you can do:</h3>
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                <li>• Try a different payment method</li>
                <li>• Check your bank account balance</li>
                <li>• Contact your bank if payment was debited</li>
                <li>• Reach out to our support team</li>
              </ul>
            </div>
          )}

          <button
            onClick={handleContinue}
            className="mt-6 w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {paymentStatus.status === 'success' ? (
              <>
                Start Using Pro Features
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            ) : paymentStatus.status === 'failed' ? (
              'Try Again'
            ) : (
              'Continue'
            )}
          </button>

          {paymentStatus.status === 'processing' && (
            <p className="mt-4 text-xs text-gray-500 text-center">
              This may take a few moments. Please don't refresh the page.
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? <a href="mailto:support@cloudnestle.com" className="text-blue-600 hover:text-blue-500">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentCallback
