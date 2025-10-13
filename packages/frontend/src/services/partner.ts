import { fetchAuthSession } from 'aws-amplify/auth'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL as string || 'https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod'

// Helper to get access token for partner API calls
const getAccessToken = async () => {
  const session = await fetchAuthSession()
  return session.tokens?.accessToken?.toString()
}

export const partnerService = {
  // Check partner application status
  async getPartnerStatus() {
    const token = await getAccessToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(`${API_BASE_URL}/partner/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get partner status')
    }

    return response.json()
  },

  // Submit partner application
  async submitApplication(applicationData: any) {
    console.log('Raw form data received:', applicationData)
    
    const token = await getAccessToken()
    console.log('Access token:', token ? 'Present' : 'Missing')
    
    if (!token) {
      throw new Error('Authentication required')
    }

    // Transform frontend form data to backend expected format
    const application = {
      businessName: applicationData.company || '',
      businessType: applicationData.businessType || '',
      description: applicationData.description || '',
      experience: applicationData.experience || '',
      portfolio: applicationData.portfolio || '',
      website: applicationData.website || '',
      contactInfo: {
        phone: applicationData.phone || '',
        contactPerson: applicationData.contactPerson || ''
      },
      businessAddress: {
        address: applicationData.address || '',
        city: applicationData.city || '',
        country: applicationData.country || ''
      },
      taxInfo: {
        taxId: applicationData.taxId || ''
      }
    }

    console.log('Transformed application data:', application)
    console.log('API URL:', API_BASE_URL)
    
    const requestBody = { application }
    console.log('Request body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${API_BASE_URL}/partner/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const responseText = await response.text()
      console.error('Response text:', responseText)
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: responseText || 'Unknown error' }
      }
      
      console.error('Application submission failed:', errorData)
      throw new Error(errorData.error || errorData.message || 'Failed to submit application')
    }

    const result = await response.json()
    console.log('Success response:', result)
    return result
  },

  // Get partner applications
  async getApplications() {
    const token = await getAccessToken()
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
    const token = await getAccessToken()
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
    const token = await getAccessToken()
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
