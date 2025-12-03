const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const https = require('https')

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' })

async function testCashfreeAuth() {
  try {
    // Get credentials
    const command = new GetSecretValueCommand({
      SecretId: 'marketplace/cashfree/credentials'
    })
    const response = await secretsClient.send(command)
    const credentials = JSON.parse(response.SecretString)
    
    console.log('Credentials retrieved:')
    console.log('- App ID:', credentials.appId)
    console.log('- Secret Key (first 10 chars):', credentials.secretKey.substring(0, 10) + '...')
    console.log('- API Version:', credentials.apiVersion)
    
    // Test API call
    const testOrder = {
      order_id: 'TEST_' + Date.now(),
      order_amount: 1,
      order_currency: 'INR',
      customer_details: {
        customer_id: 'test_customer',
        customer_phone: '9999999999',
        customer_email: 'test@example.com',
        customer_name: 'Test Customer'
      },
      order_meta: {
        return_url: 'https://example.com/return',
        notify_url: 'https://example.com/notify'
      }
    }
    
    const postData = JSON.stringify(testOrder)
    const hostname = credentials.secretKey.includes('_test_') ? 'sandbox.cashfree.com' : 'api.cashfree.com'
    
    console.log('\nTesting API call to:', hostname)
    
    const options = {
      hostname,
      port: 443,
      path: '/pg/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': credentials.apiVersion || '2023-08-01',
        'x-client-id': credentials.appId,
        'x-client-secret': credentials.secretKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          console.log('Response Status:', res.statusCode)
          console.log('Response Body:', data)
          
          if (res.statusCode === 401) {
            console.log('\n❌ AUTHENTICATION FAILED')
            console.log('This indicates the credentials are invalid or expired')
          } else if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('\n✅ AUTHENTICATION SUCCESS')
          } else {
            console.log('\n⚠️ OTHER ERROR')
          }
          
          resolve({ statusCode: res.statusCode, body: data })
        })
      })
      
      req.on('error', (error) => {
        console.error('Request Error:', error)
        reject(error)
      })
      
      req.write(postData)
      req.end()
    })
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testCashfreeAuth()
