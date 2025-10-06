import axios from 'axios'
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js'
import { LoginCredentials, RegisterData, User } from '../types/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Cognito configuration
const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
}

// Debug: Log configuration (remove in production)
console.log('Cognito Pool Data:', {
  UserPoolId: poolData.UserPoolId,
  ClientId: poolData.ClientId,
  hasUserPoolId: !!poolData.UserPoolId,
  hasClientId: !!poolData.ClientId
})

const userPool = new CognitoUserPool(poolData)

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
    return new Promise((resolve, reject) => {
      const { email, password } = credentials
      
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      })

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      })

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          try {
            const idToken = result.getIdToken().getJwtToken()
            
            // Get user profile from our backend
            const response = await api.get('/user/profile', {
              headers: { Authorization: `Bearer ${idToken}` }
            })
            
            resolve({
              user: response.data.user,
              token: idToken,
            })
          } catch (error: any) {
            console.error('Profile fetch error:', error)
            reject(new Error('Failed to fetch user profile'))
          }
        },
        onFailure: (err) => {
          console.error('Cognito login error:', err)
          reject(new Error(err.message || 'Login failed'))
        },
        newPasswordRequired: () => {
          reject(new Error('New password required'))
        },
      })
    })
  },

  // Register new user
  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    return new Promise((resolve, reject) => {
      const { name, email, password, role, company } = data
      
      // Split name into first and last name for Cognito
      const nameParts = name.trim().split(' ')
      const givenName = nameParts[0] || name
      const familyName = nameParts.slice(1).join(' ') || 'User'
      
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'given_name', Value: givenName }),
        new CognitoUserAttribute({ Name: 'family_name', Value: familyName }),
        new CognitoUserAttribute({ Name: 'custom:role', Value: role || 'customer' }),
      ]
      
      if (company) {
        attributeList.push(new CognitoUserAttribute({ Name: 'custom:company', Value: company }))
      }

      console.log('Attempting Cognito registration with:', { email, attributeList })
      
      userPool.signUp(email, password, attributeList, [], async (err, result) => {
        if (err) {
          console.error('Cognito registration error:', err)
          console.error('Error details:', {
            code: (err as any).code,
            message: err.message,
            name: err.name
          })
          reject(new Error(err.message || 'Registration failed'))
          return
        }

        if (result?.user) {
          // User profile will be created automatically by Cognito post-confirmation trigger
          const userId = result.user.getUsername()
          console.log('Cognito registration successful:', { userId, email, role })
          
          // Return success response - user needs to verify email
          const mockUser: User = {
            userId,
            email,
            role: role as 'customer' | 'partner' | 'admin',
            profile: {
              name,
              company: company || '',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'pending',
          }

          resolve({
            user: mockUser,
            token: 'pending_verification', // Temporary token
          })
        } else {
          reject(new Error('Registration failed - no user returned'))
        }
      })
    })
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

  // Social login URLs using Cognito hosted UI
  getSocialLoginUrl(provider: 'google' | 'github'): string {
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
    const redirectUri = import.meta.env.VITE_REDIRECT_URI
    
    const identityProvider = provider === 'google' ? 'Google' : 'GitHub'
    
    return `https://${cognitoDomain}/oauth2/authorize?` +
      `identity_provider=${identityProvider}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `scope=email+openid+profile`
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