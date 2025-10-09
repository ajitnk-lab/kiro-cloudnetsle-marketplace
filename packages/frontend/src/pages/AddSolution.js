import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { partnerService } from '../services/partner';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, AlertCircle } from 'lucide-react';
export function AddSolution() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [partnerStatus, setPartnerStatus] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        pricing: {
            model: 'upfront',
            amount: '',
            currency: 'INR',
            billingCycle: 'month'
        },
        features: [''],
        requirements: {
            system: '',
            users: '',
            storage: ''
        },
        tags: ['']
    });
    useEffect(() => {
        checkPartnerStatus();
    }, []);
    const checkPartnerStatus = async () => {
        try {
            setCheckingStatus(true);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${await user?.getIdToken()}`
                }
            });
            const data = await response.json();
            setPartnerStatus(data.user?.partnerStatus || null);
        }
        catch (error) {
            console.error('Failed to check partner status:', error);
            setError('Failed to verify partner status');
        }
        finally {
            setCheckingStatus(false);
        }
    };
    const categories = [
        'Business Software',
        'Developer Tools',
        'Analytics',
        'E-commerce',
        'Productivity',
        'Security',
        'Marketing',
        'Finance'
    ];
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Clean up empty features and tags
            const cleanData = {
                ...formData,
                features: formData.features.filter(f => f.trim()),
                tags: formData.tags.filter(t => t.trim()),
                pricing: {
                    ...formData.pricing,
                    amount: parseInt(formData.pricing.amount)
                }
            };
            await partnerService.createSolution(cleanData);
            navigate('/partner/dashboard');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const addFeature = () => {
        setFormData(prev => ({
            ...prev,
            features: [...prev.features, '']
        }));
    };
    const updateFeature = (index, value) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? value : f)
        }));
    };
    const removeFeature = (index) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };
    const addTag = () => {
        setFormData(prev => ({
            ...prev,
            tags: [...prev.tags, '']
        }));
    };
    const updateTag = (index, value) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.map((t, i) => i === index ? value : t)
        }));
    };
    const removeTag = (index) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== index)
        }));
    };
    return (_jsxs("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("button", { onClick: () => navigate('/partner/dashboard'), className: "flex items-center text-gray-600 hover:text-gray-900 mb-4", children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), "Back to Dashboard"] }), _jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Add New Solution" }), _jsx("p", { className: "text-gray-600 mt-2", children: "Create a new software solution for the marketplace" })] }), checkingStatus && (_jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-md p-4 mb-6", children: _jsx("p", { className: "text-blue-600", children: "Checking partner status..." }) })), !checkingStatus && partnerStatus !== 'approved' && (_jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx(AlertCircle, { className: "h-5 w-5 text-yellow-600 mr-2" }), _jsxs("div", { children: [_jsx("h3", { className: "text-yellow-800 font-medium", children: "Partner Approval Required" }), _jsx("p", { className: "text-yellow-700 mt-1", children: partnerStatus === 'pending'
                                        ? 'Your partner application is pending admin approval. You cannot create solutions until approved.'
                                        : partnerStatus === 'rejected'
                                            ? 'Your partner application was rejected. Please contact support.'
                                            : 'You must apply for partner status before creating solutions.' }), !partnerStatus && (_jsx("button", { onClick: () => navigate('/partner/application'), className: "mt-2 text-yellow-800 underline hover:text-yellow-900", children: "Apply for Partner Status" }))] })] }) })), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-md p-4 mb-6", children: _jsx("p", { className: "text-red-600", children: error }) })), !checkingStatus && partnerStatus === 'approved' && (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-8", children: [_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Basic Information" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Solution Name *" }), _jsx("input", { type: "text", required: true, value: formData.name, onChange: (e) => setFormData(prev => ({ ...prev, name: e.target.value })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "Enter solution name" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Category *" }), _jsxs("select", { required: true, value: formData.category, onChange: (e) => setFormData(prev => ({ ...prev, category: e.target.value })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "Select category" }), categories.map(cat => (_jsx("option", { value: cat, children: cat }, cat)))] })] })] }), _jsxs("div", { className: "mt-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Description *" }), _jsx("textarea", { required: true, rows: 4, value: formData.description, onChange: (e) => setFormData(prev => ({ ...prev, description: e.target.value })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "Describe your solution..." })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Pricing" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Pricing Model *" }), _jsxs("select", { value: formData.pricing.model, onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    pricing: { ...prev.pricing, model: e.target.value }
                                                })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "upfront", children: "One-time Payment" }), _jsx("option", { value: "subscription", children: "Subscription" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Price (INR) *" }), _jsx("input", { type: "number", required: true, value: formData.pricing.amount, onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    pricing: { ...prev.pricing, amount: e.target.value }
                                                })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "0" })] }), formData.pricing.model === 'subscription' && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Billing Cycle" }), _jsxs("select", { value: formData.pricing.billingCycle, onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    pricing: { ...prev.pricing, billingCycle: e.target.value }
                                                })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "month", children: "Monthly" }), _jsx("option", { value: "year", children: "Yearly" })] })] }))] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Features" }), formData.features.map((feature, index) => (_jsxs("div", { className: "flex gap-2 mb-3", children: [_jsx("input", { type: "text", value: feature, onChange: (e) => updateFeature(index, e.target.value), className: "flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "Enter feature" }), formData.features.length > 1 && (_jsx("button", { type: "button", onClick: () => removeFeature(index), className: "px-3 py-2 text-red-600 hover:text-red-800", children: "Remove" }))] }, index))), _jsx("button", { type: "button", onClick: addFeature, className: "text-blue-600 hover:text-blue-800 text-sm", children: "+ Add Feature" })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Requirements" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "System Requirements" }), _jsx("input", { type: "text", value: formData.requirements.system, onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    requirements: { ...prev.requirements, system: e.target.value }
                                                })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "e.g., Windows 10+, macOS 10.15+, or web browser" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "User Requirements" }), _jsx("input", { type: "text", value: formData.requirements.users, onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    requirements: { ...prev.requirements, users: e.target.value }
                                                })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "e.g., Up to 50 users included" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Storage Requirements" }), _jsx("input", { type: "text", value: formData.requirements.storage, onChange: (e) => setFormData(prev => ({
                                                    ...prev,
                                                    requirements: { ...prev.requirements, storage: e.target.value }
                                                })), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "e.g., Cloud-based storage included" })] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Tags" }), formData.tags.map((tag, index) => (_jsxs("div", { className: "flex gap-2 mb-3", children: [_jsx("input", { type: "text", value: tag, onChange: (e) => updateTag(index, e.target.value), className: "flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", placeholder: "Enter tag" }), formData.tags.length > 1 && (_jsx("button", { type: "button", onClick: () => removeTag(index), className: "px-3 py-2 text-red-600 hover:text-red-800", children: "Remove" }))] }, index))), _jsx("button", { type: "button", onClick: addTag, className: "text-blue-600 hover:text-blue-800 text-sm", children: "+ Add Tag" })] }), _jsxs("div", { className: "flex justify-end space-x-4", children: [_jsx("button", { type: "button", onClick: () => navigate('/partner/dashboard'), className: "btn-outline", children: "Cancel" }), _jsx("button", { type: "submit", disabled: loading, className: "btn-primary", children: loading ? 'Creating...' : 'Create Solution' })] })] }))] }));
}
