import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js'
import { AlertCircle, CheckCircle, Mail } from 'lucide-react'

const poolData = {
  UserPoolId: import.meta.env.VITE_USER_POOL_ID,
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
}

const userPool = new CognitoUserPool(poolData)

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const email = searchParams.get('email') || ''

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode.trim()) {
      setError('Please enter the verification code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      })

      await new Promise<void>((resolve, reject) => {
        cognitoUser.confirmRegistration(verificationCode, true, (err, _result) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })

      setSuccess(true)
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Email verified successfully! You can now log in.',
            email 
          }
        })
      }, 2000)

    } catch (error: any) {
      console.error('Verification error:', error)
      setError(error.message || 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      })

      await new Promise<void>((resolve, reject) => {
        cognitoUser.resendConfirmationCode((err, _result) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })

      setError(null)
      alert('Verification code sent! Check your email.')
    } catch (error: any) {
      console.error('Resend error:', error)
      setError(error.message || 'Failed to resend code')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Email Verified!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your email has been successfully verified. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We sent a verification code to{' '}
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleVerification} className="space-y-4">
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="mt-1 input-field text-center text-lg tracking-widest"
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoComplete="one-time-code"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit code from your email
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Didn't receive the code?{' '}
              <button
                onClick={resendCode}
                disabled={isLoading}
                className="font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
              >
                Resend code
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}