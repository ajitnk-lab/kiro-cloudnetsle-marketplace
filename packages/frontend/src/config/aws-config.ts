// AWS Configuration for Frontend
// This file is generated during build process with actual values

export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
  apiUrl: import.meta.env.VITE_API_URL || '',
  assetsBucket: import.meta.env.VITE_ASSETS_BUCKET || '',
}

// Validate required configuration
if (!awsConfig.userPoolId) {
  console.warn('VITE_USER_POOL_ID not configured')
}

if (!awsConfig.userPoolClientId) {
  console.warn('VITE_USER_POOL_CLIENT_ID not configured')
}

if (!awsConfig.apiUrl) {
  console.warn('VITE_API_URL not configured')
}

console.log('AWS Config loaded:', {
  region: awsConfig.region,
  userPoolId: awsConfig.userPoolId ? '***configured***' : 'missing',
  userPoolClientId: awsConfig.userPoolClientId ? '***configured***' : 'missing',
  apiUrl: awsConfig.apiUrl ? '***configured***' : 'missing',
})