import { useState, useEffect } from 'react'
import { Search, Filter, Grid, List, Package, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { BackgroundImage } from '../components/BackgroundImage'
import { CustomPopup, usePopup } from '../components/CustomPopup'
import { authService } from '../services/auth'
import { fetchAuthSession } from 'aws-amplify/auth'
import { SOLUTION_URLS } from '../utils/solutionUrls'

interface Solution {
  solutionId: string
  name: string
  description: string
  category: string
  pricing: {
    model: string
    amount: number
    currency: string
  }
  partnerName?: string
  status?: string
  actionButtonText?: string
  externalUrl?: string
}

export function CatalogPage() {
  const { user, isAuthenticated } = useAuth()
  const { popup, showPopup, closePopup } = usePopup()
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadSolutions()
  }, [])

  const loadSolutions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Customers see approved solutions, admin sees all solutions
      const endpoint = isAdmin ? '/admin/solutions' : '/catalog'
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod'
      
      const headers: any = {}
      
      // If user is logged in, they must have a valid session - use a dummy token for API calls
      if (user && user.email) {
        headers['Authorization'] = `Bearer dummy-token-for-logged-in-user`
        console.log('🔍 Debug - User is logged in, using dummy auth header')
      } else {
        console.log('🔍 Debug - No user found')
      }
      
      console.log('Loading solutions from:', `${apiUrl}${endpoint}`, 'with auth:', !!headers.Authorization)
      
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}${endpoint}`, {
        headers
      })
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Solutions data:', data)
        
        // Add externalUrl to solutions that have URLs in SOLUTION_URLS
        const solutionsWithUrls = (data.solutions || []).map((solution: Solution) => ({
          ...solution,
          externalUrl: SOLUTION_URLS[solution.solutionId] || undefined
        }))
        
        setSolutions(solutionsWithUrls)
      } else {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        setError(`Failed to load solutions: ${response.status}`)
      }
    } catch (error) {
      console.error('Network error:', error)
      setError('Network error loading solutions')
    } finally {
      setLoading(false)
    }
  }

  const handleSolutionAction = async (solutionId: string, action: 'approve' | 'reject') => {
    try {
      let token = authService.getToken()
      if (!token) {
        try {
          const session = await fetchAuthSession()
          token = session.tokens?.accessToken?.toString() || null
          if (token) {
            authService.setToken(token)
          }
        } catch (error) {
          console.error('Failed to get session token:', error)
        }
      }
      
      if (!token) {
        console.error('No auth token found')
        return
      }
      
      const response = await fetch(`${(import.meta as any).env.VITE_API_URL.replace(/\/$/, '')}/admin/solutions/${solutionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        loadSolutions()
        setSelectedSolution(null)
      } else {
        console.error('Failed to update solution:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Failed to update solution:', error)
    }
  }

  const handlePurchase = async (solution: Solution | null) => {
    if (!solution || !user) return
    
    try {
      const token = authService.getToken()
      if (!token) {
        console.error('No auth token found')
        return
      }

      const response = await fetch(`${(import.meta as any).env.VITE_API_URL.replace(/\/$/, '')}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          solutionId: solution.solutionId,
          amount: solution.pricing.amount,
          currency: solution.pricing.currency,
          userId: user.userId,
          userEmail: user.email,
          userName: user.profile.name
        })
      })

      const data = await response.json()
      
      if (data.success && data.redirectUrl) {
        // Redirect to PhonePe payment page
        window.location.href = data.redirectUrl
      } else {
        console.error('Payment initiation failed:', data.message)
        showPopup('Payment initiation failed. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Payment error:', error)
      showPopup('Payment initiation failed. Please try again.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <BackgroundImage />
        <div className="relative z-10 max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading solutions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      <BackgroundImage />
      <div className="relative z-10 max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Solution Catalog</h1>
          {user?.role === 'partner' && user?.marketplaceStatus === 'active' && (
            <button
              onClick={() => window.location.href = '/partner/solutions/add'}
              className="btn-primary flex items-center space-x-2"
            >
              <span>Add Solution</span>
            </button>
          )}
        </div>
        <p className="text-gray-600">
          Discover software solutions from our trusted partners
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search solutions..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button className="btn-outline">
              <Grid className="h-4 w-4" />
            </button>
            <button className="btn-outline">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Solutions Grid */}
      {error ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Solutions</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={loadSolutions}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : solutions.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Solutions Available</h2>
            <p className="text-gray-600 mb-6">
              There are currently no approved solutions in the catalog. Check back soon!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((solution) => (
            <div key={solution.solutionId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{solution.name}</h3>
                  {isAdmin && solution.status && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      solution.status === 'approved' ? 'bg-green-100 text-green-800' :
                      solution.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {solution.status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{solution.category}</p>
                <p className="text-gray-700 text-sm line-clamp-3">{solution.description}</p>
              </div>
              
              <div className="flex items-center justify-between">
                {solution.pricing.amount > 0 && (
                  <div className="text-lg font-bold text-green-600">
                    {solution.pricing.currency} {solution.pricing.amount}
                    {solution.pricing.model === 'subscription' && <span className="text-sm font-normal">/month</span>}
                  </div>
                )}
                <button 
                  onClick={async () => {
                    console.log('🔘 CATALOG: Button clicked for solution:', solution.name)
                    console.log('🔘 CATALOG: User from AuthContext:', user?.email || 'null')
                    console.log('🔘 CATALOG: isAuthenticated:', isAuthenticated)
                    
                    if (solution.externalUrl) {
                      console.log('🔍 CATALOG: External URL found:', solution.externalUrl)
                      // For AWS Solution Finder, generate token via API
                      if (solution.externalUrl.includes('awssolutionfinder.solutions.cloudnestle.com')) {
                        console.log('🔍 CATALOG: AWS Solution Finder detected')
                        
                        // Get user email from AuthContext (should be synced now)
                        let userEmail = user?.email;
                        console.log('🔍 CATALOG: User email from context:', userEmail)
                        
                        if (!userEmail) {
                          console.log('❌ CATALOG: No user email found, showing popup')
                          showPopup('Please login first', 'info')
                          return
                        }

                        console.log('🔍 CATALOG: Generating token for email:', userEmail)
                        console.log('🔍 CATALOG: Auth token exists:', !!authService.getToken())
                        
                        try {
                          const apiUrl = (import.meta as any).env.VITE_API_URL || 'https://juvt4m81ld.execute-api.us-east-1.amazonaws.com/prod'
                          console.log('🔍 CATALOG: API URL:', apiUrl)
                          
                          // Get user details to extract userId and determine actual tier
                          let userId = user?.userId
                          let userTier = 'registered' // Default fallback
                          
                          if (!userId) {
                            console.log('🔍 CATALOG: No userId in context, fetching from profile API')
                          }
                          
                          // Always fetch profile to get entitlements and determine actual tier
                          try {
                            const profileResponse = await fetch(`${apiUrl.replace(/\/$/, '')}/user/profile`, {
                              headers: {
                                'Authorization': `Bearer ${authService.getToken()}`,
                                'Content-Type': 'application/json'
                              }
                            })
                            if (profileResponse.ok) {
                              const profileData = await profileResponse.json()
                              if (!userId) {
                                userId = profileData.user?.userId
                                console.log('🔍 CATALOG: Got userId from profile:', userId)
                              }
                              
                              // Determine user's actual tier from entitlements
                              const entitlements = profileData.entitlements || []
                              console.log('🔍 CATALOG: All entitlements:', entitlements)
                              
                              const awsFinderEntitlement = entitlements.find((e: any) => 
                                e.solutionId === 'aws-solution-finder' || 
                                e.solutionId === 'aws-solution-finder-001'
                              )
                              console.log('🔍 CATALOG: AWS Finder entitlement:', awsFinderEntitlement)
                              
                              if (awsFinderEntitlement) {
                                const tier = awsFinderEntitlement.access_tier || 'registered'
                                const expiresAt = awsFinderEntitlement.pro_expires_at
                                console.log('🔍 CATALOG: Entitlement tier:', tier, 'expires:', expiresAt)
                                
                                // Check if pro tier is still valid
                                if (tier === 'pro' && expiresAt) {
                                  const expiryDate = new Date(expiresAt)
                                  const now = new Date()
                                  userTier = expiryDate > now ? 'pro' : 'registered'
                                  console.log('🔍 CATALOG: Pro tier check - expires:', expiryDate, 'now:', now, 'result:', userTier)
                                } else {
                                  userTier = tier
                                  console.log('🔍 CATALOG: Using tier directly:', userTier)
                                }
                              } else {
                                console.log('🔍 CATALOG: No AWS Finder entitlement found, using default:', userTier)
                              }
                              console.log('🔍 CATALOG: Determined user tier:', userTier)
                            }
                          } catch (profileError) {
                            console.error('🔍 CATALOG: Profile fetch failed:', profileError)
                          }
                          
                          if (!userId) {
                            showPopup('Error: User ID not available. Please refresh the page and try again.', 'error')
                            return
                          }
                          
                          const payload = {
                            user_id: userId,
                            solution_id: 'aws-solution-finder-001',
                            access_tier: userTier
                          }
                          console.log('🔍 CATALOG: API payload:', payload)
                          
                          const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/generate-solution-token`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${authService.getToken()}`
                            },
                            body: JSON.stringify(payload)
                          })
                          
                          console.log('🔍 CATALOG: API response status:', response.status)
                          
                          if (response.ok) {
                            const data = await response.json()
                            console.log('🔍 CATALOG: Token generated successfully:', data)
                            
                            // Verify token exists before redirecting
                            if (data.token) {
                              const redirectUrl = `https://awssolutionfinder.solutions.cloudnestle.com/search?token=${data.token}&user_id=${encodeURIComponent(userId)}&user_email=${encodeURIComponent(userEmail)}&tier=${userTier}`
                              console.log('🔍 CATALOG: Opening redirect URL:', redirectUrl)
                              window.open(redirectUrl, '_blank')
                            } else {
                              console.error('❌ CATALOG: No token in response:', data)
                              showPopup('Failed to generate access token. Please try again.', 'error')
                            }
                          } else {
                            const errorText = await response.text()
                            console.error('❌ CATALOG: Token generation failed:', response.status, errorText)
                            showPopup('Failed to generate access token. Please try again.', 'error')
                          }
                        } catch (error) {
                          console.error('❌ CATALOG: Token generation error:', error)
                          showPopup('Failed to generate access token. Please try again.', 'error')
                        }
                      } else {
                        console.log('🔍 CATALOG: Opening external URL directly:', solution.externalUrl)
                        window.location.href = solution.externalUrl
                      }
                    } else {
                      console.log('🔍 CATALOG: No external URL, showing modal')
                      setSelectedSolution(solution)
                    }
                  }}
                  className="btn-primary text-sm"
                >
                  {solution.externalUrl && solution.externalUrl.includes('awssolutionfinder') ? 'Access Now' : (solution.actionButtonText || 'View Details')}
                </button>
              </div>
              
              {solution.partnerName && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">by {solution.partnerName}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Solution Detail Modal */}
      {selectedSolution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedSolution.name}</h2>
                <button 
                  onClick={() => {
                    console.log('Closing modal')
                    setSelectedSolution(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Category</h3>
                  <p className="text-gray-700">{selectedSolution.category}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{selectedSolution.description}</p>
                </div>
                
                {selectedSolution.pricing.amount > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Pricing</h3>
                    <p className="text-gray-700">
                      {selectedSolution.pricing.currency} {selectedSolution.pricing.amount}
                      {selectedSolution.pricing.model === 'subscription' && ' per month'}
                      {selectedSolution.pricing.model === 'upfront' && ' one-time'}
                    </p>
                  </div>
                )}
                
                {selectedSolution.partnerName && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Partner</h3>
                    <p className="text-gray-700">{selectedSolution.partnerName}</p>
                  </div>
                )}
                
                {isAdmin && selectedSolution.status && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      selectedSolution.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedSolution.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedSolution.status}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                {isAdmin && selectedSolution.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleSolutionAction(selectedSolution.solutionId, 'approve')}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleSolutionAction(selectedSolution.solutionId, 'reject')}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                ) : user?.role === 'customer' ? (
                  <button 
                    className="btn-primary"
                    onClick={() => handlePurchase(selectedSolution)}
                  >
                    Purchase Solution
                  </button>
                ) : (
                  <button className="btn-outline" disabled>
                    {user?.role === 'partner' ? 'Partners cannot purchase' : 
                     user?.role === 'admin' ? 'Admins cannot purchase' : 
                     'Login to purchase'}
                  </button>
                )}
                <button 
                  onClick={() => setSelectedSolution(null)}
                  className="btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <CustomPopup
        message={popup.message}
        type={popup.type}
        isOpen={popup.isOpen}
        onClose={closePopup}
      />
      </div>
    </div>
  )
}