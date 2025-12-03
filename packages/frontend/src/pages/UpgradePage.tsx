import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const UpgradePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to checkout page with all parameters
    const checkoutUrl = `/checkout?${searchParams.toString()}`;
    navigate(checkoutUrl, { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-gray-600 mb-4">Redirecting to checkout...</div>
      </div>
    </div>
  );
};

export default UpgradePage;
