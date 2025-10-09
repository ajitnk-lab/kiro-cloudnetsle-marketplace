import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { partnerService } from '../services/partner';
export function PartnerApplication() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        company: '',
        website: '',
        description: '',
        experience: '',
        portfolio: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await partnerService.submitApplication(formData);
            setSuccess(true);
        }
        catch (err) {
            setError(err.message || 'Failed to submit application');
        }
        finally {
            setLoading(false);
        }
    };
    if (success) {
        return (_jsx("div", { className: "max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-8 text-center", children: [_jsx("div", { className: "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx("svg", { className: "w-8 h-8 text-green-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Application Submitted!" }), _jsx("p", { className: "text-gray-600 mb-6", children: "Thank you for your interest in becoming a partner. We'll review your application and get back to you within 2-3 business days." }), _jsx("button", { onClick: () => window.location.href = '/', className: "btn-primary", children: "Return to Home" })] }) }));
    }
    return (_jsx("div", { className: "max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-6", children: "Become a Partner" }), _jsx("p", { className: "text-gray-600 mb-8", children: "Join our marketplace as a solution provider and reach thousands of customers." }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-md p-4 mb-6", children: _jsx("p", { className: "text-red-600", children: error }) })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Company Name *" }), _jsx("input", { type: "text", value: formData.company, onChange: (e) => setFormData({ ...formData, company: e.target.value }), className: "input-field", required: true, disabled: loading })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Website URL" }), _jsx("input", { type: "url", value: formData.website, onChange: (e) => setFormData({ ...formData, website: e.target.value }), className: "input-field", placeholder: "https://yourcompany.com", disabled: loading })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Company Description *" }), _jsx("textarea", { value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), className: "input-field", rows: 4, required: true, disabled: loading, placeholder: "Tell us about your company and what solutions you provide" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Years of Experience *" }), _jsxs("select", { value: formData.experience, onChange: (e) => setFormData({ ...formData, experience: e.target.value }), className: "input-field", required: true, disabled: loading, children: [_jsx("option", { value: "", children: "Select experience" }), _jsx("option", { value: "1-2", children: "1-2 years" }), _jsx("option", { value: "3-5", children: "3-5 years" }), _jsx("option", { value: "6-10", children: "6-10 years" }), _jsx("option", { value: "10+", children: "10+ years" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Portfolio/Previous Work" }), _jsx("textarea", { value: formData.portfolio, onChange: (e) => setFormData({ ...formData, portfolio: e.target.value }), className: "input-field", rows: 3, placeholder: "Describe your previous projects and achievements", disabled: loading })] }), _jsx("button", { type: "submit", className: "btn-primary w-full", disabled: loading, children: loading ? 'Submitting...' : 'Submit Application' })] })] }) }));
}
