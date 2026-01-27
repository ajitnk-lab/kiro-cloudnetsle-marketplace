import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { User, LogOut, Search, Briefcase, Phone, Mail } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative z-50">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
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

            {/* Contact Info & User Menu */}
            <div className="flex items-center space-x-6">
              {/* Contact Info - Highlighted */}
              <div className="hidden lg:flex items-center space-x-5 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-2 rounded-lg border border-blue-200">
                <a 
                  href="tel:+13465765655" 
                  className="flex items-center space-x-2 text-blue-700 hover:text-blue-900 transition-colors font-medium group"
                >
                  <Phone className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">+1 (346) 576-5655</span>
                </a>
                <div className="h-6 w-px bg-blue-300"></div>
                <a 
                  href="mailto:sales@cloudnestle.com" 
                  className="flex items-center space-x-2 text-blue-700 hover:text-blue-900 transition-colors font-medium group"
                >
                  <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">sales@cloudnestle.com</span>
                </a>
              </div>

              {/* User Menu */}
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
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                  <h3 className="text-base font-semibold text-gray-900">
                    CloudNestle Consulting & Services
                  </h3>
                  
                  <div className="text-sm space-y-2">
                    <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                      <p className="font-semibold text-blue-900 mb-1 text-xs">🇺🇸 US Sales & Support</p>
                      <p className="mb-0.5 text-xs">
                        <a href="tel:+13465765655" className="text-blue-700 hover:text-blue-900 font-medium">
                          +1 (346) 576-5655
                        </a>
                      </p>
                      <p className="text-gray-700 text-xs">
                        <a href="mailto:sales@cloudnestle.com" className="text-blue-600 hover:text-blue-800">
                          sales@cloudnestle.com
                        </a>
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                      <p className="font-semibold text-green-900 mb-1 text-xs">📍 Global Headquarters</p>
                      <p className="mb-0.5 text-xs">
                        <a href="tel:+919591040061" className="text-green-700 hover:text-green-900 font-medium">
                          🇮🇳 +91 95910 40061
                        </a>
                      </p>
                      <p className="text-gray-700 leading-relaxed text-xs">
                        Ground floor, #85, 2nd Cross Road,<br />
                        Central Excise Layout, Vijay Nagar,<br />
                        Bangalore 560040, India
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-800 mb-1 text-xs">🏢 Legal & Compliance</p>
                      <div className="flex flex-wrap gap-1.5">
                        {/* GST Verified Badge */}
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 border border-green-300">
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-xs font-semibold text-green-700">GST Verified</span>
                        </div>
                        
                        {/* MSME Badge */}
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 border border-blue-300">
                          <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-xs font-semibold text-blue-700">MSME Registered</span>
                        </div>
                        
                        {/* IEC Global Badge */}
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 border border-purple-300">
                          <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-xs font-semibold text-purple-700">Global Merchant</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-xs mt-2">
                        <p className="text-gray-600">GSTIN: <span className="font-mono font-semibold text-gray-800">29ADWPA6289Q1ZB</span></p>
                        <p className="text-gray-600">MSME: <span className="font-mono font-semibold text-gray-800">UDYAM-KR-03-0608400</span></p>
                        <p className="text-gray-600">IEC: <span className="font-mono font-semibold text-gray-800">ADWPA6289Q</span></p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-800 mb-0.5 text-xs">Grievance Officer</p>
                      <a 
                        href="mailto:grievanceofficer@cloudnestle.com"
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        grievanceofficer@cloudnestle.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm">
              © 2025 CloudNestle Consulting & Services. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}