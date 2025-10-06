import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { catalogService } from '../services/catalog';
import { paymentService } from '../services/payment';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../components/Toast';
import { Solution } from '../types/solution';
import { CreditCard, Shield, ArrowLeft, Loader2 } from 'lucide-react';

const CheckoutPage: React.FC = () => {
  const { solutionId } = useParams<{ solutionId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [solution, setSolution] = useState<Solution | null>(null);
  const { error, isLoading, executeWithErrorHandling } = useApiError();
  const { success, error: showError } = useToast();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/checkout/${solutionId}` } });
      return;
    }

    if (!solutionId) {
      navigate('/catalog');
      return;
    }

    loadSolution();
  }, [solutionId, isAuthenticated, navigate]);

  const loadSolution = async () => {
    const solutionData = await executeWithErrorHandling(
      () => catalogService.getSolutionById(solutionId!),
      {
        onSuccess: (data) => setSolution(data),
        onError: (error) => showError('Failed to load solution', error.message)
      }
    );
  };

  const handlePurchase = async () => {
    if (!solution || !user) return;

    setProcessing(true);

    const amount = solution.pricing.type === 'upfront' 
      ? solution.pricing.upfrontPrice 
      : solution.pricing.monthlyPrice;

    await executeWithErrorHandling(
      () => paymentService.initiatePayment(solution.solutionId, amount!, solution.name),
      {
        onError: (error) => {
          showError('Payment Failed', error.message);
          setProcessing(false);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading checkout...</span>
        </div>
      </div>
    );
  }

  if (error && !solution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error.message}</div>
          <button
            onClick={() => navigate('/catalog')}
            className="text-blue-600 hover:text-blue-800"
          >
            Return to Catalog
          </button>
        </div>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Solution not found</div>
          <button
            onClick={() => navigate('/catalog')}
            className="text-blue-600 hover:text-blue-800"
          >
            Return to Catalog
          </button>
        </div>
      </div>
    );
  }

  const amount = solution.pricing.type === 'upfront' 
    ? solution.pricing.upfrontPrice 
    : solution.pricing.monthlyPrice;

  const isSubscription = solution.pricing.type === 'subscription';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/solution/${solutionId}`)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Solution
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Solution Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="flex items-start space-x-4 mb-6">
              <img
                src={solution.assets.images[0]}
                alt={solution.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{solution.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{solution.category}</p>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                  {solution.description}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">
                  {isSubscription ? 'Monthly Price' : 'One-time Price'}
                </span>
                <span className="font-medium">₹{amount?.toLocaleString()}</span>
              </div>
              
              {isSubscription && (
                <div className="text-sm text-gray-500 mb-4">
                  Billed monthly. Cancel anytime.
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total</span>
                  <span>₹{amount?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="text-red-800">{error.message}</div>
              </div>
            )}

            {/* User Information */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Billing Information</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{user?.name || user?.email}</div>
                  <div className="text-gray-600">{user?.email}</div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Method</h3>
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Secure Payment via Instamojo
                    </div>
                    <div className="text-xs text-gray-500">
                      Cards, UPI, Net Banking, and Wallets accepted
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mb-6">
              <div className="flex items-start space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-700">Secure Payment</div>
                  <div>Your payment information is encrypted and secure. We don't store your card details.</div>
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={processing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {isSubscription ? 'Start Subscription' : 'Complete Purchase'}
                  <span className="ml-2">₹{amount?.toLocaleString()}</span>
                </>
              )}
            </button>

            <div className="mt-4 text-xs text-gray-500 text-center">
              By completing this purchase, you agree to our Terms of Service and Privacy Policy.
              {isSubscription && ' Your subscription will auto-renew monthly.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;