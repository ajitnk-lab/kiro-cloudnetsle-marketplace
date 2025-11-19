const https = require('https')

// PhonePe API Test Script
class PhonePeTest {
  constructor(credentials) {
    this.clientId = credentials.clientId
    this.clientSecret = credentials.clientSecret
    this.clientVersion = credentials.clientVersion
    this.baseUrl = credentials.production ? 'api.phonepe.com' : 'api-preprod.phonepe.com'
    this.authPath = credentials.production ? '/apis/identity-manager/v1/oauth/token' : '/apis/pg-sandbox/v1/oauth/token'
    this.paymentPath = credentials.production ? '/apis/pg/checkout/v2/pay' : '/apis/pg-sandbox/checkout/v2/pay'
  }

  // Step 1: Get OAuth Token
  async getAuthToken() {
    const postData = new URLSearchParams({
      client_id: this.clientId,
      client_version: this.clientVersion,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials'
    }).toString()

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: this.authPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          try {
            const response = JSON.parse(data)
            console.log('Auth Response:', response)
            resolve(response)
          } catch (error) {
            reject(error)
          }
        })
      })

      req.on('error', reject)
      req.write(postData)
      req.end()
    })
  }

  // Step 2: Create Payment
  async createPayment(authToken, paymentData) {
    const postData = JSON.stringify(paymentData)

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: this.paymentPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${authToken}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          try {
            const response = JSON.parse(data)
            console.log('Payment Response:', response)
            resolve(response)
          } catch (error) {
            reject(error)
          }
        })
      })

      req.on('error', reject)
      req.write(postData)
      req.end()
    })
  }

  // Test complete flow
  async testFlow() {
    try {
      console.log('🔐 Step 1: Getting auth token...')
      const authResponse = await this.getAuthToken()
      
      if (!authResponse.access_token) {
        throw new Error('No access token received')
      }

      console.log('💳 Step 2: Creating payment...')
      const paymentData = {
        merchantOrderId: `TEST_${Date.now()}`,
        amount: 29900, // ₹299 in paise
        paymentFlow: {
          type: 'PG_CHECKOUT',
          message: 'Marketplace Pro Upgrade',
          merchantUrls: {
            redirectUrl: 'https://marketplace.cloudnestle.com/payment/callback'
          }
        }
      }

      const paymentResponse = await this.createPayment(authResponse.access_token, paymentData)
      
      console.log('✅ Test completed successfully!')
      return { authResponse, paymentResponse }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message)
      throw error
    }
  }
}

// Export for use
module.exports = PhonePeTest

// Test if run directly
if (require.main === module) {
  console.log('Please provide PhonePe credentials to test:')
  console.log('const test = new PhonePeTest({ clientId, clientSecret, clientVersion, production: false })')
  console.log('test.testFlow()')
}
