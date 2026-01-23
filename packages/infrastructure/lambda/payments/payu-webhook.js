const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const crypto = require('crypto')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }
})
const sesClient = new SESClient({})
const secretsClient = new SecretsManagerClient({ region: 'us-east-1' })

const USER_TABLE = process.env.USER_TABLE
const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE
const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE
const SUBSCRIPTION_HISTORY_TABLE = process.env.SUBSCRIPTION_HISTORY_TABLE

// PayU webhook IP addresses (from https://docs.payu.in/docs/webhooks)
const PAYU_WEBHOOK_IPS = [
  '52.140.8.88',
  '52.140.8.89',
  '180.179.174.2',
  '180.179.165.250',
  '52.140.8.64',
  '52.140.8.65',
  '3.6.73.183',
  '3.7.89.1',
  '3.7.89.2',
  '3.7.89.3',
  '3.7.89.8',
  '3.7.89.9',
  '3.7.89.10',
  '3.6.83.44'
]

const getPayUCredentials = async () => {
  const command = new GetSecretValueCommand({
    SecretId: 'marketplace/payu/credentials'
  })
  const response = await secretsClient.send(command)
  return JSON.parse(response.SecretString)
}

const verifyPaymentWithPayU = async (txnId, key, salt) => {
  const command = 'verify_payment'
  const hashString = `${key}|${command}|${txnId}|${salt}`
  const hash = crypto.createHash('sha512').update(hashString).digest('hex')
  
  const formData = new URLSearchParams({
    key,
    command,
    var1: txnId,
    hash
  })
  
  console.log('Calling PayU Verify Payment API for:', txnId)
  
  const https = require('https')
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'info.payu.in',
      path: '/merchant/postservice.php?form=2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': formData.toString().length
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log('PayU Verify API response:', response)
          resolve(response)
        } catch (error) {
          console.error('Failed to parse PayU response:', data)
          reject(new Error('Invalid PayU response'))
        }
      })
    })
    
    req.on('error', reject)
    req.write(formData.toString())
    req.end()
  })
}

// Helper function to record subscription history (reused from Cashfree)
async function recordSubscriptionHistory(userId, userEmail, solutionId, action, fromTier, toTier, startDate, endDate) {
  try {
    await docClient.send(new PutCommand({
      TableName: SUBSCRIPTION_HISTORY_TABLE,
      Item: {
        userId,
        timestamp: new Date().toISOString(),
        userEmail,
        solutionId,
        action,
        fromTier,
        toTier,
        startDate,
        endDate,
        recordedAt: new Date().toISOString()
      }
    }))
    console.log(`Recorded subscription history: ${action} from ${fromTier} to ${toTier}`)
  } catch (error) {
    console.error('Failed to record subscription history:', error)
  }
}

