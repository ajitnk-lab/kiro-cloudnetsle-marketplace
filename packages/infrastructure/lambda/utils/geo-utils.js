// Utility functions for geolocation based on IP address

/**
 * Get country from IP address using CloudFront headers or IP geolocation
 */
const getCountryFromRequest = (event) => {
  try {
    // Try CloudFront headers first (most reliable)
    const headers = event.headers || {}
    
    // CloudFront adds country code in headers
    if (headers['CloudFront-Viewer-Country']) {
      return getCountryNameFromCode(headers['CloudFront-Viewer-Country'])
    }
    
    // Alternative header names
    if (headers['cloudfront-viewer-country']) {
      return getCountryNameFromCode(headers['cloudfront-viewer-country'])
    }
    
    // Check for X-Forwarded-For or other IP headers
    const clientIP = getClientIP(event)
    if (clientIP && !isPrivateIP(clientIP)) {
      // For now, default to India since most users are expected to be from India
      // In production, you could integrate with IP geolocation services
      return 'India'
    }
    
    return 'India' // Default fallback
  } catch (error) {
    console.log('Error getting country from request:', error)
    return 'India'
  }
}

/**
 * Extract client IP from various headers
 */
const getClientIP = (event) => {
  const headers = event.headers || {}
  
  // Try various IP headers in order of preference
  const ipHeaders = [
    'X-Forwarded-For',
    'X-Real-IP', 
    'X-Client-IP',
    'CF-Connecting-IP', // Cloudflare
    'True-Client-IP'
  ]
  
  for (const header of ipHeaders) {
    const ip = headers[header] || headers[header.toLowerCase()]
    if (ip) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return ip.split(',')[0].trim()
    }
  }
  
  // Fallback to source IP from request context
  return event.requestContext?.identity?.sourceIp || null
}

/**
 * Check if IP is private/internal
 */
const isPrivateIP = (ip) => {
  if (!ip) return true
  
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ]
  
  return privateRanges.some(range => range.test(ip))
}

/**
 * Convert country code to country name
 */
const getCountryNameFromCode = (countryCode) => {
  const countryMap = {
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom', 
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'SG': 'Singapore',
    'AE': 'United Arab Emirates',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'NL': 'Netherlands',
    'IT': 'Italy',
    'ES': 'Spain',
    'KR': 'South Korea',
    'CN': 'China',
    'RU': 'Russia'
  }
  
  return countryMap[countryCode?.toUpperCase()] || 'India'
}

module.exports = {
  getCountryFromRequest,
  getClientIP,
  isPrivateIP,
  getCountryNameFromCode
}
