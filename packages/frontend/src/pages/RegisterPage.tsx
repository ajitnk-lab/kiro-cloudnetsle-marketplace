import React, { useState } from 'react' // useRef temporarily disabled
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
// import ReCAPTCHA from 'react-google-recaptcha' // TEMPORARILY DISABLED FOR TESTING
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  company: z.string().optional(),
  role: z.enum(['customer', 'partner']).default('customer'),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  recaptcha: z.string().optional(), // Made optional for testing
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  // TEMPORARILY DISABLED FOR TESTING
  // const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  // const recaptchaRef = useRef<ReCAPTCHA>(null)
  const { register: registerUser, confirmRegistration, isLoading, error, clearError } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Check for FAISS redirect parameters
  const returnTo = searchParams.get('return_to')
  const solutionId = searchParams.get('solution_id')
  const isFaissRedirect = returnTo === 'faiss' || solutionId === 'aws-finder'

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    // TEMPORARILY DISABLED FOR TESTING
    // setValue,
    // clearErrors,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'customer',
    },
  })

  const watchedRole = watch('role')
  const watchedPassword = watch('password')

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
    
    return {
      score,
      label: labels[score - 1] || '',
      color: colors[score - 1] || 'bg-gray-300',
    }
  }

  const passwordStrength = getPasswordStrength(watchedPassword || '')

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError()
      const { confirmPassword, agreeToTerms, recaptcha, ...registerData } = data
      const result = await registerUser({ ...registerData }) // recaptchaToken temporarily disabled
      
      if (result.needsVerification) {
        setUserEmail(result.email)
        setShowVerification(true)
      }
    } catch (error) {
      // Reset reCAPTCHA on error - TEMPORARILY DISABLED
      // recaptchaRef.current?.reset()
      // setRecaptchaToken(null)
      // setValue('recaptcha', '')
    }
  }

  // TEMPORARILY DISABLED FOR TESTING
  /*
  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token)
    if (token) {
      setValue('recaptcha', token)
      clearErrors('recaptcha')
    } else {
      setValue('recaptcha', '')
    }
  }
  */

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      clearError()
      await confirmRegistration(userEmail, verificationCode)
      
      // If this is a solution redirect (has solution_id), redirect with token
      if (solutionId) {
        try {
          // The registration already created the token and entitlement
          // Just redirect to the solution with the token
          const solutionUrls: Record<string, string> = {
            'aws-solution-finder-001': 'https://awssolutionfinder.solutions.cloudnestle.com',
            'faiss': 'https://awssolutionfinder.solutions.cloudnestle.com'
          }
          
          const baseUrl = solutionUrls[solutionId] || `https://solution-${solutionId}.example.com`
          
          // Get the token from the registration response (stored in localStorage or context)
          const token = localStorage.getItem(`solution_token_${solutionId}`)
          
          if (token) {
            const redirectUrl = `${baseUrl}?token=${token}&user_email=${encodeURIComponent(userEmail)}&tier=registered`
            window.location.href = redirectUrl
            return
          }
        } catch (error) {
          console.error('Error redirecting to solution:', error)
        }
      }
      
      // Default redirect to profile page
      navigate('/profile')
    } catch (error) {
      console.error('Verification error:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.3, zIndex: -1 }}>
        <img 
          src="/homepage-image.png" 
          alt="Marketplace Background" 
          className="w-full h-full object-cover"
        />
      </div>
      {/* Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600/40 to-blue-800/40 pointer-events-none" style={{ zIndex: -1 }}></div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8">
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {isFaissRedirect ? 'Get 10 Free Daily Searches' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isFaissRedirect ? (
              <>
                Register to unlock <strong>10 daily searches</strong> on AWS Solution Finder
                <br />
                <span className="text-blue-600 font-medium">Upgrade to Pro for unlimited access</span>
              </>
            ) : (
              <>
                Or{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  sign in to your existing account
                </Link>
              </>
            )}
          </p>
        </div>

        <div className="card">

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Email Verification Form */}
          {showVerification ? (
            <form onSubmit={handleVerification} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Verify Your Email</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Verification code sent to <strong>{userEmail}</strong>
                </p>
              </div>

              {/* Step 1: Enter Verification Code */}
              <div className="mb-6">
                <label htmlFor="verificationCode" className="block text-sm font-semibold text-gray-900 mb-2">
                  Step 1: Enter Verification Code
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="input w-full border-2 border-blue-500 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 bg-white text-center text-2xl font-mono tracking-widest py-3 shadow-lg"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-600 mt-2 text-center">Check your email inbox for the 6-digit code</p>
              </div>

              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="btn btn-primary w-full text-lg py-3"
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </button>

              {/* Step 2: Amazon SES Email */}
              <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-2">Step 2: Verify Email with Amazon SES</p>
                    <p className="mb-2">
                      After clicking "Verify Email" above, you'll receive a <strong>second email from Amazon SES</strong> to authorize your email for invoices and notifications.
                    </p>
                    <p className="text-xs bg-white p-2 rounded border border-amber-300 mb-2 italic">
                      Subject: "Email Address Verification Request in region US East (N. Virginia)"
                    </p>
                    <p className="font-medium">
                      ⚠️ Click the link in that email to complete setup (expires in 24 hours)
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVerification(false)}
                className="btn btn-secondary w-full"
              >
                Back to Registration
              </button>
            </form>
          ) : (
            /* Registration Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="relative">
                  <input
                    {...register('role')}
                    type="radio"
                    value="customer"
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    watchedRole === 'customer'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="text-sm font-medium">Customer</div>
                    <div className="text-xs text-gray-500">Buy solutions</div>
                  </div>
                </label>
                <label className="relative">
                  <input
                    {...register('role')}
                    type="radio"
                    value="partner"
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    watchedRole === 'partner'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="text-sm font-medium">Partner</div>
                    <div className="text-xs text-gray-500">Sell solutions</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                {...register('name')}
                type="text"
                autoComplete="off"
                className="mt-1 input-field"
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="mt-1 input-field"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {watchedRole === 'partner' && (
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  {...register('company')}
                  type="text"
                  autoComplete="organization"
                  className="mt-1 input-field"
                  placeholder="Enter your company name"
                />
                {errors.company && (
                  <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input-field pr-10"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {watchedPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{passwordStrength.label}</span>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input-field pr-10"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...register('agreeToTerms')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="agreeToTerms" className="text-gray-700">
                  I agree to the{' '}
                  <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </Link>
                </label>
                {errors.agreeToTerms && (
                  <p className="mt-1 text-red-600">{errors.agreeToTerms.message}</p>
                )}
              </div>
            </div>

            {/* reCAPTCHA - TEMPORARILY DISABLED FOR TESTING */}
            {/* 
            <div>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={handleRecaptchaChange}
                onExpired={() => handleRecaptchaChange(null)}
                onError={() => handleRecaptchaChange(null)}
              />
              {errors.recaptcha && (
                <p className="mt-1 text-sm text-red-600">{errors.recaptcha.message}</p>
              )}
            </div>
            */}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  )
}