exports.handler = async (event) => {
  console.log('PayU webhook received:', JSON.stringify(event, null, 2))

  try {
    // Verify source IP is from PayU
    const sourceIp = event.requestContext?.identity?.sourceIp || event.headers?.['X-Forwarded-For']?.split(',')[0]
    
    if (sourceIp && !PAYU_WEBHOOK_IPS.includes(sourceIp.trim())) {
      console.error('Webhook rejected: Invalid source IP:', sourceIp)
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Forbidden: Invalid source IP' })
      }
    }
    
    console.log('✅ Source IP verified:', sourceIp)

    // PayU sends data as form-encoded or query parameters
    let data = {}
    
    if (event.body) {
      // Try to parse as JSON first, then as form data
      try {
        data = JSON.parse(event.body)
      } catch {
        // Parse form-encoded data
        const params = new URLSearchParams(event.body)
        for (const [key, value] of params) {
          data[key] = value
        }
      }
    } else if (event.queryStringParameters) {
      data = event.queryStringParameters
    }

    console.log('Parsed PayU webhook data:', data)

    // PayU sends BOTH txnid and merchantTransactionId - accept either
    const { 
      txnid,
      merchantTransactionId,
      status, 
      amount, 
      productinfo,
      productInfo,
      firstname,
      customerName,
      email,
      customerEmail,
      phone, 
      customerPhone,
      hash, 
      udf1, 
      udf2, 
      udf3, 
      udf4, 
      udf5,
      mihpayid,
      mode,
      bank_ref_num,
      bankRefNum
    } = data
    
    const transactionId = txnid || merchantTransactionId

    if (!transactionId) {
      console.log('Missing transaction ID (txnid or merchantTransactionId), returning 400')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing transaction ID' })
      }
    }

    // Verify payment directly with PayU API (more reliable than webhook hash)
    const credentials = await getPayUCredentials()
    
    const verifyResponse = await verifyPaymentWithPayU(
      transactionId,
      credentials.key,
      credentials.salt
    )
    
    // Check if PayU confirms this transaction
    if (verifyResponse.status !== 1) {
      console.error('PayU Verify API failed:', verifyResponse)
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Transaction verification failed',
          message: verifyResponse.msg 
        })
      }
    }
    
    const verifiedTxn = verifyResponse.transaction_details?.[transactionId]
    if (!verifiedTxn) {
      console.error('Transaction not found in PayU verify response')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Transaction not verified by PayU' })
      }
    }
    
    console.log('✅ Payment verified with PayU API:', verifiedTxn)
    
    // Use verified status from PayU API (authoritative source)
    const verifiedStatus = verifiedTxn.status?.toLowerCase()
    const verifiedAmount = verifiedTxn.amount

    // Get transaction record
    const transactionResponse = await docClient.send(new GetCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Key: { transactionId }
    }))

    if (!transactionResponse.Item) {
      console.error('Transaction not found:', transactionId)
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

    console.log('Processing PayU webhook for transaction:', {
      transactionId,
      status,
      amount,
      userId,
      solutionId,
      currentStatus: transaction.status
    })

    // Idempotency check: Skip entitlement updates if already processed
    const alreadyProcessed = transaction.status === 'completed' && verifiedStatus === 'success'
    
    if (alreadyProcessed) {
      console.log('⚠️ Transaction already processed - checking if invoice needs to be sent')
      
      // Check if invoice was already sent
      if (transaction.invoiceSent) {
        console.log('Invoice already sent - skipping duplicate webhook')
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'Transaction already processed - duplicate webhook ignored' 
          })
        }
      }
      
      // Invoice not sent yet - trigger it now
      if (transaction.billingCountry && process.env.INVOICE_LAMBDA_NAME) {
        try {
          const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda')
          const lambdaClient = new LambdaClient({})
          
          await lambdaClient.send(new InvokeCommand({
            FunctionName: process.env.INVOICE_LAMBDA_NAME,
            InvocationType: 'Event',
            Payload: JSON.stringify({ 
              transactionId, 
              customerEmail: transaction.customerEmail 
            })
          }))
          
          // Mark invoice as sent
          await docClient.send(new UpdateCommand({
            TableName: PAYMENT_TRANSACTIONS_TABLE,
            Key: { transactionId },
            UpdateExpression: 'SET invoiceSent = :sent, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':sent': true,
              ':updatedAt': new Date().toISOString()
            }
          }))
          
          console.log('✅ Invoice generation triggered for already-completed transaction')
        } catch (invoiceError) {
          console.error('Failed to trigger invoice generation:', invoiceError)
        }
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Invoice triggered for completed transaction' 
        })
      }
    }

    // Update transaction status based on verified PayU status
    let transactionStatus = 'failed' // Default
    let shouldUpdateEntitlements = false
    
    // Handle different PayU statuses (use verified status from API)
    switch (verifiedStatus) {
      case 'success':
        transactionStatus = 'completed'
        shouldUpdateEntitlements = true
        console.log('✅ PayU payment verified as successful:', transactionId)
        break
      case 'failure':
      case 'failed':
        transactionStatus = 'failed'
        console.log('❌ PayU payment verified as failed:', transactionId)
        break
      case 'pending':
        transactionStatus = 'pending'
        console.log('⏳ PayU payment verified as pending:', transactionId)
        break
      case 'refund':
        transactionStatus = 'refunded'
        console.log('💰 PayU payment verified as refunded:', transactionId)
        break
      default:
        transactionStatus = 'unknown'
        console.log('❓ PayU unknown verified status:', transactionId, verifiedStatus)
    }

    const updateParams = {
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      Key: { transactionId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, gateway_response = :response',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': transactionStatus,
        ':updatedAt': new Date().toISOString(),
        ':response': data
      }
    }

    await docClient.send(new UpdateCommand(updateParams))

    // If payment successful, update user entitlements
    if (shouldUpdateEntitlements) {
      console.log('Payment successful, updating entitlements...')

      const currentDate = new Date()
      const expiryDate = new Date(currentDate)
      expiryDate.setMonth(expiryDate.getMonth() + 1) // 1 month subscription

      // Update user entitlements
      await docClient.send(new PutCommand({
        TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
        Item: {
          pk: `user#${userId}`,
          sk: `solution#${solutionId}`,
          userId,
          solutionId,
          access_tier: 'pro',
          status: 'active',
          startDate: currentDate.toISOString(),
          endDate: expiryDate.toISOString(),
          pro_expires_at: expiryDate.toISOString(),
          paymentGateway: 'payu',
          transactionId,
          createdAt: currentDate.toISOString(),
          updatedAt: currentDate.toISOString()
        }
      }))

      // Update user tier in users table
      await docClient.send(new UpdateCommand({
        TableName: USER_TABLE,
        Key: { userId },
        UpdateExpression: 'SET tier = :tier, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':tier': 'pro',
          ':updatedAt': currentDate.toISOString()
        }
      }))

      // Record subscription history
      await recordSubscriptionHistory(
        userId,
        email || transaction.customerEmail,
        solutionId,
        'upgrade',
        'registered',
        'pro',
        currentDate.toISOString(),
        expiryDate.toISOString()
      )

      console.log('✅ PayU entitlements updated successfully for:', transactionId)
      
      // Trigger invoice generation if billing info exists
      if (transaction.billingCountry && process.env.INVOICE_LAMBDA_NAME) {
        try {
          const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda')
          const lambdaClient = new LambdaClient({})
          
          await lambdaClient.send(new InvokeCommand({
            FunctionName: process.env.INVOICE_LAMBDA_NAME,
            InvocationType: 'Event',
            Payload: JSON.stringify({ transactionId, customerEmail: email || transaction.customerEmail })
          }))
          
          // Mark invoice as sent
          await docClient.send(new UpdateCommand({
            TableName: PAYMENT_TRANSACTIONS_TABLE,
            Key: { transactionId },
            UpdateExpression: 'SET invoiceSent = :sent, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':sent': true,
              ':updatedAt': new Date().toISOString()
            }
          }))
          
          console.log('✅ Invoice generation triggered')
        } catch (invoiceError) {
          console.error('Failed to trigger invoice generation:', invoiceError)
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      })
    }

  } catch (error) {
    console.error('PayU webhook processing error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error.message 
      })
    }
  }
}
