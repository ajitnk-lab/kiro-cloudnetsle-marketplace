const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }
})
const sesClient = new SESClient({})

const USER_TABLE = process.env.USER_TABLE
const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE
const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE
const SOLUTION_TABLE_NAME = process.env.SOLUTION_TABLE_NAME

exports.handler = async (event) => {
  console.log('Cashfree webhook received:', JSON.stringify(event, null, 2))

  try {
    const body = JSON.parse(event.body)
    const data = body.data || body
    
    // Extract order and payment details from Cashfree webhook structure
    const order_id = data.order?.order_id || data.order_id
    const payment_status = data.payment?.payment_status || data.payment_status
    const order_status = data.order?.order_status || data.order_status
    const payment_amount = data.payment?.payment_amount || data.payment_amount
    const payment_currency = data.payment?.payment_currency || data.payment_currency

    console.log('Extracted webhook data:', {
      order_id,
      payment_status,
      order_status,
      payment_amount,
      payment_currency
    })

    if (!order_id) {
      console.log('Missing order_id, returning 400')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing order_id' })
      }
    }

    // Get transaction record
    const transactionResponse = await docClient.send(new GetCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Key: { transactionId: order_id }
    }))

    if (!transactionResponse.Item) {
      console.error('Transaction not found:', order_id)
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Transaction not found - webhook acknowledged' 
        })
      }
    }

    const transaction = transactionResponse.Item
    const { userId, solutionId } = transaction

    // Check if already processed to avoid duplicate processing
    const isSuccessful = payment_status === 'SUCCESS' || order_status === 'PAID'
    const isFailed = payment_status === 'FAILED' || order_status === 'FAILED'
    
    if (transaction.status === 'completed' && isSuccessful) {
      console.log('Transaction already processed successfully, returning 200')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Webhook already processed successfully' 
        })
      }
    }

    const newStatus = isSuccessful ? 'completed' : 
                     isFailed ? 'failed' : 'pending'

    console.log('Payment status determination:', {
      payment_status,
      order_status,
      isSuccessful,
      isFailed,
      newStatus,
      currentStatus: transaction.status
    })

    // Update transaction status with conditional update to prevent race conditions
    try {
      await docClient.send(new UpdateCommand({
        TableName: PAYMENT_TRANSACTIONS_TABLE,
        Key: { transactionId: order_id },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, gateway_data = :gateway_data',
        ConditionExpression: '#status <> :completedStatus OR attribute_not_exists(#status)',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': newStatus,
          ':completedStatus': 'completed',
          ':updatedAt': new Date().toISOString(),
          ':gateway_data': {
            ...(transaction.gateway_data || {}),
            payment_status,
            order_status,
            payment_amount,
            payment_currency,
            webhook_received_at: new Date().toISOString(),
            full_webhook_data: JSON.stringify(data)
          }
        }
      }))
      console.log('Transaction status updated successfully')
    } catch (updateError) {
      if (updateError.name === 'ConditionalCheckFailedException') {
        console.log('Transaction already completed by another webhook, returning success')
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'Webhook processed (already completed)' 
          })
        }
      }
      throw updateError
    }

    // If payment successful, update user entitlement
    if (isSuccessful) {
      console.log('Processing successful payment for user:', userId, 'solution:', solutionId)
      console.log('Transaction details:', { 
        token: transaction.token, 
        hasToken: !!transaction.token,
        transactionKeys: Object.keys(transaction)
      })
      
      // Get user details
      const userResponse = await docClient.send(new GetCommand({
        TableName: USER_TABLE,
        Key: { userId }
      }))

      if (userResponse.Item) {
        const user = userResponse.Item

        // Find existing entitlement - first try by user and solution
        let existingEntitlementScan
        
        // Try to find by pk/sk first (more efficient)
        try {
          const directLookup = await docClient.send(new GetCommand({
            TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
            Key: {
              pk: `user#${userId}`,
              sk: `solution#${solutionId}`
            }
          }))
          
          if (directLookup.Item) {
            existingEntitlementScan = { Items: [directLookup.Item] }
          } else {
            // Fallback to scan if direct lookup fails and token exists
            if (transaction.token) {
              existingEntitlementScan = await docClient.send(new ScanCommand({
                TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
                FilterExpression: '#token = :token AND solutionId = :solutionId',
                ExpressionAttributeNames: {
                  '#token': 'token'
                },
                ExpressionAttributeValues: {
                  ':token': transaction.token,
                  ':solutionId': solutionId
                }
              }))
            } else {
              existingEntitlementScan = { Items: [] }
            }
          }
        } catch (scanError) {
          console.warn('Error finding existing entitlement:', scanError)
          existingEntitlementScan = { Items: [] }
        }

        if (existingEntitlementScan.Items && existingEntitlementScan.Items.length > 0) {
          const existingEntitlement = existingEntitlementScan.Items[0]
          
          // Update existing entitlement to Pro with 30-day expiry
          const proExpiresAt = new Date()
          proExpiresAt.setDate(proExpiresAt.getDate() + 30)
          
          await docClient.send(new UpdateCommand({
            TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
            Key: {
              pk: existingEntitlement.pk,
              sk: existingEntitlement.sk
            },
            UpdateExpression: 'SET tier = :tier, access_tier = :tier, accessTier = :tier, quota_limit = :quota, pro_expires_at = :expires, updated_at = :updated',
            ExpressionAttributeValues: {
              ':tier': 'pro',
              ':quota': -1,
              ':expires': proExpiresAt.toISOString(),
              ':updated': new Date().toISOString()
            }
          }))
          
          console.log(`Updated existing entitlement to Pro for user ${user.email} solution ${solutionId}`)
        } else {
          // Create new entitlement if none exists with 30-day expiry
          const newToken = transaction.token || `tok_perm_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
          const proExpiresAt = new Date()
          proExpiresAt.setDate(proExpiresAt.getDate() + 30)
          
          await docClient.send(new PutCommand({
            TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
            Item: {
              pk: `user#${userId}`,
              sk: `solution#${solutionId}`,
              userId: userId,
              solutionId: solutionId,
              access_tier: 'pro',
              quota_limit: -1,
              pro_expires_at: proExpiresAt.toISOString(),
              daily_usage: 0,
              last_usage_date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              token: newToken,
              status: 'active'
            }
          }))
          
          console.log(`Created new Pro entitlement for user ${user.email} solution ${solutionId} with token ${newToken}`)
        }

        // Get solution name for email
        let solutionName = 'AWS Solution Finder'
        try {
          const solutionResponse = await docClient.send(new GetCommand({
            TableName: SOLUTION_TABLE_NAME,
            Key: { solutionId }
          }))
          if (solutionResponse.Item?.name) {
            solutionName = solutionResponse.Item.name
          }
        } catch (error) {
          console.warn('Could not fetch solution name:', error)
        }

        // Send confirmation email
        try {
          await sesClient.send(new SendEmailCommand({
            Source: 'noreply@cloudnestle.com',
            Destination: { ToAddresses: [user.email] },
            Message: {
              Subject: { Data: `Payment Successful - ${solutionName} Pro Access` },
              Body: {
                Html: {
                  Data: `
                    <h2>Payment Successful!</h2>
                    <p>Dear ${user.profile?.name || user.email},</p>
                    <p>Your payment has been processed successfully via Cashfree.</p>
                    <p><strong>Transaction Details:</strong></p>
                    <ul>
                      <li>Solution: ${solutionName}</li>
                      <li>Plan: Pro (Unlimited Access)</li>
                      <li>Amount: ₹${payment_amount}</li>
                      <li>Transaction ID: ${order_id}</li>
                      <li>Payment Gateway: Cashfree</li>
                    </ul>
                    <p>You now have unlimited access to ${solutionName}.</p>
                    <p>Thank you for choosing CloudNetsle!</p>
                  `
                }
              }
            }
          }))
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError)
        }
      }
    }

    console.log('Webhook processed successfully, returning 200')
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      })
    }

  } catch (error) {
    console.error('Cashfree webhook error:', error)
    // Always return 200 to prevent Cashfree retries for processing errors
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: false,
        error: 'Webhook processing failed',
        details: error.message 
      })
    }
  }
}
