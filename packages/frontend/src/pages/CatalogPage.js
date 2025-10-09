import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, Package, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
export function CatalogPage() {
    const { user } = useAuth();
    const [solutions, setSolutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSolution, setSelectedSolution] = useState(null);
    const isAdmin = user?.role === 'admin';
    useEffect(() => {
        loadSolutions();
    }, []);
    const loadSolutions = async () => {
        try {
            setLoading(true);
            // Customers see approved solutions, admin sees all solutions
            const endpoint = isAdmin ? '/admin/solutions' : '/catalog';
            const headers = {};
            if (isAdmin) {
                const token = authService.getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            console.log('Loading solutions from:', endpoint, 'with auth:', !!headers.Authorization);
            const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
                headers
            });
            console.log('Response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('Solutions data:', data);
                setSolutions(data.solutions || []);
            }
            else {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                setError(`Failed to load solutions: ${response.status}`);
            }
        }
        catch (error) {
            console.error('Network error:', error);
            setError('Network error loading solutions');
        }
        finally {
            setLoading(false);
        }
    };
    const handleSolutionAction = async (solutionId, action) => {
        try {
            const token = authService.getToken();
            if (!token) {
                console.error('No auth token found');
                return;
            }
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/solutions/${solutionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action })
            });
            if (response.ok) {
                loadSolutions(); // Reload solutions after action
                setSelectedSolution(null); // Close modal
            }
            else {
                console.error('Failed to update solution:', response.status, await response.text());
            }
        }
        catch (error) {
            console.error('Failed to update solution:', error);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: _jsxs("div", { className: "text-center py-16", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" }), _jsx("p", { className: "mt-4 text-gray-600", children: "Loading solutions..." })] }) }));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-4", children: "Solution Catalog" }), _jsx("p", { className: "text-gray-600", children: "Discover software solutions from our trusted partners" })] }), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8", children: _jsxs("div", { className: "flex flex-col lg:flex-row gap-4", children: [_jsx("div", { className: "flex-1", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Search solutions...", className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }) }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { className: "btn-outline", children: [_jsx(Filter, { className: "h-4 w-4 mr-2" }), "Filters"] }), _jsx("button", { className: "btn-outline", children: _jsx(Grid, { className: "h-4 w-4" }) }), _jsx("button", { className: "btn-outline", children: _jsx(List, { className: "h-4 w-4" }) })] })] }) }), error ? (_jsx("div", { className: "text-center py-16", children: _jsxs("div", { className: "max-w-md mx-auto", children: [_jsx("div", { className: "w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx(Package, { className: "h-8 w-8 text-red-600" }) }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-2", children: "Error Loading Solutions" }), _jsx("p", { className: "text-gray-600 mb-6", children: error }), _jsx("button", { onClick: loadSolutions, className: "btn-primary", children: "Try Again" })] }) })) : solutions.length === 0 ? (_jsx("div", { className: "text-center py-16", children: _jsxs("div", { className: "max-w-md mx-auto", children: [_jsx("div", { className: "w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx(Package, { className: "h-8 w-8 text-gray-400" }) }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-2", children: "No Solutions Available" }), _jsx("p", { className: "text-gray-600 mb-6", children: "There are currently no approved solutions in the catalog. Check back soon!" })] }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: solutions.map((solution) => (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: solution.name }), isAdmin && solution.status && (_jsx("span", { className: `px-2 py-1 text-xs rounded-full ${solution.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                solution.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'}`, children: solution.status }))] }), _jsx("p", { className: "text-sm text-gray-600 mb-2", children: solution.category }), _jsx("p", { className: "text-gray-700 text-sm line-clamp-3", children: solution.description })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-lg font-bold text-green-600", children: [solution.pricing.currency, " ", solution.pricing.amount, solution.pricing.model === 'subscription' && _jsx("span", { className: "text-sm font-normal", children: "/month" })] }), _jsx("button", { onClick: () => setSelectedSolution(solution), className: "btn-primary text-sm", children: "View Details" })] }), solution.partnerName && (_jsx("div", { className: "mt-3 pt-3 border-t border-gray-100", children: _jsxs("p", { className: "text-xs text-gray-500", children: ["by ", solution.partnerName] }) }))] }, solution.solutionId))) })), selectedSolution && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsx("div", { className: "bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900", children: selectedSolution.name }), _jsx("button", { onClick: () => setSelectedSolution(null), className: "text-gray-400 hover:text-gray-600", children: "\u2715" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Category" }), _jsx("p", { className: "text-gray-700", children: selectedSolution.category })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Description" }), _jsx("p", { className: "text-gray-700", children: selectedSolution.description })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Pricing" }), _jsxs("p", { className: "text-gray-700", children: [selectedSolution.pricing.currency, " ", selectedSolution.pricing.amount, selectedSolution.pricing.model === 'subscription' && ' per month', selectedSolution.pricing.model === 'upfront' && ' one-time'] })] }), selectedSolution.partnerName && (_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Partner" }), _jsx("p", { className: "text-gray-700", children: selectedSolution.partnerName })] })), isAdmin && selectedSolution.status && (_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Status" }), _jsx("span", { className: `px-3 py-1 text-sm rounded-full ${selectedSolution.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    selectedSolution.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'}`, children: selectedSolution.status })] }))] }), _jsxs("div", { className: "flex gap-3 mt-6 pt-6 border-t border-gray-200", children: [isAdmin && selectedSolution.status === 'pending' ? (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleSolutionAction(selectedSolution.solutionId, 'approve'), className: "flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700", children: [_jsx(CheckCircle, { className: "h-4 w-4" }), "Approve"] }), _jsxs("button", { onClick: () => handleSolutionAction(selectedSolution.solutionId, 'reject'), className: "flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700", children: [_jsx(XCircle, { className: "h-4 w-4" }), "Reject"] })] })) : (_jsx("button", { className: "btn-primary", children: selectedSolution.status === 'approved' ? 'Purchase' : 'Contact Partner' })), _jsx("button", { onClick: () => setSelectedSolution(null), className: "btn-outline", children: "Close" })] })] }) }) }))] }));
}
