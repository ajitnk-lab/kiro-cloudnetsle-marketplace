import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/auth';
const AuthContext = createContext(undefined);
const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};
function authReducer(state, action) {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: !!action.payload,
                isLoading: false,
                error: null,
            };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        case 'LOGOUT':
            return { ...initialState, isLoading: false };
        default:
            return state;
    }
}
export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);
    // Initialize auth state on app load
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = authService.getToken();
                const storedUser = authService.getStoredUser();
                if (token && storedUser) {
                    // Verify token is still valid by fetching current user
                    const user = await authService.getCurrentUser();
                    dispatch({ type: 'SET_USER', payload: user });
                }
                else {
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
            catch (error) {
                console.error('Auth initialization error:', error);
                // Clear invalid token/user
                authService.logout();
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        initializeAuth();
    }, []);
    const login = async (credentials) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            const { user, token } = await authService.login(credentials);
            authService.setToken(token);
            authService.setStoredUser(user);
            // Small delay to ensure token is properly set
            await new Promise(resolve => setTimeout(resolve, 100));
            dispatch({ type: 'SET_USER', payload: user });
        }
        catch (error) {
            const message = error.response?.data?.error || 'Login failed';
            dispatch({ type: 'SET_ERROR', payload: message });
            throw error;
        }
    };
    const register = async (data) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            const result = await authService.register(data);
            // Don't set user as authenticated until email is verified
            dispatch({ type: 'SET_LOADING', payload: false });
            return { needsVerification: true, email: data.email };
        }
        catch (error) {
            const message = error.message || 'Registration failed';
            dispatch({ type: 'SET_ERROR', payload: message });
            throw error;
        }
    };
    const confirmRegistration = async (email, code) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            await authService.confirmRegistration(email, code);
            // After confirmation, user needs to login
            dispatch({ type: 'SET_LOADING', payload: false });
        }
        catch (error) {
            const message = error.message || 'Verification failed';
            dispatch({ type: 'SET_ERROR', payload: message });
            throw error;
        }
    };
    const logout = () => {
        authService.logout();
        dispatch({ type: 'LOGOUT' });
    };
    const updateProfile = async (profile) => {
        try {
            const updatedUser = await authService.updateProfile(profile);
            authService.setStoredUser(updatedUser);
            dispatch({ type: 'SET_USER', payload: updatedUser });
        }
        catch (error) {
            const message = error.response?.data?.error || 'Profile update failed';
            dispatch({ type: 'SET_ERROR', payload: message });
            throw error;
        }
    };
    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };
    const value = {
        ...state,
        login,
        register,
        confirmRegistration,
        logout,
        updateProfile,
        clearError,
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
