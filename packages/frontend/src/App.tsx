import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { CatalogPage } from './pages/CatalogPage'
import { SolutionDetailPage } from './pages/SolutionDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { PartnerDashboard } from './pages/PartnerDashboard'
import { PartnerApplication } from './pages/PartnerApplication'
import { AddSolution } from './pages/AddSolution'
import { PartnerAnalytics } from './pages/PartnerAnalytics'
import { AuthCallback } from './components/AuthCallback'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminDashboard } from './pages/AdminDashboard'
import { FounderDashboard } from './pages/FounderDashboard'
import { PaymentSuccess } from './pages/PaymentSuccess'
import { HelpCenter } from './pages/HelpCenter'
import { ContactUs } from './pages/ContactUs'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import UpgradePage from './pages/UpgradePage'
import { TermsOfService } from './pages/TermsOfService'
import { AboutUs } from './pages/AboutUs'
import { Blog } from './pages/Blog'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/founder-dashboard" element={<FounderDashboard />} />
          <Route path="/solutions/:id" element={<SolutionDetailPage />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/partners" element={
            <ProtectedRoute>
              <PartnerApplication />
            </ProtectedRoute>
          } />
          <Route path="/partner/application" element={
            <ProtectedRoute>
              <PartnerApplication />
            </ProtectedRoute>
          } />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/dashboard"
            element={
              <ProtectedRoute>
                <PartnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/solutions/add"
            element={
              <ProtectedRoute>
                <AddSolution />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner/analytics"
            element={
              <ProtectedRoute>
                <PartnerAnalytics />
              </ProtectedRoute>
            }
          />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/blog" element={<Blog />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App
