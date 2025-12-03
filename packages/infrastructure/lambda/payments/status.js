const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

exports.handler = async (event) => {
  console.log('Payment status check called:', JSON.stringify(event, null, 2))
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  try {
    const transactionId = event.pathParameters?.transactionId

    if (!transactionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false, 
          message: 'Transaction ID is required' 
        })
      }
    }

    // Get transaction from database
    const transactionResponse = await docClient.send(new GetCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Key: { transactionId }
    }))

    if (!transactionResponse.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Transaction not found'
        })
      }
    }

    const transaction = transactionResponse.Item
    
    // Map database status to frontend status
    const statusMapping = {
      'initiated': 'PENDING',
      'pending': 'PENDING', 
      'completed': 'COMPLETED',
      'failed': 'FAILED'
    }

    const frontendStatus = statusMapping[transaction.status] || 'UNKNOWN'

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        status: frontendStatus,
        transactionId,
        merchantOrderId: transaction.gatewayOrderId,
        amount: transaction.amount / 100, // Convert from paisa to rupees
        currency: transaction.currency,
        paymentGateway: transaction.paymentGateway,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        message: `Payment ${transaction.status}`
      })
    }

  } catch (error) {
    console.error('Payment status check error:', error)
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
