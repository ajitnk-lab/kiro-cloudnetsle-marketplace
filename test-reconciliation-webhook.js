const https = require('https')

// Test PhonePe webhook with reconciliation data
const testWebhook = async () => {
  const webhookPayload = {
    event: 'checkout.order.completed',
    payload: {
      merchantOrderId: 'test_order_123',
      state: 'COMPLETED',
      amount: 29900, // ₹299 in paisa
      transactionId: 'phonepe_txn_456',
      timestamp: new Date().toISOString(),
      paymentDetails: [{
        paymentMode: 'UPI',
        rail: {
          utr: 'UTR123456789',
          upiTransactionId: 'UPI789123456',
          vpa: 'user@paytm'
        }
      }]
    }
  }

  const postData = JSON.stringify(webhookPayload)

  const options = {
    hostname: 'juvt4m81ld.execute-api.us-east-1.amazonaws.com',
    port: 443,
    path: '/prod/payments/phonepe-webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        console.log('✅ Webhook Response Status:', res.statusCode)
        console.log('📋 Response Body:', data)
        resolve({ status: res.statusCode, body: data })
      })
    })

    req.on('error', (error) => {
      console.error('❌ Webhook Error:', error)
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

// Run the test
console.log('🧪 Testing PhonePe Webhook with Reconciliation Data...')
testWebhook()
  .then(result => {
    console.log('✅ Test completed successfully')
    if (result.body.includes('reconciliation_updated')) {
      console.log('🎉 Reconciliation data update confirmed!')
    }
  })
  .catch(error => {
    console.error('❌ Test failed:', error)
  })
