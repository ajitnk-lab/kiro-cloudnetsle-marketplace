const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const https = require('https')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const secretsClient = new SecretsManagerClient({ region: 'us-east-1' })

const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE
const SOLUTION_TABLE_NAME = process.env.SOLUTION_TABLE_NAME

const getCashfreeCredentials = async () => {
  const command = new GetSecretValueCommand({
    SecretId: 'marketplace/cashfree/credentials'
  })
  const response = await secretsClient.send(command)
  return JSON.parse(response.SecretString)
}

const createCashfreeOrder = async (credentials, orderData) => {
  const postData = JSON.stringify(orderData)
  
  // Use sandbox for testing, production for live
  const hostname = credentials.secretKey.includes('_test_') ? 'sandbox.cashfree.com' : 'api.cashfree.com'
  
  console.log('Cashfree API Request:', {
    hostname,
    path: '/pg/orders',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': credentials.apiVersion || '2023-08-01',
      'x-client-id': credentials.appId,
      'x-client-secret': '[REDACTED]'
    },
    body: orderData
  })

  return new Promise((resolve, reject) => {
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

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log('Cashfree API Response:', res.statusCode, data)
        try {
          const response = JSON.parse(data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response)
          } else {
            reject(new Error(`Cashfree API Error: ${res.statusCode} - ${data}`))
          }
        } catch (error) {
          reject(new Error(`JSON Parse Error: ${error.message} - Response: ${data}`))
        }
      })
    })

    req.on('error', (error) => {
      console.error('Cashfree Request Error:', error)
      reject(error)
    })
    req.write(postData)
    req.end()
  })
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

exports.handler = async (event) => {
  console.log('Cashfree payment request:', JSON.stringify(event, null, 2))

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  try {
    const body = JSON.parse(event.body)
    const { 
      userId, 
      solutionId = 'aws-solution-finder-001', 
      amount: requestAmount, 
      userEmail, 
      userName, 
      userPhone,
      // Billing information (optional, for GST)
      billingCountry,
      billingAddress,
      billingCity,
      billingState,
      billingPostalCode,
      isBusinessPurchase,
      gstin,
      companyName
    } = body

    if (!userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing userId' })
      }
    }

    // Get solution details
    let baseAmount = requestAmount || 299 // Base price in rupees
    let solutionName = 'AWS Solution'
    let tier = 'pro'
    
    try {
      const solutionResponse = await docClient.send(new GetCommand({
        TableName: SOLUTION_TABLE_NAME,
        Key: { solutionId }
      }))
      
      if (solutionResponse.Item) {
        solutionName = solutionResponse.Item.name || solutionResponse.Item.title || 'AWS Solution'
        if (!requestAmount && solutionResponse.Item.pricing?.proTier?.amount) {
          baseAmount = solutionResponse.Item.pricing.proTier.amount
        }
      }
    } catch (error) {
      console.warn('Could not fetch solution details, using defaults:', error)
    }

    // Calculate GST (18% for India, 0% for others)
    const gstRate = billingCountry === 'India' ? 18 : 0
    const gstAmount = (baseAmount * gstRate) / 100
    const totalAmount = baseAmount + gstAmount
    const amountInPaisa = Math.round(totalAmount * 100) // Convert to paisa for Cashfree

    const credentials = await getCashfreeCredentials()
    const transactionId = `CF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const orderData = {
      order_id: transactionId,
      order_amount: totalAmount, // Cashfree expects rupees
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_phone: userPhone || '9999999999',
        customer_email: userEmail || 'user@example.com',
        customer_name: userName || 'Customer'
      },
      order_meta: {
        return_url: `https://marketplace.cloudnestle.com/payment-callback?gateway=cashfree&transactionId=${transactionId}`,
        notify_url: `https://7kzsoygrzl.execute-api.us-east-1.amazonaws.com/prod/payments/cashfree-webhook`
      },
      order_note: `${solutionName} - ${tier.toUpperCase()} tier upgrade`
    }

    console.log('Creating Cashfree order:', JSON.stringify(orderData, null, 2))

    // Create transaction record
    await docClient.send(new PutCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Item: {
        transactionId,
        userId,
        solutionId,
        solutionName,
        amount: amountInPaisa, // Legacy field in paisa
        baseAmount, // New: amount before GST
        gstAmount, // New: GST amount
        gstRate, // New: GST percentage
        totalAmount, // New: final amount
        currency: 'INR',
        paymentGateway: 'cashfree',
        gatewayOrderId: transactionId,
        status: 'initiated',
        tier: tier,
        customerEmail: userEmail || 'user@example.com',
        customerName: userName || 'Customer',
        customerPhone: userPhone || '9999999999',
        // Billing information (optional)
        ...(billingCountry && {
          billingCountry,
          billingAddress,
          billingCity,
          billingState,
          billingPostalCode,
          isBusinessPurchase,
          gstin,
          companyName
        }),
        createdAt: new Date().toISOString(),
        gateway_data: {
          order_id: transactionId,
          solution_name: solutionName,
          tier_purchased: tier
        }
      }
    }))

    const cashfreeResponse = await createCashfreeOrder(credentials, orderData)
    console.log('Cashfree order created:', JSON.stringify(cashfreeResponse, null, 2))

    // Return payment session ID for frontend to use with Cashfree JS SDK
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        transactionId,
        paymentSessionId: cashfreeResponse.payment_session_id,
        gateway: 'cashfree',
        amount: totalAmount,
        baseAmount,
        gstAmount,
        gstRate,
        sessionId: cashfreeResponse.payment_session_id
      })
    }

  } catch (error) {
    console.error('Cashfree payment error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Payment initiation failed',
        details: error.message 
      })
    }
  }
}
