import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
export const catalogService = {
    // Get all solutions
    async getSolutions() {
        const response = await api.get('/catalog');
        return response.data;
    },
    // Search solutions
    async searchSolutions(criteria) {
        const params = new URLSearchParams();
        if (criteria.query)
            params.append('q', criteria.query);
        if (criteria.category)
            params.append('category', criteria.category);
        if (criteria.priceMin)
            params.append('priceMin', criteria.priceMin.toString());
        if (criteria.priceMax)
            params.append('priceMax', criteria.priceMax.toString());
        if (criteria.pricingModel)
            params.append('pricingModel', criteria.pricingModel);
        if (criteria.sortBy)
            params.append('sortBy', criteria.sortBy);
        if (criteria.sortOrder)
            params.append('sortOrder', criteria.sortOrder);
        if (criteria.limit)
            params.append('limit', criteria.limit.toString());
        if (criteria.offset)
            params.append('offset', criteria.offset.toString());
        const response = await api.get(`/catalog/search?${params.toString()}`);
        return response.data;
    },
    // Get solution by ID
    async getSolution(solutionId) {
        const response = await api.get(`/catalog/${solutionId}`);
        return response.data.solution;
    },
    // Create solution (partner only)
    async createSolution(solution) {
        const response = await api.post('/partner/solutions', solution);
        return response.data.solution;
    },
    // Update solution (partner only)
    async updateSolution(solutionId, updates) {
        const response = await api.put(`/partner/solutions/${solutionId}`, updates);
        return response.data.solution;
    },
    // Delete solution (partner only)
    async deleteSolution(solutionId) {
        await api.delete(`/partner/solutions/${solutionId}`);
    },
    // Get partner's solutions
    async getPartnerSolutions() {
        const response = await api.get('/partner/solutions');
        return response.data;
    },
    // Get solution categories
    async getCategories() {
        const response = await api.get('/catalog/categories');
        return response.data.categories;
    },
    // Upload solution image
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post('/catalog/upload-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};
