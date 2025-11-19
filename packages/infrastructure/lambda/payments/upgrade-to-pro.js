const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const https = require('https')

// Import location tracking utility - using conditional require to handle deployment
let trackUserLocation
try {
  trackUserLocation = require('../utils/location-tracker').trackUserLocation
} catch (error) {
  console.warn('Location tracker not available:', error.message)
  trackUserLocation = async () => null // Fallback function
}

const makeHttpRequest = (method, hostname, path, data, headers = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      headers
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => responseData += chunk)
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData)
          resolve(response)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const secretsClient = new SecretsManagerClient({})

const USER_TABLE = process.env.USER_TABLE
const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE

const getPhonePeCredentials = async () => {
  const command = new GetSecretValueCommand({
    SecretId: 'marketplace/phonepe/credentials'
  })
  const response = await secretsClient.send(command)
  return JSON.parse(response.SecretString)
}

const getAuthToken = async (credentials) => {
  const postData = new URLSearchParams({
    client_id: credentials.clientId,
    client_version: credentials.clientVersion,
    client_secret: credentials.clientSecret,
    grant_type: 'client_credentials'
  }).toString()

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.phonepe.com',
      port: 443,
      path: '/apis/identity-manager/v1/oauth/token',
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

const createPayment = async (authToken, paymentData) => {
  const postData = JSON.stringify(paymentData)

  return new Promise((resolve, reject) => {
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

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

exports.handler = async (event) => {
  console.log('Upgrade to Pro request:', JSON.stringify(event, null, 2))

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  try {
    const body = JSON.parse(event.body)
    let { userEmail, returnUrl } = body
    const queryParams = event.queryStringParameters || {}
    
    // If userEmail is 'token-based-user', extract from Authorization header
    if (userEmail === 'token-based-user' || !userEmail) {
      const authHeader = event.headers?.Authorization || event.headers?.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Call marketplace API to get user details from token
        try {
          const userResponse = await makeHttpRequest('GET', 'juvt4m81ld.execute-api.us-east-1.amazonaws.com', '/prod/api/check-user-limits', null, {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          })
          
          if (userResponse.user && userResponse.user.email) {
            userEmail = userResponse.user.email
          }
        } catch (tokenError) {
          console.error('Failed to get user from token:', tokenError)
        }
      }
    }

    if (!userEmail) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, message: 'User email is required' })
      }
    }

    // Get user details
    const getUserCommand = new QueryCommand({
      TableName: USER_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': userEmail
      }
    })
    const userResult = await docClient.send(getUserCommand)

    if (!userResult.Items || userResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, message: 'User not found' })
      }
    }

    const user = userResult.Items[0]

    if (user.tier === 'pro') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, message: 'User is already Pro tier' })
      }
    }

    // Get PhonePe credentials and create payment
    const credentials = await getPhonePeCredentials()
    const authResponse = await getAuthToken(credentials)
    
    if (!authResponse.access_token) {
      throw new Error('Failed to get PhonePe auth token')
    }

    const merchantOrderId = `MP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const paymentData = {
      merchantOrderId: merchantOrderId,
      amount: 29900, // ₹299 in paise
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: 'Marketplace Pro Upgrade',
        merchantUrls: {
          redirectUrl: returnUrl || 'https://marketplace.cloudnestle.com/payment/callback'
        }
      }
    }

    const paymentResponse = await createPayment(authResponse.access_token, paymentData)

    if (paymentResponse.orderId && paymentResponse.redirectUrl) {
      // Store transaction
      // Extract solution information from query parameters or body
      const solutionId = body.solution_id || queryParams.solution_id || 'marketplace'
      const solutionName = body.solution_name || queryParams.solution_name || 'Marketplace Pro'

      // Track user location for analytics (optional - won't break if it fails)
      const locationData = await trackUserLocation(event, user.userId, solutionId, 'payment_initiated')

      const transactionData = {
        transactionId: merchantOrderId,
        phonePeOrderId: paymentResponse.orderId,
        userId: user.userId,
        userEmail: userEmail,
        amount: 299,
        currency: 'INR',
        type: 'pro_upgrade',
        status: 'initiated',
        paymentMethod: 'phonepe',
        returnUrl: returnUrl, // Store return URL for callback
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phonePeResponse: paymentResponse,
        
        // NEW OPTIONAL FIELDS FOR ANALYTICS
        solution_id: solutionId,
        solution_name: solutionName,
        country: locationData?.country || 'Unknown',
        countryCode: locationData?.countryCode || 'XX',
        city: locationData?.city || 'Unknown',
        device: locationData?.device || 'unknown',
        browser: locationData?.browser || 'unknown'
      }

      const putCommand = new PutCommand({
        TableName: PAYMENT_TRANSACTIONS_TABLE,
        Item: transactionData
      })
      await docClient.send(putCommand)

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Payment initiated successfully',
          paymentUrl: paymentResponse.redirectUrl,
          transactionId: merchantOrderId,
          orderId: paymentResponse.orderId
        })
      }
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Failed to initiate payment',
          error: paymentResponse
        })
      }
    }

  } catch (error) {
    console.error('Upgrade to Pro error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      })
    }
  }
}
