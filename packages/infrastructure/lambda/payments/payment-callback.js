const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')
const crypto = require('crypto')
const { getCountryFromRequest } = require('../utils/geo-utils')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const USER_TABLE = process.env.USER_TABLE
const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE
const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE

// Webhook credentials
const WEBHOOK_USERNAME = 'MarketplaceWebhook'
const WEBHOOK_PASSWORD = 'webhookSecret2025'

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

exports.handler = async (event) => {
  console.log('Payment callback:', JSON.stringify(event, null, 2))

  try {
    // Handle PhonePe webhook (POST) vs direct callback (GET)
    if (event.httpMethod === 'POST') {
      return await handlePhonePeWebhook(event)
    } else {
      return await handleDirectCallback(event)
    }
  } catch (error) {
    console.error('Payment callback error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

async function handlePhonePeWebhook(event) {
  console.log('Handling PhonePe webhook...')
  
  // Verify webhook authentication - PhonePe uses SHA256(username:password)
  const authHeader = event.headers.Authorization || event.headers.authorization
  if (!authHeader) {
    console.error('Missing Authorization header')
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  // Calculate expected SHA256 hash
  const expectedHash = crypto.createHash('sha256')
    .update(`${WEBHOOK_USERNAME}:${WEBHOOK_PASSWORD}`)
    .digest('hex')

  if (authHeader !== expectedHash) {
    console.error('Invalid webhook credentials. Expected:', expectedHash, 'Received:', authHeader)
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid credentials' })
    }
  }

  // Parse webhook payload
  const payload = JSON.parse(event.body)
  console.log('PhonePe webhook payload:', payload)

  const { event: eventType, payload: payloadData } = payload
  const { merchantOrderId, orderId, state } = payloadData || {}

  if (!merchantOrderId) {
    console.error('Missing merchantOrderId in webhook')
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing merchantOrderId' })
    }
  }

  // Map PhonePe events to our status
  let transactionStatus
  if (eventType === 'checkout.order.completed' && state === 'COMPLETED') {
    transactionStatus = 'completed'
  } else if (eventType === 'checkout.order.failed' || state === 'FAILED') {
    transactionStatus = 'failed'
  } else {
    transactionStatus = 'pending'
  }

  await updateTransactionAndUser(merchantOrderId, transactionStatus, payload)

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, message: 'Webhook processed' })
  }
}

async function handleDirectCallback(event) {
  console.log('Handling direct callback...')
  
  const { transactionId, status } = event.queryStringParameters || {}

  if (!transactionId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: '<h1>Invalid callback - missing transaction ID</h1>'
    }
  }

  const transactionStatus = status === 'success' ? 'completed' : 'failed'
  const result = await updateTransactionAndUser(transactionId, transactionStatus, { directCallback: true })

  if (result.isExternalReturn) {
    return {
      statusCode: 302,
      headers: { 'Location': result.redirectUrl },
      body: ''
    }
  } else {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: result.htmlResponse
    }
  }
}

async function updateTransactionAndUser(transactionId, status, webhookData = {}) {
  console.log(`Updating transaction ${transactionId} to status: ${status}`)

  // Get transaction details
  const getTransactionCommand = new GetCommand({
    TableName: PAYMENT_TRANSACTIONS_TABLE,
    Key: { transactionId }
  })
  const transactionResult = await docClient.send(getTransactionCommand)

  if (!transactionResult.Item) {
    console.error(`Transaction not found: ${transactionId}`)
    throw new Error('Transaction not found')
  }

  const transaction = transactionResult.Item

  // Update transaction status
  const updateTransactionCommand = new UpdateCommand({
    TableName: PAYMENT_TRANSACTIONS_TABLE,
    Key: { transactionId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, webhookData = :webhookData',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString(),
      ':webhookData': webhookData
    }
  })
  await docClient.send(updateTransactionCommand)

  // If payment successful, upgrade user to pro
  if (status === 'completed') {
    console.log(`Upgrading user ${transaction.userId} to Pro tier`)
    
    const updateUserCommand = new UpdateCommand({
      TableName: USER_TABLE,
      Key: { userId: transaction.userId },
      UpdateExpression: 'SET awsFinderTier = :tier, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':tier': 'pro',
        ':updatedAt': new Date().toISOString()
      }
    })
    await docClient.send(updateUserCommand)

    // Create or update entitlement for aws-solution-finder
    if (USER_SOLUTION_ENTITLEMENTS_TABLE) {
      try {
        const solutionId = 'aws-solution-finder'
        const pk = `user#${transaction.userId}`
        const sk = `solution#${solutionId}`
        
        // Check if entitlement already exists
        const existingEntitlement = await docClient.send(new QueryCommand({
          TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
          KeyConditionExpression: 'pk = :pk AND sk = :sk',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':sk': sk
          }
        }))

        if (existingEntitlement.Items && existingEntitlement.Items.length > 0) {
          // Update existing entitlement to pro tier
          const updateEntitlementCommand = new UpdateCommand({
            TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
            Key: { pk, sk },
            UpdateExpression: 'SET tier = :tier, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':tier': 'pro',
              ':updatedAt': new Date().toISOString()
            }
          })
          await docClient.send(updateEntitlementCommand)
          console.log(`Updated entitlement for ${transaction.userId}:${solutionId} to Pro tier`)
        } else {
          // Create new entitlement
          const token = crypto.randomBytes(32).toString('hex')
          const entitlement = {
            pk,
            sk,
            userId: transaction.userId,
            solutionId,
            token,
            tier: 'pro',
            dailyUsage: 0,
            lastUsageDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          await docClient.send(new PutCommand({
            TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
            Item: entitlement
          }))
          console.log(`Created Pro entitlement for ${transaction.userId}:${solutionId} with token ${token}`)
        }
      } catch (error) {
        console.error('Error creating/updating solution entitlement:', error)
        // Don't fail the payment callback if entitlement creation fails
      }
    }

    console.log(`User ${transaction.userId} successfully upgraded to Pro`)
  }

  // Determine return URL and response
  const returnUrl = transaction.returnUrl || 'https://marketplace.cloudnestle.com/profile'
  const isExternalReturn = returnUrl.includes('awssolutionfinder.solutions.cloudnestle.com')

  if (isExternalReturn) {
    // For external solutions, redirect with status parameters
    const redirectUrl = new URL(returnUrl)
    redirectUrl.searchParams.set('upgrade_status', status === 'completed' ? 'success' : 'failed')
    if (status === 'completed') {
      redirectUrl.searchParams.set('tier', 'pro')
    }
    
    return {
      isExternalReturn: true,
      redirectUrl: redirectUrl.toString()
    }
  } else {
    // For marketplace pages, return HTML response
    const htmlResponse = status === 'completed' ? 
      `<html>
        <head><title>Payment Successful</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: green;">✅ Payment Successful!</h1>
          <p>Your account has been upgraded to Pro.</p>
          <p>You now have unlimited access to all solutions.</p>
          <a href="${returnUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Continue</a>
        </body>
      </html>` :
      `<html>
        <head><title>Payment Failed</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: red;">❌ Payment Failed</h1>
          <p>Your payment could not be processed.</p>
          <a href="${returnUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Try Again</a>
        </body>
      </html>`

    return {
      isExternalReturn: false,
      htmlResponse
    }
  }
}
