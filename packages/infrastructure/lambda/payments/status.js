const crypto = require('crypto')

exports.handler = async (event) => {
  console.log('Payment status check called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    const transactionId = event.pathParameters?.transactionId

    if (!transactionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Transaction ID is required' 
        }),
      }
    }

    // PhonePe Test Environment Configuration
    const PHONEPE_CONFIG = {
      merchantId: 'PGTESTPAYUAT',
      saltKey: '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399',
      saltIndex: 1,
      baseUrl: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
      env: 'UAT'
    }

    // Generate checksum for status check
    const checksumString = `/pg/v1/status/${PHONEPE_CONFIG.merchantId}/${transactionId}` + PHONEPE_CONFIG.saltKey
    const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + PHONEPE_CONFIG.saltIndex

    // PhonePe Status Check API
    const phonepeResponse = await fetch(`${PHONEPE_CONFIG.baseUrl}/pg/v1/status/${PHONEPE_CONFIG.merchantId}/${transactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': PHONEPE_CONFIG.merchantId
      }
    })

    const phonepeData = await phonepeResponse.json()
    
    console.log('PhonePe Status Response:', phonepeData)

    if (phonepeData.success) {
      const paymentStatus = phonepeData.data?.state || 'UNKNOWN'
      
      // TODO: Update order status in database here
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: paymentStatus,
          transactionId,
          amount: phonepeData.data?.amount ? phonepeData.data.amount / 100 : null, // Convert from paise
          paymentInstrument: phonepeData.data?.paymentInstrument,
          message: phonepeData.message || 'Status retrieved successfully'
        }),
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          status: 'FAILED',
          message: phonepeData.message || 'Payment status check failed'
        }),
      }
    }

  } catch (error) {
    console.error('Payment status check error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error'
      }),
    }
  }
}
