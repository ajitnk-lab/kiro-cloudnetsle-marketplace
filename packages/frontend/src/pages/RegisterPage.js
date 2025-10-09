import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    company: z.string().optional(),
    role: z.enum(['customer', 'partner']).default('customer'),
    agreeToTerms: z.boolean().refine((val) => val === true, {
        message: 'You must agree to the terms and conditions',
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
export function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const { register: registerUser, confirmRegistration, isLoading, error, clearError } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, watch, formState: { errors }, } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'customer',
        },
    });
    const watchedRole = watch('role');
    const watchedPassword = watch('password');
    const getPasswordStrength = (password) => {
        if (!password)
            return { score: 0, label: '', color: '' };
        let score = 0;
        if (password.length >= 8)
            score++;
        if (/[A-Z]/.test(password))
            score++;
        if (/[a-z]/.test(password))
            score++;
        if (/[0-9]/.test(password))
            score++;
        if (/[^A-Za-z0-9]/.test(password))
            score++;
        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
        return {
            score,
            label: labels[score - 1] || '',
            color: colors[score - 1] || 'bg-gray-300',
        };
    };
    const passwordStrength = getPasswordStrength(watchedPassword || '');
    const onSubmit = async (data) => {
        try {
            clearError();
            const { confirmPassword, agreeToTerms, ...registerData } = data;
            const result = await registerUser(registerData);
            if (result.needsVerification) {
                setUserEmail(result.email);
                setShowVerification(true);
            }
        }
        catch (error) {
            // Error is handled by the auth context
        }
    };
    const handleVerification = async (e) => {
        e.preventDefault();
        try {
            clearError();
            await confirmRegistration(userEmail, verificationCode);
            // Show success and redirect to login
            alert('Email verified successfully! Please login with your credentials.');
            navigate('/login');
        }
        catch (error) {
            // Error is handled by the auth context
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { children: [_jsx("h2", { className: "mt-6 text-center text-3xl font-bold text-gray-900", children: "Create your account" }), _jsxs("p", { className: "mt-2 text-center text-sm text-gray-600", children: ["Or", ' ', _jsx(Link, { to: "/login", className: "font-medium text-blue-600 hover:text-blue-500", children: "sign in to your existing account" })] })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "mb-6", children: _jsx(SocialLoginButtons, { mode: "register" }) }), _jsxs("div", { className: "relative mb-6", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("div", { className: "w-full border-t border-gray-300" }) }), _jsx("div", { className: "relative flex justify-center text-sm", children: _jsx("span", { className: "px-2 bg-white text-gray-500", children: "Or continue with email" }) })] }), error && (_jsxs("div", { className: "mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700", children: [_jsx(AlertCircle, { className: "h-4 w-4 flex-shrink-0" }), _jsx("span", { className: "text-sm", children: error })] })), showVerification ? (_jsxs("form", { onSubmit: handleVerification, className: "space-y-4", children: [_jsxs("div", { className: "text-center mb-4", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "Verify Your Email" }), _jsxs("p", { className: "text-sm text-gray-600 mt-2", children: ["We've sent a verification code to ", _jsx("strong", { children: userEmail })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "verificationCode", className: "block text-sm font-medium text-gray-700 mb-1", children: "Verification Code" }), _jsx("input", { id: "verificationCode", type: "text", value: verificationCode, onChange: (e) => setVerificationCode(e.target.value), className: "input", placeholder: "Enter 6-digit code", maxLength: 6, required: true })] }), _jsx("button", { type: "submit", disabled: isLoading || verificationCode.length !== 6, className: "btn btn-primary w-full", children: isLoading ? 'Verifying...' : 'Verify Email' }), _jsx("button", { type: "button", onClick: () => setShowVerification(false), className: "btn btn-secondary w-full", children: "Back to Registration" })] })) : (
                        /* Registration Form */
                        _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Account Type" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "relative", children: [_jsx("input", { ...register('role'), type: "radio", value: "customer", className: "sr-only" }), _jsxs("div", { className: `p-3 border rounded-lg cursor-pointer transition-colors ${watchedRole === 'customer'
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                                : 'border-gray-300 hover:border-gray-400'}`, children: [_jsx("div", { className: "text-sm font-medium", children: "Customer" }), _jsx("div", { className: "text-xs text-gray-500", children: "Buy solutions" })] })] }), _jsxs("label", { className: "relative", children: [_jsx("input", { ...register('role'), type: "radio", value: "partner", className: "sr-only" }), _jsxs("div", { className: `p-3 border rounded-lg cursor-pointer transition-colors ${watchedRole === 'partner'
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                                : 'border-gray-300 hover:border-gray-400'}`, children: [_jsx("div", { className: "text-sm font-medium", children: "Partner" }), _jsx("div", { className: "text-xs text-gray-500", children: "Sell solutions" })] })] })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-gray-700", children: "Full Name" }), _jsx("input", { ...register('name'), type: "text", autoComplete: "name", className: "mt-1 input-field", placeholder: "Enter your full name" }), errors.name && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.name.message }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700", children: "Email address" }), _jsx("input", { ...register('email'), type: "email", autoComplete: "email", className: "mt-1 input-field", placeholder: "Enter your email" }), errors.email && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.email.message }))] }), watchedRole === 'partner' && (_jsxs("div", { children: [_jsx("label", { htmlFor: "company", className: "block text-sm font-medium text-gray-700", children: "Company Name" }), _jsx("input", { ...register('company'), type: "text", autoComplete: "organization", className: "mt-1 input-field", placeholder: "Enter your company name" }), errors.company && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.company.message }))] })), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700", children: "Password" }), _jsxs("div", { className: "mt-1 relative", children: [_jsx("input", { ...register('password'), type: showPassword ? 'text' : 'password', autoComplete: "new-password", className: "input-field pr-10", placeholder: "Create a password" }), _jsx("button", { type: "button", className: "absolute inset-y-0 right-0 pr-3 flex items-center", onClick: () => setShowPassword(!showPassword), children: showPassword ? (_jsx(EyeOff, { className: "h-4 w-4 text-gray-400" })) : (_jsx(Eye, { className: "h-4 w-4 text-gray-400" })) })] }), watchedPassword && (_jsx("div", { className: "mt-2", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "flex-1 bg-gray-200 rounded-full h-2", children: _jsx("div", { className: `h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`, style: { width: `${(passwordStrength.score / 5) * 100}%` } }) }), _jsx("span", { className: "text-xs text-gray-600", children: passwordStrength.label })] }) })), errors.password && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.password.message }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirmPassword", className: "block text-sm font-medium text-gray-700", children: "Confirm Password" }), _jsxs("div", { className: "mt-1 relative", children: [_jsx("input", { ...register('confirmPassword'), type: showConfirmPassword ? 'text' : 'password', autoComplete: "new-password", className: "input-field pr-10", placeholder: "Confirm your password" }), _jsx("button", { type: "button", className: "absolute inset-y-0 right-0 pr-3 flex items-center", onClick: () => setShowConfirmPassword(!showConfirmPassword), children: showConfirmPassword ? (_jsx(EyeOff, { className: "h-4 w-4 text-gray-400" })) : (_jsx(Eye, { className: "h-4 w-4 text-gray-400" })) })] }), errors.confirmPassword && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.confirmPassword.message }))] }), _jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "flex items-center h-5", children: _jsx("input", { ...register('agreeToTerms'), type: "checkbox", className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" }) }), _jsxs("div", { className: "ml-3 text-sm", children: [_jsxs("label", { htmlFor: "agreeToTerms", className: "text-gray-700", children: ["I agree to the", ' ', _jsx(Link, { to: "/terms", className: "text-blue-600 hover:text-blue-500", children: "Terms and Conditions" }), ' ', "and", ' ', _jsx(Link, { to: "/privacy", className: "text-blue-600 hover:text-blue-500", children: "Privacy Policy" })] }), errors.agreeToTerms && (_jsx("p", { className: "mt-1 text-red-600", children: errors.agreeToTerms.message }))] })] }), _jsx("button", { type: "submit", disabled: isLoading, className: "w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed", children: isLoading ? 'Creating account...' : 'Create account' })] }))] })] }) }));
}
