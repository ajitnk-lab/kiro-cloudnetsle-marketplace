import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { catalogService } from '../services/catalog';
import { paymentService } from '../services/payment';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../components/Toast';
import { Solution } from '../types/solution';
import { ArrowLeft, Loader2 } from 'lucide-react';

const CheckoutPage: React.FC = () => {
  const { solutionId: pathSolutionId } = useParams<{ solutionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // Get solutionId from either path params or query params (for FAISS compatibility)
  const solutionId = pathSolutionId || searchParams.get('solution');
  
  const [solution, setSolution] = useState<Solution | null>(null);
  const { error, isLoading, executeWithErrorHandling } = useApiError();
  const { error: showError } = useToast();
  const [processing, setProcessing] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (!solutionId) {
      navigate('/catalog');
      return;
    }

    loadSolution();
  }, [solutionId, navigate]);

  const loadSolution = async () => {
    await executeWithErrorHandling(
      () => catalogService.getSolution(solutionId!),
      {
        onSuccess: (data) => setSolution(data as Solution),
        onError: (error) => showError('Failed to load solution', error.message)
      }
    );
  };

  const handlePurchase = async () => {
    if (!solution || !user || !agreedToTerms) return;

    setProcessing(true);

    const proTier = solution.pricing?.tiers?.find(tier => tier.name === 'Pro');
    const amount = proTier?.amount || solution.pricing?.proTier?.amount || solution.pricing?.amount || 299;

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

  const proTier = solution.pricing?.tiers?.find(tier => tier.name === 'Pro');
  const amount = proTier?.amount || solution.pricing?.proTier?.amount || solution.pricing?.amount || 299;

  const isSubscription = solution.pricing.model === 'subscription';

  // If user is not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in to continue</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to your account to complete the purchase of {solution?.name}.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/login', { 
                  state: { 
                    from: `/checkout?solution=${solutionId}&return_url=${searchParams.get('return_url')}` 
                  } 
                })}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register', { 
                  state: { 
                    from: `/checkout?solution=${solutionId}&return_url=${searchParams.get('return_url')}` 
                  } 
                })}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-200"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Solution Details - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="flex items-start space-x-4 mb-6">
                <img
                  src={solution.assets?.images?.[0] || '/vite.svg'}
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
                    Monthly Pro Subscription
                  </span>
                  <span className="font-medium">₹{amount?.toLocaleString()}</span>
                </div>
                
                {isSubscription && (
                  <div className="text-sm text-gray-500 mb-4">
                    Monthly subscription. Cancel anytime.
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
          </div>

          {/* Payment Form - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                  <div className="text-red-800 text-sm break-words">{error.message}</div>
                </div>
              )}

              {/* User Information */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Billing Information</h3>
                <div className="bg-gray-50 rounded-md p-4 space-y-3">
                  <div className="text-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Email Address</div>
                    <div className="font-medium text-gray-900 break-all text-xs">{user?.email}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Name</div>
                    <div className="font-medium text-gray-900 break-words text-xs">{user?.profile?.name || 'Not provided'}</div>
                  </div>
                  {user?.profile?.company && (
                    <div className="text-sm">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Company</div>
                      <div className="font-medium text-gray-900 break-words text-xs">{user.profile.company}</div>
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Location</div>
                    <div className="font-medium text-gray-900 break-words text-xs">
                      {user?.profile?.city || 'City'}, {user?.profile?.state || 'State'}, {user?.profile?.country || 'India'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Method</h3>
                <div className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <img 
                      src="/images/cashfree.png" 
                      alt="Cashfree" 
                      className="h-16 w-24 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        Secure Payment via Cashfree
                      </div>
                      <div className="text-xs text-gray-500">
                        Cards, UPI, Net Banking, and Wallets accepted
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Method Icons */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-2">Accepted:</div>
                    <div className="grid grid-cols-4 gap-2">
                      <img src="/images/visa.png" alt="Visa" className="h-6 object-contain" />
                      <img src="/images/mastercard.png" alt="Mastercard" className="h-6 object-contain" />
                      <img src="/images/amex.png" alt="American Express" className="h-6 object-contain" />
                      <img src="/images/maestro.png" alt="Maestro" className="h-6 object-contain" />
                      <img src="/images/diners.png" alt="Diners Club" className="h-6 object-contain" />
                      <img src="/images/gpay.png" alt="Google Pay" className="h-6 object-contain" />
                      <img src="/images/phonepe.png" alt="PhonePe" className="h-6 object-contain" />
                      <img src="/images/bhim.png" alt="BHIM UPI" className="h-6 object-contain" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="mb-6">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms-agreement"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="terms-agreement" className="text-sm text-gray-600">
                    I agree to the{' '}
                    <a 
                      href="/terms" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a 
                      href="/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Privacy Policy
                    </a>
                    .{isSubscription && ' I understand that my subscription will auto-renew monthly.'}
                  </label>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={processing || !agreedToTerms}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isSubscription ? 'Subscribe to Pro Monthly' : 'Complete Purchase'}
                    <span className="ml-2">₹{amount?.toLocaleString()}</span>
                  </>
                )}
              </button>

              {!agreedToTerms && (
                <div className="mt-2 text-xs text-red-600 text-center">
                  Please agree to the terms and conditions to continue
                </div>
              )}
            </div>
          </div>

          {/* Security Information - Takes 1 column */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔒 Secure & Encrypted Payment</h3>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Your payment information is encrypted and secure. We don't store your card details.
                </p>

                {/* Security Features - Made Prominent */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <img src="/images/ssl.jpg" alt="SSL" className="h-8 w-8 object-contain" />
                    <span className="text-sm font-bold text-green-800">SSL Secured</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <img src="/images/aes256.jpg" alt="AES 256" className="h-8 w-8 object-contain" />
                    <span className="text-sm font-bold text-green-800">256-bit Encryption</span>
                  </div>
                </div>

                {/* Compliance Badges - Made Bigger and Clickable */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm font-bold text-gray-900 mb-4">🏆 Payment Gateway Compliance:</div>
                  <div className="space-y-4">
                    <a 
                      href="https://cashfreelogo.cashfree.com/website/pdf/cashfreepcidsscoc2025to2026.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                    >
                      <img src="/images/pci-dss.jpg" alt="PCI DSS" className="h-10 w-10 object-contain" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-blue-800 group-hover:text-blue-900">
                          PCI DSS v4.0.1 Compliant
                        </div>
                        <div className="text-xs text-blue-600">Click to view certificate</div>
                      </div>
                    </a>
                    
                    <a 
                      href="https://cashfreelogo.cashfree.com/website/pdf/CASHFREEPAYMENTSINDIAPRIVATELIMITED-ISO%209001-2024.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                    >
                      <img src="/images/iso9001-2015.jpg" alt="ISO 9001" className="h-10 w-10 object-contain" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-blue-800 group-hover:text-blue-900">
                          ISO 9001:2015 Certified
                        </div>
                        <div className="text-xs text-blue-600">Click to view certificate</div>
                      </div>
                    </a>
                    
                    <a 
                      href="https://cashfreelogo.cashfree.com/website/pdf/ISO27001_2022Year2024certificate.pdf" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-blue-50 transition-colors group"
                    >
                      <img src="/images/iso27001-2022.jpg" alt="ISO 27001" className="h-10 w-10 object-contain" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-blue-800 group-hover:text-blue-900">
                          ISO/IEC 27001:2022 Certified
                        </div>
                        <div className="text-xs text-blue-600">Click to view certificate</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
