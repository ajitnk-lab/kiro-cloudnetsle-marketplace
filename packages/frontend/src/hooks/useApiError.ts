import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export interface UseApiErrorReturn {
  error: ApiError | null;
  isLoading: boolean;
  clearError: () => void;
  executeWithErrorHandling: <T>(
    apiCall: () => Promise<T>,
    options?: {
      retries?: number;
      retryDelay?: number;
      onError?: (error: ApiError) => void;
      onSuccess?: (data: T) => void;
    }
  ) => Promise<T | null>;
}

export const useApiError = (): UseApiErrorReturn => {
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: any): ApiError => {
    console.error('API Error:', err);

    // Handle different error types
    if (err.response) {
      // HTTP error response
      const status = err.response.status;
      const data = err.response.data;

      // Handle authentication errors
      if (status === 401) {
        logout();
        return {
          message: 'Your session has expired. Please log in again.',
          status,
          code: 'UNAUTHORIZED'
        };
      }

      // Handle forbidden errors
      if (status === 403) {
        return {
          message: 'You do not have permission to perform this action.',
          status,
          code: 'FORBIDDEN'
        };
      }

      // Handle not found errors
      if (status === 404) {
        return {
          message: 'The requested resource was not found.',
          status,
          code: 'NOT_FOUND'
        };
      }

      // Handle server errors
      if (status >= 500) {
        return {
          message: 'A server error occurred. Please try again later.',
          status,
          code: 'SERVER_ERROR'
        };
      }

      // Handle other HTTP errors
      return {
        message: data?.error || data?.message || 'An error occurred',
        status,
        code: data?.code || 'HTTP_ERROR',
        details: data
      };
    }

    // Handle network errors
    if (err.code === 'NETWORK_ERROR' || !err.response) {
      return {
        message: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR'
      };
    }

    // Handle timeout errors
    if (err.code === 'ECONNABORTED') {
      return {
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT'
      };
    }

    // Handle generic errors
    return {
      message: err.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    };
  }, [logout]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const executeWithErrorHandling = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: {
      retries?: number;
      retryDelay?: number;
      onError?: (error: ApiError) => void;
      onSuccess?: (data: T) => void;
    } = {}
  ): Promise<T | null> => {
    const { 
      retries = 2, 
      retryDelay = 1000, 
      onError, 
      onSuccess 
    } = options;

    setIsLoading(true);
    setError(null);

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await apiCall();
        setIsLoading(false);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        lastError = handleError(err);
        
        // Don't retry for certain error types
        if (lastError.status === 401 || lastError.status === 403 || lastError.status === 404) {
          break;
        }
        
        // If this is not the last attempt, wait before retrying
        if (attempt < retries) {
          await sleep(retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    setIsLoading(false);
    setError(lastError);
    
    if (onError && lastError) {
      onError(lastError);
    }
    
    return null;
  }, [handleError]);

  return {
    error,
    isLoading,
    clearError,
    executeWithErrorHandling
  };
};
