import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, Transaction } from '../services/payment';
import { CheckCircle, XCircle, Loader2, Download, ArrowRight } from 'lucide-react';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    handlePaymentCallback();
  }, [isAuthenticated, navigate]);

  const handlePaymentCallback = async () => {
    try {
      setLoading(true);
      
      // Get payment details from URL parameters
      const paymentId = searchParams.get('payment_id');
      const paymentRequestId = searchParams.get('payment_request_id');
      const paymentStatus = searchParams.get('payment_status');

      console.log('Payment callback params:', { paymentId, paymentRequestId, paymentStatus });

      // Handle payment success callback
      const transactionData = await paymentService.handlePaymentSuccess(paymentId || undefined, paymentRequestId || undefined);
      
      if (transactionData) {
        setTransaction(transactionData);
      } else {
        setError('Unable to verify payment status. Please check your dashboard for transaction details.');
      }

    } catch (error) {
      console.error('Payment verification failed:', error);
      setError(error instanceof Error ? error.message : 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h2>
          <p className="text-gray-600">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">No transaction data available</div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isSuccess = transaction.status === 'completed';
  const isPending = transaction.status === 'pending';
  const isFailed = transaction.status === 'failed';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {isSuccess && (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            )}
            {isPending && (
              <Loader2 className="h-16 w-16 text-yellow-500 mx-auto animate-spin" />
            )}
            {isFailed && (
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            )}
          </div>

          {/* Status Message */}
          <div className="mb-8">
            {isSuccess && (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
                <p className="text-gray-600">
                  Thank you for your purchase. You now have access to your solution.
                </p>
              </>
            )}
            {isPending && (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Processing</h1>
                <p className="text-gray-600">
                  Your payment is being processed. This may take a few minutes.
                </p>
              </>
            )}
            {isFailed && (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
                <p className="text-gray-600">
                  Unfortunately, your payment could not be processed. Please try again.
                </p>
              </>
            )}
          </div>

          {/* Transaction Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Solution:</span>
                <span className="font-medium">{transaction.solutionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">₹{transaction.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono text-sm">{transaction.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium capitalize ${
                  isSuccess ? 'text-green-600' : 
                  isPending ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {transaction.status}
                </span>
              </div>
              {transaction.paymentId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-mono text-sm">{transaction.paymentId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {isSuccess && (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Access Your Solution
                </button>
                <button
                  onClick={() => navigate('/catalog')}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center"
                >
                  Continue Shopping
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </>
            )}

            {isPending && (
              <>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Refresh Status
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Go to Dashboard
                </button>
              </>
            )}

            {isFailed && (
              <>
                <button
                  onClick={() => navigate(`/checkout/${transaction.solutionId}`)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/catalog')}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Continue Shopping
                </button>
              </>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 text-sm text-gray-500">
            <p>
              Need help? Contact our support team at{' '}
              <a href="mailto:support@marketplace.com" className="text-blue-600 hover:text-blue-800">
                support@marketplace.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;