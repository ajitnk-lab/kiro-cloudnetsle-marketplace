import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UpgradePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solution = searchParams.get('solution');
  const returnUrl = searchParams.get('return_url');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!solution) {
      setError('Invalid upgrade request - missing solution parameter');
      return;
    }

    if (!isAuthenticated && !token) {
      // Redirect to login with return URL
      const loginUrl = `/login?redirect=${encodeURIComponent(window.location.href)}`;
      navigate(loginUrl);
      return;
    }

    // Auto-initiate payment if user is authenticated
    if (isAuthenticated || token) {
      initiatePayment();
    }
  }, [isAuthenticated, solution, token]);

  const initiatePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const userEmail = user?.email || 'token-based-user';
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}payments/upgrade-to-pro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'marketplace-user'}`
        },
        body: JSON.stringify({
          userEmail: userEmail,
          returnUrl: returnUrl || 'https://marketplace.cloudnestle.com/profile'
        })
      });

      const data = await response.json();
      
      if (data.success && data.paymentUrl) {
        // Redirect to PhonePe payment page
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.message || 'Failed to initiate payment');
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };



  const getSolutionName = (solutionId: string): string => {
    const solutions: Record<string, string> = {
      'aws-solution-finder': 'AWS Solution Finder',
      // Add more solutions as needed
    };
    return solutions[solutionId] || solutionId;
  };

  const handleReturnToSolution = () => {
    if (returnUrl) {
      window.location.href = decodeURIComponent(returnUrl);
    } else {
      navigate('/');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Upgrade Failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
            <div className="mt-6">
              <button
                onClick={handleReturnToSolution}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Return to Solution
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-orange-600">
            {loading ? (
              <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Upgrading to Pro
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {solution && `Upgrading ${getSolutionName(solution)} to Pro tier`}
          </p>
          {loading && (
            <p className="mt-4 text-sm text-gray-500">
              Initiating secure payment process...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
