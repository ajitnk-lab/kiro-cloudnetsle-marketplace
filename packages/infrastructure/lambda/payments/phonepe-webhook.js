const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')
const crypto = require('crypto')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const sesClient = new SESClient({})

const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE
const USER_TABLE = process.env.USER_TABLE
const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE

// Generate permanent token for user-solution combination
const generatePermanentToken = (userEmail, solutionId) => {
  const hash = crypto.createHash('sha256')
  hash.update(`${userEmail}:${solutionId}:${process.env.TOKEN_SECRET || 'default-secret'}`)
  return 'tok_perm_' + hash.digest('hex').substring(0, 32)
}

// Update reconciliation data with comprehensive business context
const updateReconciliationData = async (transaction, phonePePayload, userDetails) => {
  try {
    const reconciliationUpdate = {
      // PhonePe webhook data
      phonepe_status: phonePePayload.state,
      phonepe_data: phonePePayload,
      phonepe_transaction_id: phonePePayload.transactionId,
      phonepe_timestamp: phonePePayload.timestamp || new Date().toISOString(),
      
      // Payment details
      payment_mode: phonePePayload.paymentDetails?.[0]?.paymentMode,
      utr: phonePePayload.paymentDetails?.[0]?.rail?.utr,
      upi_transaction_id: phonePePayload.paymentDetails?.[0]?.rail?.upiTransactionId,
      vpa: phonePePayload.paymentDetails?.[0]?.rail?.vpa,
      
      // Business context
      user_tier: userDetails?.subscriptionTier || 'free',
      solution_id: transaction.solution_id || 'aws-solution-finder',
      solution_name: transaction.solution_name || 'AWS Solution Finder Pro',
      country: userDetails?.country || transaction.country || 'Unknown',
      city: userDetails?.city || transaction.city,
      
      // Settlement tracking
      settlement_status: phonePePayload.state === 'COMPLETED' ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
      settlement_date: phonePePayload.state === 'COMPLETED' ? 
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
      
      // Error tracking
      error_code: phonePePayload.errorCode,
      detailed_error_code: phonePePayload.detailedErrorCode,
      error_description: phonePePayload.errorContext?.description,
      
      // Reconciliation metadata
      last_sync: new Date().toISOString(),
      webhook_processed_at: new Date().toISOString()
    }

    // Update transaction with reconciliation data
    const updateExpression = []
    const expressionAttributeValues = {}
    const expressionAttributeNames = {}

    Object.entries(reconciliationUpdate).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        updateExpression.push(`#${key} = :${key}`)
        expressionAttributeNames[`#${key}`] = key
        expressionAttributeValues[`:${key}`] = value
      }
    })

    if (updateExpression.length > 0) {
      await docClient.send(new UpdateCommand({
        TableName: PAYMENT_TRANSACTIONS_TABLE,
        Key: { transactionId: transaction.transactionId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }))

      console.log(`✅ Reconciliation data updated for transaction: ${transaction.transactionId}`)
    }

    return true
  } catch (error) {
    console.error('❌ Error updating reconciliation data:', error)
    return false
  }
}

// Update user tier to Pro
const updateUserTier = async (userId, userEmail) => {
  try {
    // Update user table
    await docClient.send(new UpdateCommand({
      TableName: USER_TABLE,
      Key: { userId },
      UpdateExpression: 'SET subscriptionTier = :tier, subscriptionStatus = :status, subscriptionStartDate = :startDate, lastPaymentDate = :paymentDate, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':tier': 'pro',
        ':status': 'active',
        ':startDate': new Date().toISOString(),
        ':paymentDate': new Date().toISOString(),
        ':updatedAt': new Date().toISOString()
      }
    }))

    // Update entitlement using UUID-based key (same as registration creates)
    const uuidPk = `user#${userId}` // Use userId (UUID), not userEmail
    const sk = `solution#aws-solution-finder`

    await docClient.send(new UpdateCommand({
      TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
      Key: { pk: uuidPk, sk },
      UpdateExpression: 'SET tier = :tier, access_tier = :tier, updatedAt = :updatedAt, #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':tier': 'pro',
        ':updatedAt': new Date().toISOString(),
        ':status': 'active'
      }
    }))

    // ALSO update email-based entitlement record (for users with old tokens from FAISS registration)
    const emailPk = `user#${userEmail}`
    
    try {
      await docClient.send(new UpdateCommand({
        TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
        Key: { pk: emailPk, sk },
        UpdateExpression: 'SET tier = :tier, access_tier = :tier, updated_at = :updatedAt, #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':tier': 'pro',
          ':updatedAt': new Date().toISOString(),
          ':status': 'active'
        }
      }))
      console.log(`✅ Updated email-based entitlement record for ${userEmail}`)
    } catch (emailUpdateError) {
      console.log(`ℹ️ Email-based entitlement record not found for ${userEmail} (this is normal for new users)`)
    }

    console.log(`✅ User ${userEmail} (${userId}) upgraded to Pro tier successfully`)
    return true
  } catch (error) {
    console.error('❌ Error updating user tier:', error)
    return false
  }
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
    console.log(`✅ Email sent to ${to}`)
  } catch (error) {
    console.error('❌ Error sending email:', error)
  }
}

