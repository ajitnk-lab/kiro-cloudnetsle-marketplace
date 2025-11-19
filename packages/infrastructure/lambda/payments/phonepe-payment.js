const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb')
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')
const crypto = require('crypto')
const https = require('https')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const secretsClient = new SecretsManagerClient({})
const sesClient = new SESClient({})

const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE
const USER_TABLE = process.env.USER_TABLE
const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE

// Get PhonePe credentials from Secrets Manager
const getPhonePeCredentials = async () => {
  try {
    const command = new GetSecretValueCommand({
      SecretId: 'marketplace/phonepe/credentials'
    })
    const response = await secretsClient.send(command)
    return JSON.parse(response.SecretString)
  } catch (error) {
    console.error('Error getting PhonePe credentials:', error)
    throw error
  }
}

// Generate unique merchant order ID
const generateMerchantOrderId = (userId) => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `MP-${userId}-${timestamp}-${random}`
}

// Get PhonePe authorization token
const getPhonePeAuthToken = async (credentials) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    })

    const options = {
      hostname: 'api.phonepe.com',
      port: 443,
      path: '/apis/identity-manager/v1/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          if (response.access_token) {
            resolve(response.access_token)
          } else {
            reject(new Error('No access token in response'))
          }
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

// Create PhonePe payment request
const createPhonePePayment = async (authToken, paymentData) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(paymentData)

    const options = {
      hostname: 'api.phonepe.com',
      port: 443,
      path: '/apis/pg/checkout/v2/pay',
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

// Send email notification
const sendEmail = async (to, subject, body) => {
  try {
    const command = new SendEmailCommand({
      Source: 'noreply@cloudnestle.com',
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: body } }
      }
    })
    await sesClient.send(command)
  } catch (error) {
    console.error('Error sending email:', error)
  }
}

exports.handler = async (event) => {
  console.log('PhonePe Payment Handler called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' }
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      }
    }

    const body = JSON.parse(event.body || '{}')
    const { userId, userEmail, tier = 'pro' } = body

    if (!userId || !userEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: userId, userEmail' }),
      }
    }

    // Get PhonePe credentials
    const credentials = await getPhonePeCredentials()
    
    // Generate unique merchant order ID
    const merchantOrderId = generateMerchantOrderId(userId)
    const transactionId = `txn_${merchantOrderId}`
    
    // Amount in paisa (₹299 = 29900 paisa)
    const amount = 29900
    
    // Get PhonePe auth token
    const authToken = await getPhonePeAuthToken(credentials)
    
    // Create payment request
    const paymentData = {
      merchantOrderId,
      amount,
      expireAfter: 1800, // 30 minutes
      metaInfo: {
        udf1: userId,
        udf2: userEmail,
        udf3: tier,
        udf4: 'pro-upgrade',
        udf5: new Date().toISOString()
      },
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: 'Upgrade to Pro - AWS Solution Finder',
        merchantUrls: {
          redirectUrl: 'https://marketplace.cloudnestle.com/payment/callback'
        }
      }
    }

    // Create PhonePe payment
    const paymentResponse = await createPhonePePayment(authToken, paymentData)
    
    if (!paymentResponse.orderId) {
      throw new Error('Failed to create PhonePe payment')
    }

    // Store transaction in database
    const transaction = {
      transactionId,
      userId,
      userEmail,
      merchantOrderId,
      phonepeOrderId: paymentResponse.orderId,
      amount,
      tier,
      status: 'PENDING',
      paymentMethod: 'phonepe',
      redirectUrl: paymentResponse.redirectUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: paymentResponse.expireAt
    }

    await docClient.send(new PutCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Item: transaction
    }))

    // Send email notification about payment initiation
    await sendEmail(
      userEmail,
      'Payment Initiated - AWS Solution Finder Pro',
      `
      <h2>Payment Initiated Successfully</h2>
      <p>Dear User,</p>
      <p>Your payment for AWS Solution Finder Pro upgrade has been initiated.</p>
      <p><strong>Order ID:</strong> ${merchantOrderId}</p>
      <p><strong>Amount:</strong> ₹299</p>
      <p><strong>Status:</strong> Pending</p>
      <p>Please complete the payment to activate your Pro features.</p>
      <p>Best regards,<br>AWS Solution Finder Team</p>
      `
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transactionId,
        merchantOrderId,
        phonepeOrderId: paymentResponse.orderId,
        redirectUrl: paymentResponse.redirectUrl,
        amount: 299,
        status: 'PENDING',
        message: 'Payment initiated successfully. Redirecting to PhonePe...'
      }),
    }

  } catch (error) {
    console.error('Error in PhonePe payment handler:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Payment initiation failed',
        message: error.message 
      }),
    }
  }
}
