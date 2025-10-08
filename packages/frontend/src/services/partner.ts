import { authService } from './auth'
import { fetchAuthSession } from 'aws-amplify/auth'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL as string

// Helper to get ID token for partner API calls
const getIdToken = async () => {
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString()
}

export const partnerService = {
  // Submit partner application
  async submitApplication(applicationData: any) {
    const token = await getIdToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(`${API_BASE_URL}/partner/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(applicationData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Failed to submit application')
    }

    return response.json()
  },

  // Get partner applications
  async getApplications() {
    const token = await getIdToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(`${API_BASE_URL}/partner/applications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Failed to fetch applications')
    }

    return response.json()
  },

  // Get partner solutions
  async getSolutions() {
    const token = await getIdToken()
    if (!token) {
      // Return mock data for demo purposes
      return {
        solutions: [],
        totalSales: 0,
        totalRevenue: 0
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/partner/solutions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        // Return mock data if API fails
        return {
          solutions: [],
          totalSales: 0,
          totalRevenue: 0
        }
      }

      return response.json()
    } catch (error) {
      // Return mock data for demo
      return {
        solutions: [],
        totalSales: 0,
        totalRevenue: 0
      }
    }
  },

  // Create new solution
  async createSolution(solutionData: any) {
    const token = await getIdToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    try {
      const response = await fetch(`${API_BASE_URL}/partner/solutions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ solution: solutionData })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to create solution'
        
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      return response.json()
    } catch (error: any) {
      console.error('Create solution error:', error)
      throw new Error(error.message || 'Failed to create solution. Please try again.')
    }
  }
}
