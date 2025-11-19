const { getCountryFromRequest, getClientIP } = require('./geo-utils')

/**
 * Track user location and device information from request
 */
const trackUserLocation = async (event, userId, solutionId, action) => {
  try {
    const headers = event.headers || {}
    
    // Get country from CloudFront or IP
    const country = getCountryFromRequest(event)
    const clientIP = getClientIP(event)
    
    // Extract device and browser info from User-Agent
    const userAgent = headers['User-Agent'] || headers['user-agent'] || ''
    const deviceInfo = parseUserAgent(userAgent)
    
    // Get country code from country name
    const countryCode = getCountryCodeFromName(country)
    
    const locationData = {
      country: country,
      countryCode: countryCode,
      city: 'Unknown', // Could integrate with IP geolocation service for city
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      userAgent: userAgent,
      clientIP: clientIP,
      timestamp: new Date().toISOString(),
      userId: userId,
      solutionId: solutionId,
      action: action
    }
    
    console.log('Location tracking data:', locationData)
    return locationData
    
  } catch (error) {
    console.error('Error tracking user location:', error)
    return {
      country: 'India',
      countryCode: 'IN',
      city: 'Unknown',
      device: 'unknown',
      browser: 'unknown'
    }
  }
}

/**
 * Parse User-Agent string to extract device and browser info
 */
const parseUserAgent = (userAgent) => {
  const ua = userAgent.toLowerCase()
  
  let device = 'desktop'
  let browser = 'unknown'
  
  // Detect device type
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'tablet'
  }
  
  // Detect browser
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'chrome'
  } else if (ua.includes('firefox')) {
    browser = 'firefox'
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'safari'
  } else if (ua.includes('edg')) {
    browser = 'edge'
  } else if (ua.includes('opera')) {
    browser = 'opera'
  }
  
  return { device, browser }
}

/**
 * Get country code from country name
 */
const getCountryCodeFromName = (countryName) => {
  const countryMap = {
    'India': 'IN',
    'United States': 'US',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Japan': 'JP',
    'Singapore': 'SG',
    'United Arab Emirates': 'AE',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'Netherlands': 'NL',
    'Italy': 'IT',
    'Spain': 'ES',
    'South Korea': 'KR',
    'China': 'CN',
    'Russia': 'RU'
  }
  
  return countryMap[countryName] || 'IN'
}

module.exports = {
  trackUserLocation,
  parseUserAgent,
  getCountryCodeFromName
}
