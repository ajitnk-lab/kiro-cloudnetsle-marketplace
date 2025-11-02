// import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Search, ShoppingBag, Users, TrendingUp, Shield, Zap } from 'lucide-react'

export function HomePage() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Gateway to
              <span className="block text-blue-200">Software Solutions</span>
            </h1>
            <div className="text-sm text-blue-200 mb-4">
              Last updated: {new Date().toLocaleString()}
            </div>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Discover, purchase, and manage software solutions from trusted partners.
              Join thousands of customers and partners in our thriving marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link to="/catalog" className="btn-primary bg-white text-blue-600 hover:bg-gray-100">
                  <Search className="h-5 w-5 mr-2" />
                  Browse Solutions
                </Link>
              ) : (
                <Link to="/login" className="btn-primary bg-white text-blue-600 hover:bg-gray-100">
                  Sign In to Browse
                </Link>
              )}
              {!isAuthenticated && (
                <Link to="/register" className="btn-outline border-white text-white hover:bg-white hover:text-blue-600">
                  Get Started Free
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <div className="card text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Discovery</h3>
            <p className="text-gray-600">
              Find the perfect software solutions with our advanced search and filtering capabilities.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payments</h3>
            <p className="text-gray-600">
              Safe and secure payment processing with support for cards, UPI, and other payment methods.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Partner Program</h3>
            <p className="text-gray-600">
              Join our partner program to sell your software solutions and reach new customers.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
            <p className="text-gray-600">
              Comprehensive analytics and reporting for partners to track performance and optimize sales.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Access</h3>
            <p className="text-gray-600">
              Get immediate access to purchased solutions with automated delivery and licensing.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Assurance</h3>
            <p className="text-gray-600">
              All solutions are reviewed and approved by our team to ensure quality and security.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-gray-600">Software Solutions</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">500+</div>
              <div className="text-gray-600">Trusted Partners</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">10K+</div>
              <div className="text-gray-600">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            {isAuthenticated
              ? `Welcome back, ${user?.profile.name || user?.email}! Explore our latest solutions.`
              : 'Join thousands of customers and partners in our marketplace today.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <Link to="/catalog" className="btn-primary bg-white text-blue-600 hover:bg-gray-100">
                  Browse Solutions
                </Link>
                {user?.role === 'customer' && (
                  <Link to="/partners" className="btn-outline border-white text-white hover:bg-white hover:text-blue-600">
                    Become a Partner
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="btn-primary bg-white text-blue-600 hover:bg-gray-100">
                  Sign In to Browse
                </Link>
                <Link to="/register" className="btn-outline border-white text-white hover:bg-white hover:text-blue-600">
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}