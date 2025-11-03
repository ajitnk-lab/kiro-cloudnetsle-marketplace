import { Amplify } from 'aws-amplify'
import { signIn, signUp, confirmSignUp, signOut, fetchAuthSession } from 'aws-amplify/auth'
import { LoginCredentials, RegisterData, User } from '../types/auth'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL as string
const USER_POOL_ID = (import.meta as any).env.VITE_USER_POOL_ID as string
const CLIENT_ID = (import.meta as any).env.VITE_USER_POOL_CLIENT_ID as string

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: USER_POOL_ID,
      userPoolClientId: CLIENT_ID,
      identityPoolId: undefined as any,
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
      },
      allowGuestAccess: false,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    }
  }
})

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    try {
      console.log('🔐 Starting login with:', { email: credentials.email })
      
      try {
        const currentSession = await fetchAuthSession()
        if (currentSession.tokens?.accessToken) {
          console.log('👤 User already authenticated, using existing session')
          const accessToken = currentSession.tokens.accessToken.toString()
          const idToken = currentSession.tokens.idToken?.toString()
          
          // Always use IdToken for API Gateway Cognito authorizer
          const tokenToTry = idToken || accessToken
          
          const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: { 
              'Authorization': `Bearer ${tokenToTry}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (userResponse.ok) {
            const userData = await userResponse.json()
            this.setToken(idToken || accessToken)
            this.setStoredUser(userData.user)
            return { user: userData.user, token: idToken || accessToken }
          } else {
            const userInfo = currentSession.tokens?.idToken?.payload
            if (userInfo) {
              const user: User = {
                userId: userInfo.sub as string,
                email: userInfo.email as string,
                role: (userInfo['custom:role'] as any) || 'customer',
                profile: {
                  name: `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
                  company: (userInfo['custom:company'] as string) || '',
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active'
              }
              this.setToken(accessToken)
              this.setStoredUser(user)
              return { user, token: accessToken }
            }
          }
        }
      } catch (sessionError) {
        console.log('📝 No existing session, proceeding with login')
      }

      const result = await signIn({
        username: credentials.email,
        password: credentials.password,
      })

      if (result.isSignedIn) {
        const session = await fetchAuthSession()
        const accessToken = session.tokens?.accessToken?.toString()
        const idToken = session.tokens?.idToken?.toString()
        
        if (accessToken && idToken) {
          const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
          })
          
          if (userResponse.ok) {
            const userData = await userResponse.json()
            this.setToken(idToken)
            this.setStoredUser(userData.user)
            return { user: userData.user, token: idToken }
          } else {
            const userInfo = session.tokens?.idToken?.payload
            if (userInfo) {
              const user: User = {
                userId: userInfo.sub as string,
                email: userInfo.email as string,
                role: (userInfo['custom:role'] as any) || 'customer',
                profile: {
                  name: `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
                  company: (userInfo['custom:company'] as string) || '',
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active'
              }
              this.setToken(idToken)
              this.setStoredUser(user)
              return { user, token: idToken }
            }
          }
        }
      }
      
      throw new Error('Login failed')
    } catch (error: any) {
      console.error('💥 Login error:', error)
      
      if (error.name === 'UserAlreadyAuthenticatedException') {
        console.log('🔄 Signing out existing user and retrying...')
        await signOut()
        
        const result = await signIn({
          username: credentials.email,
          password: credentials.password,
        })

        if (result.isSignedIn) {
          const session = await fetchAuthSession()
          const token = session.tokens?.idToken?.toString()
          
          if (token) {
            const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (userResponse.ok) {
              const userData = await userResponse.json()
              this.setToken(token)
              this.setStoredUser(userData.user)
              return { user: userData.user, token }
            } else {
              const userInfo = session.tokens?.idToken?.payload
              if (userInfo) {
                const user: User = {
                  userId: userInfo.sub as string,
                  email: userInfo.email as string,
                  role: (userInfo['custom:role'] as any) || 'customer',
                  profile: {
                    name: `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
                    company: (userInfo['custom:company'] as string) || '',
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  status: 'active'
                }
                this.setToken(token)
                this.setStoredUser(user)
                return { user, token }
              }
            }
          }
        }
      }
      
      throw new Error(error.message || 'Invalid email or password')
    }
  },

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    try {
      const fullName = data.name || 'User Name'
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || 'User'
      const lastName = nameParts.slice(1).join(' ') || 'Name'

      const { userId } = await signUp({
        username: data.email,
        password: data.password,
        options: {
          userAttributes: {
            email: data.email,
            given_name: firstName,
            family_name: lastName,
            'custom:role': data.role || 'customer',
            'custom:company': data.company || '',
          },
        },
      })

      return { 
        user: { 
          userId: userId || 'pending', 
          email: data.email, 
          role: data.role || 'customer',
          profile: { 
            name: fullName,
            company: data.company || ''
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'pending'
        } as User, 
        token: 'pending-confirmation'
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      throw new Error(error.message || 'Registration failed. Please try again.')
    }
  },

  async confirmRegistration(email: string, code: string): Promise<void> {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code,
      })

      if (!isSignUpComplete) {
        throw new Error('Confirmation incomplete')
      }
    } catch (error: any) {
      console.error('Confirmation error:', error)
      throw new Error(error.message || 'Verification failed')
    }
  },

  async getCurrentUser(): Promise<User> {
    const token = this.getToken()
    if (!token) throw new Error('No token found')

    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.user
    }
    
    throw new Error('Failed to get user profile')
  },

  async updateProfile(profile: Partial<User['profile']>): Promise<User> {
    const token = this.getToken()
    if (!token) throw new Error('No token found')

    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profile })
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.user
    }
    
    throw new Error('Failed to update profile')
  },

  getToken(): string | null {
    return localStorage.getItem('authToken')
  },

  setToken(token: string): void {
    localStorage.setItem('authToken', token)
    // Also store in auth-session format for AdminDashboard
    const session = {
      tokens: {
        idToken: token,
        accessToken: token
      }
    }
    localStorage.setItem('auth-session', JSON.stringify(session))
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  setStoredUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user))
  },

  async logout(): Promise<void> {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
    }
  },
}
