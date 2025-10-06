import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from URL
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          console.error('OAuth error:', error)
          navigate('/login?error=oauth_failed')
          return
        }

        if (code) {
          // In a real implementation, you would exchange the code for tokens
          // For now, we'll just redirect to home if already authenticated
          if (isAuthenticated) {
            navigate('/')
          } else {
            // Handle the OAuth callback properly with Cognito
            navigate('/login?error=oauth_incomplete')
          }
        } else {
          navigate('/login')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        navigate('/login?error=callback_failed')
      }
    }

    handleCallback()
  }, [searchParams, navigate, isAuthenticated])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  )
}