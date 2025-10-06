import axios from 'axios'
import { LoginCredentials, RegisterData, User } from '../types/auth'

// This will be replaced with actual Cognito configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authService = {
  // Login with email/password
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    // This will be replaced with Cognito authentication
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  // Register new user
  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    // This will be replaced with Cognito registration
    const response = await api.post('/auth/register', data)
    return response.data
  },

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const response = await api.get('/user/profile')
    return response.data.user
  },

  // Update user profile
  async updateProfile(profile: Partial<User['profile']>): Promise<User> {
    const response = await api.put('/user/profile', { profile })
    return response.data.user
  },

  // Social login URLs (will be replaced with actual Cognito hosted UI URLs)
  getSocialLoginUrl(provider: 'google' | 'github'): string {
    return `${API_BASE_URL}/auth/social/${provider}`
  },

  // Logout
  logout(): void {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  },

  // Token management
  getToken(): string | null {
    return localStorage.getItem('authToken')
  },

  setToken(token: string): void {
    localStorage.setItem('authToken', token)
  },

  // User management
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  setStoredUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user))
  },
}