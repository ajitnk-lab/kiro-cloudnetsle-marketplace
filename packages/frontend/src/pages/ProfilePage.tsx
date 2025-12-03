import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { BackgroundImage } from '../components/BackgroundImage'
import { User, Mail, Building, Calendar, Shield, RefreshCw, Crown, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [entitlements, setEntitlements] = useState<any[]>([])

  useEffect(() => {
    // Fetch user entitlements to get subscription details
    const fetchEntitlements = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}user/profile`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setEntitlements(data.entitlements || [])
        }
      } catch (error) {
        console.error('Error fetching entitlements:', error)
      }
    }

    if (user) {
      fetchEntitlements()
    }
  }, [user])

  const getSubscriptionStatus = () => {
    const awsFinderEntitlement = entitlements.find(e => 
      e.solutionId === 'aws-solution-finder' || 
      e.solutionId === 'aws-solution-finder-001'
    )
    
    if (!awsFinderEntitlement) {
      return { tier: 'registered', status: 'active', expiresAt: null }
    }

    const tier = awsFinderEntitlement.access_tier || 'registered'
    const expiresAt = awsFinderEntitlement.pro_expires_at
    
    if (tier === 'pro' && expiresAt) {
      const expiryDate = new Date(expiresAt)
      const now = new Date()
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        tier: 'pro',
        status: expiryDate > now ? 'active' : 'expired',
        expiresAt: expiryDate,
        daysUntilExpiry
      }
    }
    
    return { tier, status: 'active', expiresAt: null }
  }

  const subscriptionStatus = getSubscriptionStatus()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshUser()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <BackgroundImage />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <BackgroundImage />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-40">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Full Name</div>
                  <div className="text-gray-600">{user.profile.name || 'Not provided'}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Email Address</div>
                  <div className="text-gray-600">{user.email}</div>
                </div>
              </div>

              {user.profile.company && (
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Company</div>
                    <div className="text-gray-600">{user.profile.company}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Account Type</div>
                  <div className="text-gray-600 capitalize">{user.role}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Crown className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Current Plan</div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      subscriptionStatus.tier === 'pro' 
                        ? subscriptionStatus.status === 'active'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subscriptionStatus.tier === 'pro' ? 'Pro Monthly' : 'Registered (10 searches/day)'}
                    </span>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title="Refresh subscription status"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Member Since</div>
                  <div className="text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button className="btn-primary">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  user.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : user.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Verified</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h3>
            
            {subscriptionStatus.tier === 'pro' ? (
              <div className="space-y-4">
                {subscriptionStatus.status === 'active' ? (
                  <>
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Pro subscription active</span>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-sm">
                        <div className="font-medium text-green-800 mb-1">
                          Pro subscription expires on:
                        </div>
                        <div className="text-green-700">
                          {subscriptionStatus.expiresAt?.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        
                        {(subscriptionStatus.daysUntilExpiry ?? 0) <= 7 && (
                          <div className="mt-3 flex items-center space-x-2 text-orange-700">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {(subscriptionStatus.daysUntilExpiry ?? 0) <= 3 
                                ? `Your Pro subscription expires in ${subscriptionStatus.daysUntilExpiry} days`
                                : `Expires in ${subscriptionStatus.daysUntilExpiry} days`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      ✅ Unlimited searches • ✅ Priority support • ✅ Advanced features
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Pro subscription expired</span>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-sm text-red-800">
                        Your Pro subscription expired on {subscriptionStatus.expiresAt?.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => navigate('/checkout?solution=aws-solution-finder')}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors"
                    >
                      Renew Pro Subscription
                    </button>
                  </>
                )}
                
                {subscriptionStatus.status === 'active' && (subscriptionStatus.daysUntilExpiry ?? 0) <= 7 && (
                  <button
                    onClick={() => navigate('/checkout?solution=aws-solution-finder')}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors"
                  >
                    Renew Subscription
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Current plan: Registered</span>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">10 searches per day</div>
                    <div>Perfect for getting started with AWS solutions</div>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate('/checkout?solution=aws-solution-finder')}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors"
                >
                  Upgrade to Pro Monthly
                </button>
                
                <div className="text-xs text-gray-500">
                  Pro: ✅ Unlimited searches • ✅ Priority support • ✅ Advanced features
                </div>
              </div>
            )}
          </div>

          {user.role === 'partner' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Partner Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Marketplace Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.marketplaceStatus === 'approved' 
                      ? 'bg-green-100 text-green-800'
                      : user.marketplaceStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : user.marketplaceStatus === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.marketplaceStatus || 'Not Applied'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Partner Level</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    Basic
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Solutions: 0</div>
                  <div>Total Sales: $0</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}