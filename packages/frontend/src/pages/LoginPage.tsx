import { useState } from 'react' // useRef temporarily disabled
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
// import ReCAPTCHA from 'react-google-recaptcha' // TEMPORARILY DISABLED FOR TESTING
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  recaptcha: z.string().optional(), // Made optional for testing
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  // TEMPORARILY DISABLED FOR TESTING
  // const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  // const recaptchaRef = useRef<ReCAPTCHA>(null)
  const { login, isLoading, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const from = location.state?.from?.pathname || '/'
  
  // Check for FAISS redirect parameters
  const returnTo = searchParams.get('return_to')
  const solutionId = searchParams.get('solution_id')
  const isFaissRedirect = returnTo === 'faiss' || solutionId === 'aws-finder'

  const {
    register,
    handleSubmit,
    formState: { errors },
    // TEMPORARILY DISABLED FOR TESTING
    // setValue,
    // clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError()
      await login({ email: data.email, password: data.password }) // recaptchaToken temporarily disabled
      
      // Get user from auth context to check role
      const storedUser = localStorage.getItem('user')
      
      if (storedUser) {
        const user = JSON.parse(storedUser)
        
        // Handle FAISS redirect for regular users
        if (isFaissRedirect && user.role !== 'admin') {
          try {
            // Generate token for FAISS access
            const response = await fetch(`${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api/generate-solution-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              },
              body: JSON.stringify({
                user_id: user.userId || user.email, // Send as user_id to match backend
                solution_id: 'aws-solution-finder-001', // Use correct solution_id
                access_tier: 'registered', // Use access_tier to match backend
                return_url: 'https://awssolutionfinder.solutions.cloudnestle.com/search'
              })
            })

            if (response.ok) {
              const tokenData = await response.json()
              // Redirect to FAISS with token
              window.location.href = tokenData.redirect_url
              return
            }
          } catch (tokenError) {
            console.error('Error generating token:', tokenError)
            // Fall back to normal flow
          }
        }
        
        if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true })
          return
        }
      }
      
      navigate(from, { replace: true })
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

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.6, zIndex: -1 }}>
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
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
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

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-field pr-10"
                  placeholder="Enter your password"
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
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}