exports.handler = async (event) => {
  console.log('PhonePe Webhook Handler called:', JSON.stringify(event, null, 2))
  
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
    console.log('Webhook payload:', body)

    // Extract payment information from webhook
    const { event: eventType, payload } = body
    
    if (!payload || !payload.merchantOrderId) {
      console.log('❌ Invalid webhook payload')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid webhook payload' }),
      }
    }

    const { merchantOrderId, state, amount } = payload
    
    // Get transaction from database
    const getTransactionCommand = new GetCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Key: { transactionId: `txn_${merchantOrderId}` }
    })
    
    const transactionResult = await docClient.send(getTransactionCommand)
    
    if (!transactionResult.Item) {
      console.log(`❌ Transaction not found: txn_${merchantOrderId}`)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Transaction not found' }),
      }
    }

    const transaction = transactionResult.Item
    console.log(`📋 Processing transaction: ${transaction.transactionId}`)

    // Get user details for reconciliation
    let userDetails = null
    if (transaction.userId) {
      try {
        const userResult = await docClient.send(new GetCommand({
          TableName: USER_TABLE,
          Key: { userId: transaction.userId }
        }))
        userDetails = userResult.Item
      } catch (error) {
        console.error('Error fetching user details:', error)
      }
    }

    // Update transaction status with basic webhook data
    const updateTransactionCommand = new UpdateCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Key: { transactionId: transaction.transactionId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, webhookEvent = :event, paymentState = :state',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': state,
        ':updatedAt': new Date().toISOString(),
        ':event': eventType,
        ':state': state
      }
    })

    await docClient.send(updateTransactionCommand)

    // Update comprehensive reconciliation data
    await updateReconciliationData(transaction, payload, userDetails)

    // Handle different payment states
    if (state === 'COMPLETED' && eventType === 'checkout.order.completed') {
      console.log(`✅ Payment completed for ${transaction.userEmail}`)
      
      // Update user tier to Pro
      const tierUpdateSuccess = await updateUserTier(transaction.userId, transaction.userEmail)
      
      if (tierUpdateSuccess) {
        // Send success email
        await sendEmail(
          transaction.userEmail,
          '🎉 Welcome to AWS Solution Finder Pro!',
          `
          <h2>Payment Successful - Welcome to Pro!</h2>
          <p>Dear User,</p>
          <p>Congratulations! Your payment has been processed successfully and your Pro features are now active.</p>
          <p><strong>Order ID:</strong> ${merchantOrderId}</p>
          <p><strong>Amount Paid:</strong> ₹299</p>
          <p><strong>Status:</strong> Active</p>
          <h3>🚀 Your Pro Features:</h3>
          <ul>
            <li>✅ Unlimited searches per day</li>
            <li>✅ Access to all AWS repositories</li>
            <li>✅ Saved searches and collections</li>
            <li>✅ Priority support</li>
            <li>✅ Export functionality</li>
          </ul>
          <p><a href="https://awssolutionfinder.solutions.cloudnestle.com" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Using Pro Features</a></p>
          <p>Thank you for upgrading to Pro!</p>
          <p>Best regards,<br>AWS Solution Finder Team</p>
          `
        )
      }
      
    } else if (state === 'FAILED' && eventType === 'checkout.order.failed') {
      console.log(`❌ Payment failed for ${transaction.userEmail}`)
      
      // Send failure email
      await sendEmail(
        transaction.userEmail,
        'Payment Failed - AWS Solution Finder Pro',
        `
        <h2>Payment Failed</h2>
        <p>Dear User,</p>
        <p>We're sorry, but your payment for AWS Solution Finder Pro upgrade could not be processed.</p>
        <p><strong>Order ID:</strong> ${merchantOrderId}</p>
        <p><strong>Amount:</strong> ₹299</p>
        <p><strong>Status:</strong> Failed</p>
        <p>Please try again or contact our support team if you continue to experience issues.</p>
        <p><a href="https://marketplace.cloudnestle.com/solutions/61deb2fb-6e5e-4cda-ac5d-ff20202a8788" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Try Again</a></p>
        <p>Best regards,<br>AWS Solution Finder Team</p>
        `
      )
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook processed successfully with reconciliation data',
        transactionId: transaction.transactionId,
        status: state,
        reconciliation_updated: true
      }),
    }

  } catch (error) {
    console.error('❌ Error in PhonePe webhook handler:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error.message 
      }),
    }
  }
}
