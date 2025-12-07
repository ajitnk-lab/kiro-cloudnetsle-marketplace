const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const https = require('https')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const secretsClient = new SecretsManagerClient({})

const USER_TABLE = process.env.USER_TABLE
const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE
const AWS_REGION = process.env.AWS_REGION_NAME || process.env.AWS_REGION || 'us-west-1'

// Construct API URL at runtime to avoid circular dependency
const getApiBaseUrl = () => {
  const apiId = process.env.API_GATEWAY_ID || 'juvt4m81ld'
  return `https://${apiId}.execute-api.${AWS_REGION}.amazonaws.com/prod`
}

const getCashfreeCredentials = async () => {
  const command = new GetSecretValueCommand({
    SecretId: 'marketplace/cashfree/credentials'
  })
  const response = await secretsClient.send(command)
  return JSON.parse(response.SecretString)
}

const createCashfreeOrder = async (credentials, orderData) => {
  const postData = JSON.stringify(orderData)

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cashfree.com',
      port: 443,
      path: '/pg/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': credentials.apiVersion || '2025-01-01',
        'x-client-id': credentials.appId,
        'x-client-secret': credentials.secretKey,
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

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  try {
    const body = JSON.parse(event.body)
    const { userEmail, returnUrl } = body

    if (!userEmail) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, message: 'Missing userEmail' })
      }
    }

    // Get user by email
    const userResponse = await docClient.send(new QueryCommand({
      TableName: USER_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': userEmail
      }
    }))

    if (!userResponse.Items || userResponse.Items.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, message: 'User not found' })
      }
    }

    const user = userResponse.Items[0]
    const credentials = await getCashfreeCredentials()
    const transactionId = `CF_PRO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const orderData = {
      order_id: transactionId,
      order_amount: 299, // ₹299
      order_currency: 'INR',
      customer_details: {
        customer_id: user.userId,
        customer_phone: user.profile?.phone || '9999999999',
        customer_email: userEmail
      },
      order_meta: {
        return_url: returnUrl || 'https://marketplace.cloudnestle.com/profile',
        notify_url: `${getApiBaseUrl()}/payments/cashfree-webhook`
      }
    }

    // Create transaction record
    await docClient.send(new PutCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Item: {
        transactionId,
        userId: user.userId,
        userEmail: userEmail,
        solutionId: 'aws-solution-finder-001',
        amount: 29900, // Store in paisa
        currency: 'INR',
        paymentGateway: 'cashfree',
        gatewayOrderId: transactionId,
        status: 'initiated',
        type: 'pro_upgrade',
        returnUrl: returnUrl,
        createdAt: new Date().toISOString(),
        gateway_data: {
          order_id: transactionId
        }
      }
    }))

    const cashfreeResponse = await createCashfreeOrder(credentials, orderData)

    if (cashfreeResponse.payment_session_id) {
      const paymentUrl = `https://payments.cashfree.com/pg/view/order/${cashfreeResponse.payment_session_id}`
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          paymentUrl,
          transactionId,
          gateway: 'cashfree',
          amount: 299,
          sessionId: cashfreeResponse.payment_session_id
        })
      }
    } else {
      throw new Error('Failed to create Cashfree order')
    }

  } catch (error) {
    console.error('Upgrade to Pro error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false, 
        message: 'Payment initiation failed',
        error: error.message 
      })
    }
  }
}
