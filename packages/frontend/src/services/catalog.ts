import axios from 'axios'
import { Solution, SearchCriteria } from '../types/solution'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

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

export const catalogService = {
  // Get all solutions
  async getSolutions(): Promise<{ solutions: Solution[]; count: number }> {
    const response = await api.get('/catalog')
    return response.data
  },

  // Search solutions
  async searchSolutions(criteria: SearchCriteria): Promise<{ solutions: Solution[]; count: number }> {
    const params = new URLSearchParams()
    
    if (criteria.query) params.append('q', criteria.query)
    if (criteria.category) params.append('category', criteria.category)
    if (criteria.priceMin) params.append('priceMin', criteria.priceMin.toString())
    if (criteria.priceMax) params.append('priceMax', criteria.priceMax.toString())
    if (criteria.pricingModel) params.append('pricingModel', criteria.pricingModel)
    if (criteria.sortBy) params.append('sortBy', criteria.sortBy)
    if (criteria.sortOrder) params.append('sortOrder', criteria.sortOrder)
    if (criteria.limit) params.append('limit', criteria.limit.toString())
    if (criteria.offset) params.append('offset', criteria.offset.toString())
    
    const response = await api.get(`/catalog/search?${params.toString()}`)
    return response.data
  },

  // Get solution by ID
  async getSolution(solutionId: string): Promise<Solution> {
    const response = await api.get(`/catalog/${solutionId}`)
    return response.data.solution
  },

  // Alias for getSolution to match form expectations
  async getSolutionById(solutionId: string): Promise<Solution> {
    return this.getSolution(solutionId)
  },

  // Create solution (partner only)
  async createSolution(solution: Omit<Solution, 'solutionId' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Solution> {
    const response = await api.post('/partner/solutions', solution)
    return response.data.solution
  },

  // Update solution (partner only)
  async updateSolution(solutionId: string, updates: Partial<Solution>): Promise<Solution> {
    const response = await api.put(`/partner/solutions/${solutionId}`, updates)
    return response.data.solution
  },

  // Delete solution (partner only)
  async deleteSolution(solutionId: string): Promise<void> {
    await api.delete(`/partner/solutions/${solutionId}`)
  },

  // Get partner's solutions
  async getPartnerSolutions(): Promise<{ solutions: Solution[]; count: number }> {
    const response = await api.get('/partner/solutions')
    return response.data
  },

  // Get solution categories
  async getCategories(): Promise<string[]> {
    const response = await api.get('/catalog/categories')
    return response.data.categories
  },

  // Upload solution image
  async uploadImage(formData: FormData): Promise<string> {
    const response = await api.post('/catalog/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.imageUrl
  },
}