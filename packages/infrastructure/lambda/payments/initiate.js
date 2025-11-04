const crypto = require('crypto')

exports.handler = async (event) => {
  console.log('Payment initiation called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    const body = JSON.parse(event.body || '{}')
    const { solutionId, amount, currency, userId, userEmail, userName } = body

    if (!solutionId || !amount || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Missing required fields: solutionId, amount, userId' 
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

    // Generate unique transaction ID
    const merchantTransactionId = `TXN_${Date.now()}_${userId}`
    
    // Create payment payload
    const paymentPayload = {
      merchantId: PHONEPE_CONFIG.merchantId,
      merchantTransactionId,
      merchantUserId: userId,
      amount: amount * 100, // Convert to paise
      redirectUrl: `${process.env.FRONTEND_URL || 'http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com'}/payment/success?transactionId=${merchantTransactionId}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.API_BASE_URL || 'https://y26tmcluvk.execute-api.us-east-1.amazonaws.com/prod'}/payments/webhook`,
      mobileNumber: '9999999999', // Default for testing
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    }

    // Encode payload to base64
    const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64')
    
    // Generate checksum
    const checksumString = base64Payload + '/pg/v1/pay' + PHONEPE_CONFIG.saltKey
    const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + PHONEPE_CONFIG.saltIndex

    // PhonePe API request
    const phonepeResponse = await fetch(`${PHONEPE_CONFIG.baseUrl}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum
      },
      body: JSON.stringify({
        request: base64Payload
      })
    })

    const phonepeData = await phonepeResponse.json()
    
    console.log('PhonePe Response:', phonepeData)

    if (phonepeData.success && phonepeData.data?.instrumentResponse?.redirectInfo?.url) {
      // TODO: Save order to database here
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          redirectUrl: phonepeData.data.instrumentResponse.redirectInfo.url,
          transactionId: merchantTransactionId,
          message: 'Payment initiated successfully'
        }),
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: phonepeData.message || 'Payment initiation failed'
        }),
      }
    }

  } catch (error) {
    console.error('Payment initiation error:', error)
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
