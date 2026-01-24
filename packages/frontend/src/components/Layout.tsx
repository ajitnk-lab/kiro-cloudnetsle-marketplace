import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { User, LogOut, Search, Briefcase } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Top Contact Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-10 text-sm space-x-6">
            <a href="tel:+13465765655" className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
              <span className="mr-1">🇺🇸</span>
              <span>+1 (346) 576-5655</span>
            </a>
            <a href="mailto:sales@cloudnestle.com" className="text-gray-600 hover:text-blue-600 transition-colors">
              sales@cloudnestle.com
            </a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative z-50">
        <div className="max-w-7xl mx-auto pl-0 pr-4 sm:pr-6 lg:pr-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src="/cloudnestle-logo.png" 
                alt="CloudNestle" 
                className="h-32 w-32 object-contain"
              />
              <span className="text-xl font-bold text-gray-900">Marketplace</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {/* CloudNestle link hidden for payment gateway compliance */}
              <Link
                to="/catalog"
                className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Browse Solutions</span>
              </Link>
              
              {user?.role === 'partner' && user?.marketplaceStatus !== 'approved' && (
                <Link
                  to="/partners"
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Apply for Marketplace</span>
                </Link>
              )}
              
              {user?.role === 'partner' && (
                <Link
                  to="/partner/dashboard"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Partner Dashboard
                </Link>
              )}
              
              {user?.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  📊 Admin Dashboard
                </Link>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.profile?.name?.replace(/ Name$/, '') || user?.email}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="btn-outline">
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Platform
              </h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link to="/catalog" className="text-gray-600 hover:text-gray-900">
                    Browse Solutions
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Support
              </h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link to="/help" className="text-gray-600 hover:text-gray-900">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-600 hover:text-gray-900">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Legal
              </h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link to="/privacy" className="text-gray-600 hover:text-gray-900">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-600 hover:text-gray-900">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Company
              </h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link to="/about" className="text-gray-600 hover:text-gray-900">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Info Section */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4">
                <img 
                  src="/cloudnestle-logo.png" 
                  alt="CloudNestle Logo" 
                  className="h-32 w-32 object-contain flex-shrink-0"
                />
                <div className="flex flex-col space-y-2">
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">
                    CloudNestle Consulting<br />& Services
                  </h3>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">🇺🇸 US Sales & Support:</p>
                      <p>
                        <span className="font-medium">Sales:</span>{' '}
                        <a href="mailto:sales@cloudnestle.com" className="text-blue-600 hover:text-blue-800">
                          sales@cloudnestle.com
                        </a>
                      </p>
                      <p>
                        <span className="font-medium">Support:</span>{' '}
                        <a href="mailto:support@cloudnestle.com" className="text-blue-600 hover:text-blue-800">
                          support@cloudnestle.com
                        </a>
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">📍 Global Headquarters:</p>
                      <p className="leading-relaxed">
                        🇮🇳 Ground floor, #85, 2nd Cross Road,<br />
                        Central Excise Layout, Vijay Nagar,<br />
                        Bangalore 560040, India
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-gray-700">🏢 GSTIN: 29ADWPA6289Q1ZB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm">
              © 2025 CloudNestle Consulting & Services. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}