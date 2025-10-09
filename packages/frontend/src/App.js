import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CatalogPage } from './pages/CatalogPage';
import { SolutionDetailPage } from './pages/SolutionDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { PartnerApplication } from './pages/PartnerApplication';
import { AddSolution } from './pages/AddSolution';
import { PartnerAnalytics } from './pages/PartnerAnalytics';
import { AuthCallback } from './components/AuthCallback';
import { ProtectedRoute } from './components/ProtectedRoute';
function App() {
    return (_jsx(AuthProvider, { children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/catalog", element: _jsx(CatalogPage, {}) }), _jsx(Route, { path: "/solutions/:id", element: _jsx(SolutionDetailPage, {}) }), _jsx(Route, { path: "/partners", element: _jsx(PartnerApplication, {}) }), _jsx(Route, { path: "/auth/callback", element: _jsx(AuthCallback, {}) }), _jsx(Route, { path: "/profile", element: _jsx(ProtectedRoute, { children: _jsx(ProfilePage, {}) }) }), _jsx(Route, { path: "/partner/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(PartnerDashboard, {}) }) }), _jsx(Route, { path: "/partner/solutions/add", element: _jsx(ProtectedRoute, { children: _jsx(AddSolution, {}) }) }), _jsx(Route, { path: "/partner/analytics", element: _jsx(ProtectedRoute, { children: _jsx(PartnerAnalytics, {}) }) })] }) }) }));
}
export default App;
