import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Users, Package, CheckCircle, XCircle } from 'lucide-react';
import { authService } from '../services/auth';
export function AdminDashboard() {
    const [pendingApplications, setPendingApplications] = useState([]);
    const [pendingSolutions, setPendingSolutions] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadAdminData();
    }, []);
    const loadAdminData = async () => {
        try {
            setLoading(true);
            const token = authService.getToken();
            if (!token) {
                console.error('No auth token found');
                return;
            }
            console.log('Loading admin data with token:', token ? 'present' : 'missing');
            // Load pending partner applications and solutions
            const [applicationsRes, solutionsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/admin/applications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${import.meta.env.VITE_API_URL}/admin/solutions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            console.log('Applications response:', applicationsRes.status);
            console.log('Solutions response:', solutionsRes.status);
            if (applicationsRes.ok) {
                const applications = await applicationsRes.json();
                console.log('Applications data:', applications);
                setPendingApplications(applications.applications || []);
            }
            else {
                console.error('Failed to load applications:', applicationsRes.status, await applicationsRes.text());
            }
            if (solutionsRes.ok) {
                const solutions = await solutionsRes.json();
                console.log('Solutions data:', solutions);
                setPendingSolutions(solutions.solutions || []);
            }
            else {
                console.error('Failed to load solutions:', solutionsRes.status, await solutionsRes.text());
            }
        }
        catch (error) {
            console.error('Failed to load admin data:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleApplicationAction = async (applicationId, action) => {
        try {
            const token = authService.getToken();
            if (!token) {
                console.error('No auth token found');
                return;
            }
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/applications/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action })
            });
            if (response.ok) {
                loadAdminData();
            }
            else {
                console.error('Failed to update application:', response.status, await response.text());
            }
        }
        catch (error) {
            console.error('Failed to update application:', error);
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
                loadAdminData();
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
        return _jsx("div", { className: "max-w-7xl mx-auto px-4 py-8", children: "Loading..." });
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-8", children: "Admin Dashboard" }), _jsxs("div", { className: "mb-8", children: [_jsxs("h2", { className: "text-2xl font-semibold mb-4 flex items-center", children: [_jsx(Users, { className: "h-6 w-6 mr-2" }), "Pending Partner Applications (", pendingApplications.length, ")"] }), pendingApplications.length === 0 ? (_jsx("p", { className: "text-gray-600", children: "No pending applications" })) : (_jsx("div", { className: "bg-white rounded-lg shadow overflow-hidden", children: _jsxs("table", { className: "min-w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Company" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Email" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Date" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: pendingApplications.map((app) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: app.companyName }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: app.email }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: new Date(app.createdAt).toLocaleDateString() }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsx("button", { onClick: () => handleApplicationAction(app.applicationId, 'approve'), className: "text-green-600 hover:text-green-900 mr-4", children: _jsx(CheckCircle, { className: "h-5 w-5" }) }), _jsx("button", { onClick: () => handleApplicationAction(app.applicationId, 'reject'), className: "text-red-600 hover:text-red-900", children: _jsx(XCircle, { className: "h-5 w-5" }) })] })] }, app.applicationId))) })] }) }))] }), _jsxs("div", { children: [_jsxs("h2", { className: "text-2xl font-semibold mb-4 flex items-center", children: [_jsx(Package, { className: "h-6 w-6 mr-2" }), "Pending Solutions (", pendingSolutions.length, ")"] }), pendingSolutions.length === 0 ? (_jsx("p", { className: "text-gray-600", children: "No pending solutions" })) : (_jsx("div", { className: "bg-white rounded-lg shadow overflow-hidden", children: _jsxs("table", { className: "min-w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Solution" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Partner" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Category" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Price" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: pendingSolutions.map((solution) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap font-medium", children: solution.name }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: solution.partnerName }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: solution.category }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: ["$", solution.pricing?.amount] }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsx("button", { onClick: () => handleSolutionAction(solution.solutionId, 'approve'), className: "text-green-600 hover:text-green-900 mr-4", children: _jsx(CheckCircle, { className: "h-5 w-5" }) }), _jsx("button", { onClick: () => handleSolutionAction(solution.solutionId, 'reject'), className: "text-red-600 hover:text-red-900", children: _jsx(XCircle, { className: "h-5 w-5" }) })] })] }, solution.solutionId))) })] }) }))] })] }));
}
