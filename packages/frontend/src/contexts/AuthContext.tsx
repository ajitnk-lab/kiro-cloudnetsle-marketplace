import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { AuthState, User, LoginCredentials, RegisterData } from '../types/auth'
import { authService } from '../services/auth'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<{ needsVerification: boolean; email: string }>
  confirmRegistration: (email: string, code: string) => Promise<void>
  logout: () => void
  updateProfile: (profile: Partial<User['profile']>) => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' }

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null,
      }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'LOGOUT':
      return { ...initialState, isLoading: false }
    default:
      return state
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('🔍 AUTH DEBUG: AuthProvider rendering...')
  const [state, dispatch] = useReducer(authReducer, initialState)
  console.log('🔍 AUTH DEBUG: Initial state:', state)

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 AUTH DEBUG: Initializing auth context...')
        const token = authService.getToken()
        const storedUser = authService.getStoredUser()
        
        console.log('🔍 AUTH DEBUG: Token exists:', !!token)
        console.log('🔍 AUTH DEBUG: Stored user exists:', !!storedUser)
        console.log('🔍 AUTH DEBUG: Stored user:', storedUser)

        if (token && storedUser) {
          console.log('🔍 AUTH DEBUG: Setting user in context')
          // Use stored user data instead of fetching from API
          dispatch({ type: 'SET_USER', payload: storedUser })
        } else {
          console.log('🔍 AUTH DEBUG: No token or user, setting loading false')
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        console.error('🔍 AUTH DEBUG: Auth initialization error:', error)
        // Clear invalid token/user
        authService.logout()
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [])

  // Listen for localStorage changes to sync AuthContext
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('🔄 AUTH CONTEXT: Auth change event received')
      const token = authService.getToken()
      const storedUser = authService.getStoredUser()
      
      console.log('🔄 AUTH CONTEXT: Token exists:', !!token)
      console.log('🔄 AUTH CONTEXT: Stored user exists:', !!storedUser)
      console.log('🔄 AUTH CONTEXT: Stored user email:', storedUser?.email || 'null')
      
      if (token && storedUser) {
        console.log('🔄 AUTH CONTEXT: Syncing user from localStorage to context')
        dispatch({ type: 'SET_USER', payload: storedUser })
      } else {
        console.log('🔄 AUTH CONTEXT: No token/user, logging out context')
        dispatch({ type: 'LOGOUT' })
      }
    }

    console.log('🔄 AUTH CONTEXT: Adding auth-change event listener')
    window.addEventListener('auth-change', handleAuthChange)
    return () => {
      console.log('🔄 AUTH CONTEXT: Removing auth-change event listener')
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('🔐 AUTH CONTEXT: Starting login process')
      dispatch({ type: 'SET_LOADING', payload: true })
      const { user, token } = await authService.login(credentials)
      
      console.log('🔐 AUTH CONTEXT: Login successful, user:', user.email)
      console.log('🔐 AUTH CONTEXT: Token received:', !!token)
      
      authService.setToken(token)
      authService.setStoredUser(user)
      
      // Small delay to ensure token is properly set
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('🔐 AUTH CONTEXT: Setting user in context state')
      dispatch({ type: 'SET_USER', payload: user })
    } catch (error: any) {
      console.error('❌ AUTH CONTEXT: Login failed:', error)
      const message = error.response?.data?.error || 'Login failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await authService.register(data)
      
      // Don't set user as authenticated until email is verified
      dispatch({ type: 'SET_LOADING', payload: false })
      return { needsVerification: true, email: data.email }
    } catch (error: any) {
      const message = error.message || 'Registration failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }

  const confirmRegistration = async (email: string, code: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await authService.confirmRegistration(email, code)
      
      // After confirmation, user needs to login
      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error: any) {
      const message = error.message || 'Verification failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }

  const logout = () => {
    authService.logout()
    dispatch({ type: 'LOGOUT' })
  }

  const updateProfile = async (profile: Partial<User['profile']>) => {
    try {
      const updatedUser = await authService.updateProfile(profile)
      authService.setStoredUser(updatedUser)
      dispatch({ type: 'SET_USER', payload: updatedUser })
    } catch (error: any) {
      const message = error.response?.data?.error || 'Profile update failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      console.log('🔄 AUTH CONTEXT: Refreshing user profile...')
      const refreshedUser = await authService.refreshUserProfile()
      if (refreshedUser) {
        console.log('✅ AUTH CONTEXT: User profile refreshed, updating context')
        dispatch({ type: 'SET_USER', payload: refreshedUser })
      } else {
        console.log('❌ AUTH CONTEXT: Failed to refresh user profile')
      }
    } catch (error: any) {
      console.error('💥 AUTH CONTEXT: Error refreshing user:', error)
    }
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const value: AuthContextType = {
    ...state,
    login,
    register,
    confirmRegistration,
    logout,
    updateProfile,
    refreshUser,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}