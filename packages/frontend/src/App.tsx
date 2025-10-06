import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { CatalogPage } from './pages/CatalogPage'
import { SolutionDetailPage } from './pages/SolutionDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { PartnerDashboardPage } from './pages/PartnerDashboardPage'
import { PartnerApplicationPage } from './pages/PartnerApplicationPage'
import { SolutionManagementPage } from './pages/SolutionManagementPage'
import CheckoutPage from './pages/CheckoutPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import DashboardPage from './pages/DashboardPage'
import { AuthCallback } from './components/AuthCallback'
import { ProtectedRoute } from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Layout>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/solutions/:id" element={<SolutionDetailPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/checkout/:solutionId"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/dashboard"
            element={
              <ProtectedRoute requiredRole="partner">
                <PartnerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/application"
            element={
              <ProtectedRoute requiredRole="partner">
                <PartnerApplicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/solutions"
            element={
              <ProtectedRoute requiredRole="partner">
                <SolutionManagementPage />
              </ProtectedRoute>
            }
          />
          </Routes>
          </Layout>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App