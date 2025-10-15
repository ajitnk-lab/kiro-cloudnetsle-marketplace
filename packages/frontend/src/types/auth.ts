export interface User {
  userId: string
  email: string
  role: 'customer' | 'partner' | 'admin'
  profile: {
    name: string
    company?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
  status: 'active' | 'suspended' | 'pending'
  marketplaceStatus?: 'pending' | 'approved' | 'rejected' | 'active' | 'none'
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  company?: string
  role?: 'customer' | 'partner'
}