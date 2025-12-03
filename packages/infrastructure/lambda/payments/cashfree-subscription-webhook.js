const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const sesClient = new SESClient({})

const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE || 'marketplace-subscriptions'
const USER_TABLE = process.env.USER_TABLE

exports.handler = async (event) => {
  console.log('Cashfree Subscription Webhook:', JSON.stringify(event, null, 2))

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

    const body = JSON.parse(event.body || '{}')
    const { type, data } = body

    if (!type || !data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing webhook type or data' })
      }
    }

    const { subscription_id, customer_email, status, plan_id } = data

    // Update subscription record
    await docClient.send(new UpdateCommand({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { subscription_id },
      UpdateExpression: 'SET #status = :status, updated_at = :updated_at, webhook_data = :webhook_data',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': status,
        ':updated_at': new Date().toISOString(),
        ':webhook_data': data
      }
    }))

    // Update user entitlement based on subscription status
    const accessTier = ['ACTIVE', 'CHARGED'].includes(status) ? 'pro' : 'registered'
    
    await docClient.send(new UpdateCommand({
      TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
      Key: {
        pk: `user#${customer_email}`,
        sk: 'solution#aws-solution-finder-001'
      },
      UpdateExpression: 'SET access_tier = :tier, subscription_status = :sub_status, updated_at = :updated_at',
      ExpressionAttributeValues: {
        ':tier': accessTier,
        ':sub_status': status,
        ':updated_at': new Date().toISOString()
      }
    }))

    // Send notification email for important events
    if (['CANCELLED', 'PAYMENT_FAILED', 'EXPIRED'].includes(status)) {
      await sendNotificationEmail(customer_email, type, data)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Webhook processed successfully' })
    }

  } catch (error) {
    console.error('Webhook processing error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

async function sendNotificationEmail(email, eventType, data) {
  try {
    const subject = `Subscription ${eventType.replace('SUBSCRIPTION_', '')}`
    const body = `Your subscription status has been updated: ${data.status}`
    
    await sesClient.send(new SendEmailCommand({
      Source: 'noreply@cloudnestle.com',
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: body } }
      }
    }))
  } catch (error) {
    console.error('Email notification error:', error)
  }
}
