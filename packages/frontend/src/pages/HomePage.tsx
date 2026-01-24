import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CookieConsent } from '../components/CookieConsent'
import { Search, ShoppingBag, Users, TrendingUp, Shield, Zap } from 'lucide-react'

export function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const [animatedStats, setAnimatedStats] = useState({
    solutions: 0,
    partners: 0,
    customers: 0,
    uptime: 0
  })

  // Animated counter effect
  useEffect(() => {
    const targets = { solutions: 1000, partners: 500, customers: 10000, uptime: 99.9 }
    const duration = 2000 // 2 seconds
    const steps = 60
    const stepTime = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      
      setAnimatedStats({
        solutions: Math.floor(targets.solutions * progress),
        partners: Math.floor(targets.partners * progress),
        customers: Math.floor(targets.customers * progress),
        uptime: Math.min(targets.uptime * progress, 99.9)
      })

      if (currentStep >= steps) {
        clearInterval(timer)
        setAnimatedStats(targets)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 opacity-40">
          <img 
            src="/homepage-image.png" 
            alt="Marketplace Background" 
            className="w-full h-full object-cover"
          />
        </div>
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/60 to-blue-800/60"></div>
        
        <div className="relative z-10 max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Gateway to
              <span className="block text-blue-200">Software Solutions</span>
            </h1>
            <p className="text-lg text-blue-200 mb-4 font-semibold">
              Powered by CloudNestle Consulting & Services
            </p>
            <div className="text-sm text-blue-200 mb-4">
              Last updated: {new Date().toLocaleString()}
            </div>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Discover, purchase, and manage software solutions from trusted partners.
              Join thousands of customers and partners in our thriving marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {isAuthenticated ? (
                <Link to="/catalog" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold bg-white text-blue-600 rounded-xl shadow-2xl hover:bg-gray-50 hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 border-white">
                  <Search className="h-6 w-6 mr-3" />
                  Browse Solutions
                </Link>
              ) : (
                <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold bg-white text-blue-600 rounded-xl shadow-2xl hover:bg-gray-50 hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 border-white">
                  Sign In to Browse
                </Link>
              )}
              {!isAuthenticated && (
                <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold bg-transparent text-white rounded-xl border-3 border-white shadow-2xl hover:bg-white hover:text-blue-600 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm">
                  Get Started Free
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Our Marketplace?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We provide a secure, scalable platform for software commerce with features
            designed for both customers and partners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card text-center group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 hover:border-l-blue-600">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-blue-600">Easy Discovery</h3>
            <p className="text-gray-600 leading-relaxed">
              Find the perfect software solutions with our advanced search and filtering capabilities.
            </p>
            <div className="mt-4 h-1 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{width: '85%'}}></div>
            </div>
          </div>

          <div className="card text-center group hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500 hover:border-l-green-600">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-green-600">Secure Payments</h3>
            <p className="text-gray-600 leading-relaxed">
              Safe and secure payment processing with support for cards, UPI, and other payment methods.
            </p>
            <div className="mt-4 h-1 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-pulse" style={{width: '95%'}}></div>
            </div>
          </div>

          <div className="card text-center group hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500 hover:border-l-purple-600">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-purple-600">Partner Program</h3>
            <p className="text-gray-600 leading-relaxed">
              Join our partner program to sell your software solutions and reach new customers.
            </p>
            <div className="mt-4 h-1 bg-purple-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{width: '78%'}}></div>
            </div>
          </div>

          <div className="card text-center group hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500 hover:border-l-orange-600">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-orange-600">Analytics & Insights</h3>
            <p className="text-gray-600 leading-relaxed">
              Comprehensive analytics and reporting for partners to track performance and optimize sales.
            </p>
            <div className="mt-4 h-1 bg-orange-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{width: '92%'}}></div>
            </div>
          </div>

          <div className="card text-center group hover:shadow-xl transition-all duration-300 border-l-4 border-l-red-500 hover:border-l-red-600">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-red-600">Instant Access</h3>
            <p className="text-gray-600 leading-relaxed">
              Get immediate access to purchased solutions with automated delivery and licensing.
            </p>
            <div className="mt-4 h-1 bg-red-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full animate-pulse" style={{width: '88%'}}></div>
            </div>
          </div>

          <div className="card text-center group hover:shadow-xl transition-all duration-300 border-l-4 border-l-indigo-500 hover:border-l-indigo-600">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 text-indigo-600">Quality Assurance</h3>
            <p className="text-gray-600 leading-relaxed">
              All solutions are reviewed and approved by our team to ensure quality and security.
            </p>
            <div className="mt-4 h-1 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{width: '96%'}}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                {animatedStats.solutions.toLocaleString()}+
              </div>
              <div className="text-gray-600 text-lg font-medium">Software Solutions</div>
              <div className="mt-3 h-2 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000" style={{width: `${(animatedStats.solutions / 1000) * 100}%`}}></div>
              </div>
            </div>
            <div className="group">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                {animatedStats.partners.toLocaleString()}+
              </div>
              <div className="text-gray-600 text-lg font-medium">Trusted Partners</div>
              <div className="mt-3 h-2 bg-green-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1000" style={{width: `${(animatedStats.partners / 500) * 100}%`}}></div>
              </div>
            </div>
            <div className="group">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                {(animatedStats.customers / 1000).toFixed(0)}K+
              </div>
              <div className="text-gray-600 text-lg font-medium">Happy Customers</div>
              <div className="mt-3 h-2 bg-purple-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000" style={{width: `${(animatedStats.customers / 10000) * 100}%`}}></div>
              </div>
            </div>
            <div className="group">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                {animatedStats.uptime.toFixed(1)}%
              </div>
              <div className="text-gray-600 text-lg font-medium">Uptime</div>
              <div className="mt-3 h-2 bg-orange-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-1000" style={{width: `${animatedStats.uptime}%`}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-3xl p-16 text-white relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-20 right-20 w-16 h-16 bg-white rounded-full animate-bounce"></div>
            <div className="absolute bottom-10 left-20 w-12 h-12 bg-white rounded-full animate-ping"></div>
            <div className="absolute bottom-20 right-10 w-24 h-24 bg-white rounded-full animate-pulse"></div>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-10 text-blue-100 max-w-2xl mx-auto leading-relaxed">
              {isAuthenticated
                ? `Welcome back, ${user?.profile.name?.replace(/ Name$/, '') || user?.email}! Explore our latest solutions.`
                : 'Join thousands of customers and partners in our marketplace today.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {isAuthenticated ? (
                <>
                  <Link to="/catalog" className="btn-primary bg-white text-blue-600 hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                    Browse Solutions
                  </Link>
                  {user?.role === 'customer' && (
                    <Link to="/partners" className="btn-outline border-white text-white hover:bg-white hover:text-blue-600 transform hover:scale-105 transition-all duration-300">
                      Become a Partner
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-primary bg-white text-blue-600 hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                    Sign In to Browse
                  </Link>
                  <Link to="/register" className="btn-outline border-white text-white hover:bg-white hover:text-blue-600 transform hover:scale-105 transition-all duration-300">
                    Sign Up Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      
      <CookieConsent />
    </div>
  )
}