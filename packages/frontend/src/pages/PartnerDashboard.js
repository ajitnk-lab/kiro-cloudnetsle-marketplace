import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { partnerService } from '../services/partner';
import { Plus, Package, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
export function PartnerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [solutions, setSolutions] = useState([]);
    const [stats, setStats] = useState({
        totalSolutions: 0,
        totalSales: 0,
        totalRevenue: 0,
        pendingApprovals: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Debug user role
    console.log('Partner Dashboard - User:', user);
    useEffect(() => {
        loadDashboardData();
    }, []);
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [solutionsData] = await Promise.all([
                partnerService.getSolutions()
            ]);
            setSolutions(solutionsData.solutions || []);
            setStats({
                totalSolutions: solutionsData.solutions?.length || 0,
                totalSales: solutionsData.totalSales || 0,
                totalRevenue: solutionsData.totalRevenue || 0,
                pendingApprovals: solutionsData.solutions?.filter((s) => s.status === 'pending').length || 0
            });
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleAddSolution = () => {
        navigate('/partner/solutions/add');
    };
    const handleViewAnalytics = () => {
        navigate('/partner/analytics');
    };
    if (loading) {
        return (_jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: _jsx("div", { className: "text-center", children: "Loading..." }) }));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Partner Dashboard" }), _jsx("p", { className: "text-gray-600 mt-2", children: "Manage your solutions and track performance" })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-md p-4 mb-6", children: _jsx("p", { className: "text-red-600", children: error }) })), _jsxs("div", { className: "flex flex-wrap gap-4 mb-8", children: [_jsxs("button", { onClick: handleAddSolution, className: "btn-primary flex items-center space-x-2", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { children: "Add Solution" })] }), _jsxs("button", { onClick: handleViewAnalytics, className: "btn-outline flex items-center space-x-2", children: [_jsx(BarChart3, { className: "h-4 w-4" }), _jsx("span", { children: "View Analytics" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8", children: [_jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Package, { className: "h-8 w-8 text-blue-600" }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Solutions" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.totalSolutions })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx(TrendingUp, { className: "h-8 w-8 text-green-600" }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Total Sales" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.totalSales })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx(DollarSign, { className: "h-8 w-8 text-yellow-600" }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Revenue" }), _jsxs("p", { className: "text-2xl font-bold text-gray-900", children: ["\u20B9", stats.totalRevenue] })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Package, { className: "h-8 w-8 text-orange-600" }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "Pending" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.pendingApprovals })] })] }) })] }), _jsx("div", { className: "bg-white rounded-lg shadow", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Your Solutions" }), _jsxs("button", { onClick: handleAddSolution, className: "btn-primary flex items-center space-x-2", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { children: "Add Solution" })] })] }), solutions.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(Package, { className: "h-12 w-12 text-gray-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "No solutions yet" }), _jsx("p", { className: "text-gray-500 mb-6", children: "Start by adding your first solution to the marketplace!" }), _jsxs("button", { onClick: handleAddSolution, className: "btn-primary flex items-center space-x-2 mx-auto", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { children: "Add Your First Solution" })] })] })) : (_jsx("div", { className: "space-y-4", children: solutions.map((solution) => (_jsx("div", { className: "border rounded-lg p-4", children: _jsx("div", { className: "flex justify-between items-start", children: _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: solution.title }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: solution.description }), _jsxs("div", { className: "flex items-center space-x-4 mt-2", children: [_jsxs("span", { className: "text-sm text-gray-500", children: ["Price: \u20B9", solution.price] }), _jsx("span", { className: `text-sm px-2 py-1 rounded-full ${solution.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                            solution.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'}`, children: solution.status })] })] }) }) }, solution.id))) }))] }) })] }));
}
