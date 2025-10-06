import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Filter, Grid, List, Star, DollarSign, Calendar, Tag, Loader2, AlertCircle } from 'lucide-react'
import { catalogService } from '../services/catalog'
import { Solution, SearchCriteria } from '../types/solution'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('priceMin') || '',
    max: searchParams.get('priceMax') || '',
  })
  const [pricingModel, setPricingModel] = useState(searchParams.get('pricingModel') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'updatedAt')
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc')

  // Load initial data
  useEffect(() => {
    loadCategories()
    loadSolutions()
  }, [])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (priceRange.min) params.set('priceMin', priceRange.min)
    if (priceRange.max) params.set('priceMax', priceRange.max)
    if (pricingModel) params.set('pricingModel', pricingModel)
    if (sortBy !== 'updatedAt') params.set('sortBy', sortBy)
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)
    
    setSearchParams(params)
  }, [searchQuery, selectedCategory, priceRange, pricingModel, sortBy, sortOrder, setSearchParams])

  const loadCategories = async () => {
    try {
      const categoriesData = await catalogService.getCategories()
      setCategories(categoriesData)
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  const loadSolutions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const criteria: SearchCriteria = {
        query: searchQuery || undefined,
        category: selectedCategory || undefined,
        priceMin: priceRange.min ? parseFloat(priceRange.min) : undefined,
        priceMax: priceRange.max ? parseFloat(priceRange.max) : undefined,
        pricingModel: pricingModel as 'upfront' | 'subscription' || undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc',
        limit: 20,
      }

      const data = searchQuery || selectedCategory || priceRange.min || priceRange.max || pricingModel
        ? await catalogService.searchSolutions(criteria)
        : await catalogService.getSolutions()
      
      setSolutions(data.solutions)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load solutions')
    } finally {
      setLoading(false)
    }
  }

  // Reload solutions when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadSolutions()
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedCategory, priceRange, pricingModel, sortBy, sortOrder])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadSolutions()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setPriceRange({ min: '', max: '' })
    setPricingModel('')
    setSortBy('updatedAt')
    setSortOrder('desc')
  }

  const formatPrice = (solution: Solution) => {
    const { pricing } = solution
    if (pricing.model === 'subscription') {
      return `₹${pricing.amount}/${pricing.billingCycle}`
    }
    return `₹${pricing.amount}`
  }

  const SolutionCard = ({ solution }: { solution: Solution }) => (
    <Link
      to={`/solutions/${solution.solutionId}`}
      className="card hover:shadow-lg transition-shadow duration-200 group"
    >
      {/* Solution Image */}
      <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
        {solution.assets.images.length > 0 ? (
          <img
            src={solution.assets.images[0]}
            alt={solution.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Tag className="h-12 w-12" />
          </div>
        )}
      </div>

      {/* Solution Info */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {solution.name}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {solution.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {solution.category}
          </span>
          <div className="flex items-center text-sm text-gray-500">
            <DollarSign className="h-4 w-4 mr-1" />
            {formatPrice(solution)}
          </div>
        </div>

        {solution.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {solution.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600"
              >
                {tag}
              </span>
            ))}
            {solution.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{solution.tags.length - 3} more</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(solution.updatedAt).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <Star className="h-3 w-3 mr-1" />
            {solution.pricing.model === 'subscription' ? 'Subscription' : 'One-time'}
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Solution Catalog</h1>
        <p className="text-gray-600">
          Discover software solutions from our trusted partners
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search solutions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-outline ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`btn-outline ${viewMode === 'grid' ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`btn-outline ${viewMode === 'list' ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pricing Model Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Model</label>
                <select
                  value={pricingModel}
                  onChange={(e) => setPricingModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Models</option>
                  <option value="upfront">One-time Payment</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range (₹)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="updatedAt">Latest</option>
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="createdAt">Created</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">↓</option>
                    <option value="asc">↑</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Filter Actions */}
          {showFilters && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear all filters
              </button>
              <button type="submit" className="btn-primary">
                Apply Filters
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${solutions.length} solutions found`}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading solutions...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Solutions</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={loadSolutions} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Solutions Grid/List */}
      {!loading && !error && (
        <>
          {solutions.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No solutions found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or browse all categories.
                </p>
                <button onClick={clearFilters} className="btn-primary">
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              {solutions.map((solution) => (
                <SolutionCard key={solution.solutionId} solution={solution} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}