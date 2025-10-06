export interface Solution {
  solutionId: string
  partnerId: string
  partnerName?: string
  name: string
  description: string
  category: string
  tags: string[]
  pricing: {
    model: 'upfront' | 'subscription'
    amount: number
    currency: 'INR'
    billingCycle?: 'month' | 'year'
  }
  assets: {
    images: string[]
    documents: string[]
    downloadUrl?: string
  }
  features?: string[]
  requirements?: {
    system?: string
    storage?: string
    users?: string
  }
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active'
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