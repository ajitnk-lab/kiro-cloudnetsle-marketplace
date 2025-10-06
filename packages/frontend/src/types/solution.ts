export interface Solution {
  solutionId: string
  partnerId: string
  name: string
  description: string
  category: string
  tags: string[]
  pricing: {
    model: 'upfront' | 'subscription'
    amount: number
    currency: 'INR'
    billingCycle?: 'monthly' | 'annual'
  }
  assets: {
    images: string[]
    documentation: string[]
    downloadUrl?: string
  }
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface SearchCriteria {
  query?: string
  category?: string
  priceMin?: number
  priceMax?: number
  pricingModel?: 'upfront' | 'subscription'
  tags?: string[]
  sortBy?: 'name' | 'price' | 'created' | 'updated'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}