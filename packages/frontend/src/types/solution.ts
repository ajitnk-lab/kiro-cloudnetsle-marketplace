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
    currency: string
    billingCycle?: 'month' | 'year'
  }
  assets: {
    images: string[]
    documents: string[]
    downloadUrl?: string
  }
  features: string[]
  requirements?: string | {
    system?: string
    storage?: string
    users?: string
  }
  supportInfo?: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active'
  rejectionReason?: string
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