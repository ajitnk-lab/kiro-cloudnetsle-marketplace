import React from 'react'
import { Search, Filter, Grid, List } from 'lucide-react'

export function CatalogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Solution Catalog</h1>
        <p className="text-gray-600">
          Discover software solutions from our trusted partners
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search solutions..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button className="btn-outline">
              <Grid className="h-4 w-4" />
            </button>
            <button className="btn-outline">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Coming Soon Message */}
      <div className="text-center py-16">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            We're working hard to bring you an amazing catalog of software solutions.
            Check back soon!
          </p>
          <div className="text-sm text-gray-500">
            This page will be implemented in the next development phase.
          </div>
        </div>
      </div>
    </div>
  )
}