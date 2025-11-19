import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { BackgroundImage } from '../components/BackgroundImage'
import { User, Mail, Building, Calendar, Shield, RefreshCw, Crown } from 'lucide-react'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

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
                  <div className="text-sm font-medium text-gray-900">Subscription Tier</div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.tier === 'pro' 
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.tier === 'pro' ? 'Pro' : 'Registered'}
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