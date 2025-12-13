export interface Solution {
  solutionId: string
  partnerId: string
  name: string
  description: string
  category: string
  tags: string[]
  pricing: {
    model: 'upfront' | 'subscription' | 'freemium'
    amount?: number
    currency?: 'INR' | 'USD'
    billingCycle?: 'monthly' | 'annual'
    tiers?: Array<{
      name: string
      amount: number
      currency: string
      billingPeriod?: string
    }>
    proTier?: {
      amount: number
      currency: 'INR'
    }
    pro?: {
      price: number
    }
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