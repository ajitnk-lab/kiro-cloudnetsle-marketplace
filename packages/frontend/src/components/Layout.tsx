import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { User, LogOut, ShoppingBag, Search } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Marketplace</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/catalog"
                className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Browse Solutions</span>
              </Link>
              
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
                  Admin Dashboard
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
                    <span className="hidden sm:inline">{user?.profile.name || user?.email}</span>
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
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
                <li>
                  <Link to="/partners" className="text-gray-600 hover:text-gray-900">
                    Become a Partner
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
                <li>
                  <Link to="/blog" className="text-gray-600 hover:text-gray-900">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-600">
              © 2024 Marketplace Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}