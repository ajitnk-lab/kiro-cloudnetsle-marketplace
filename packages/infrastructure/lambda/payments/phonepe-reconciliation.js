const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

// Get PhonePe order status from their API
const getPhonePeOrderStatus = async (merchantOrderId) => {
  const config = {
    baseUrl: process.env.PHONEPE_ENVIRONMENT === 'production' 
      ? 'https://api.phonepe.com/apis/pg' 
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox',
    authToken: process.env.PHONEPE_AUTH_TOKEN
  }
  
  // Skip PhonePe API calls if auth token is not configured
  if (!config.authToken || config.authToken === 'your-phonepe-auth-token') {
    console.log(`Skipping PhonePe API call for ${merchantOrderId} - auth token not configured`)
    return null
  }
  
  try {
    const response = await fetch(
      `${config.baseUrl}/checkout/v2/order/${merchantOrderId}/status?details=true&errorContext=true`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${config.authToken}`
        }
      }
    )

    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error(`Error fetching PhonePe status for ${merchantOrderId}:`, error)
    return null
  }
}

// Get user details for transaction
const getUserDetails = async (userId) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: process.env.USER_TABLE,
      Key: { userId }
    }))
    return result.Item
  } catch (error) {
    console.error('Error fetching user details:', error)
    return null
  }
}

// Generate comprehensive reconciliation report
const generateReconciliationReport = async (startDate, endDate, filters = {}) => {
  // Get all transactions in date range
  let filterExpression = 'createdAt BETWEEN :start AND :end'
  let expressionValues = {
    ':start': startDate,
    ':end': endDate
  }

  // Add optional filters
  if (filters.solution) {
    filterExpression += ' AND solution_id = :solution'
    expressionValues[':solution'] = filters.solution
  }
  if (filters.tier) {
    filterExpression += ' AND user_tier = :tier'
    expressionValues[':tier'] = filters.tier
  }
  if (filters.country) {
    filterExpression += ' AND country = :country'
    expressionValues[':country'] = filters.country
  }

  const transactionsParams = {
    TableName: process.env.PAYMENT_TRANSACTIONS_TABLE,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionValues
  }

  const transactions = await docClient.send(new ScanCommand(transactionsParams))
  
  const report = {
    summary: {
      total_transactions: 0,
      by_status: {
        initiated: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        refunded: 0,
        settled: 0
      },
      by_solution: {},
      by_tier: {},
      by_user_type: {},
      by_payment_mode: {},
      by_country: {},
      amounts: {
        total_amount: 0,
        completed_amount: 0,
        failed_amount: 0,
        refunded_amount: 0,
        pending_amount: 0
      }
    },
    transactions: [],
    discrepancies: [],
    settlement_summary: {
      total_settlements: 0,
      settlement_amount: 0,
      pending_settlements: 0,
      failed_settlements: 0
    }
  }

  // Process each transaction
  for (const transaction of transactions.Items) {
    report.summary.total_transactions++
    const amount = transaction.amount || 0
    report.summary.amounts.total_amount += amount

    // Get user details
    const userDetails = transaction.userId ? await getUserDetails(transaction.userId) : null
    
    // Get latest PhonePe status (skip if auth not configured)
    const phonePeStatus = await getPhonePeOrderStatus(
      transaction.phonepe_order_id || transaction.transactionId
    )

    const reconciliationItem = {
      // Transaction Details
      transaction_id: transaction.transactionId,
      merchant_order_id: transaction.phonepe_order_id || transaction.transactionId,
      amount: amount,
      currency: 'INR',
      created_at: transaction.createdAt,
      
      // User & Business Context
      user_id: transaction.userId,
      user_email: userDetails?.email,
      user_name: `${userDetails?.firstName || ''} ${userDetails?.lastName || ''}`.trim(),
      user_role: userDetails?.role || 'customer',
      user_tier: transaction.user_tier || userDetails?.tier || 'free',
      solution_id: transaction.solution_id || 'marketplace',
      solution_name: transaction.solution_name || (transaction.solution_id === 'faiss' ? 'FAISS Search' : 'Marketplace'),
      
      // Geographic Info
      country: transaction.country || userDetails?.country || 'Unknown',
      city: transaction.city,
      timezone: transaction.timezone,
      
      // Payment Status
      marketplace_status: transaction.status,
      phonepe_status: phonePeStatus?.state || transaction.status || 'UNKNOWN',
      payment_mode: phonePeStatus?.paymentDetails?.[0]?.paymentMode || 'UPI',
      
      // PhonePe Details
      phonepe_transaction_id: phonePeStatus?.paymentDetails?.[0]?.transactionId,
      phonepe_timestamp: phonePeStatus?.paymentDetails?.[0]?.timestamp,
      utr: phonePeStatus?.paymentDetails?.[0]?.rail?.utr,
      upi_transaction_id: phonePeStatus?.paymentDetails?.[0]?.rail?.upiTransactionId,
      vpa: phonePeStatus?.paymentDetails?.[0]?.rail?.vpa,
      
      // Error Details
      error_code: phonePeStatus?.errorCode,
      detailed_error_code: phonePeStatus?.detailedErrorCode,
      error_description: phonePeStatus?.errorContext?.description,
      
      // Settlement Info
      settlement_status: phonePeStatus?.state === 'COMPLETED' ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
      settlement_date: phonePeStatus?.state === 'COMPLETED' ? 
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null, // T+2 settlement
      
      // Full PhonePe Response
      phonepe_data: phonePeStatus
    }

    // Update summary counters
    const status = phonePeStatus?.state || transaction.status || 'UNKNOWN'
    const tier = reconciliationItem.user_tier
    const solution = reconciliationItem.solution_id
    const userType = reconciliationItem.user_role
    const paymentMode = reconciliationItem.payment_mode
    const country = reconciliationItem.country

    // Status counters
    switch (status) {
      case 'PENDING':
        report.summary.by_status.pending++
        report.summary.amounts.pending_amount += amount
        break
      case 'COMPLETED':
        report.summary.by_status.completed++
        report.summary.amounts.completed_amount += amount
        report.summary.settlement_summary.total_settlements++
        report.summary.settlement_summary.settlement_amount += amount
        break
      case 'FAILED':
        report.summary.by_status.failed++
        report.summary.amounts.failed_amount += amount
        break
      default:
        report.summary.by_status.initiated++
    }

    // Business dimension counters
    report.summary.by_tier[tier] = (report.summary.by_tier[tier] || 0) + 1
    report.summary.by_solution[solution] = (report.summary.by_solution[solution] || 0) + 1
    report.summary.by_user_type[userType] = (report.summary.by_user_type[userType] || 0) + 1
    report.summary.by_country[country] = (report.summary.by_country[country] || 0) + 1
    
    if (paymentMode) {
      report.summary.by_payment_mode[paymentMode] = (report.summary.by_payment_mode[paymentMode] || 0) + 1
    }

    // Check for discrepancies
    if (transaction.status !== status.toLowerCase()) {
      report.discrepancies.push({
        transaction_id: transaction.transactionId,
        user_email: reconciliationItem.user_email,
        solution: reconciliationItem.solution_name,
        tier: reconciliationItem.user_tier,
        marketplace_status: transaction.status,
        phonepe_status: status,
        amount: amount,
        created_at: transaction.createdAt
      })
    }

    report.transactions.push(reconciliationItem)

    // Update our database with latest PhonePe status
    if (phonePeStatus) {
      await docClient.send(new UpdateCommand({
        TableName: process.env.PAYMENT_TRANSACTIONS_TABLE,
        Key: { transactionId: transaction.transactionId },
        UpdateExpression: 'SET phonepe_status = :status, phonepe_data = :data, last_sync = :sync',
        ExpressionAttributeValues: {
          ':status': phonePeStatus.state,
          ':data': phonePeStatus,
          ':sync': new Date().toISOString()
        }
      }))
    }
  }

  return report
}

exports.handler = async (event) => {
  console.log('PhonePe Reconciliation API called:', JSON.stringify(event, null, 2))

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: corsHeaders, body: '' }
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

    const { action, startDate, endDate, transactionId, filters } = JSON.parse(event.body || '{}')

    switch (action) {
      case 'generate_report':
        const report = await generateReconciliationReport(
          startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate || new Date().toISOString(),
          filters || {}
        )
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            report,
            timestamp: new Date().toISOString()
          })
        }

      case 'sync_transaction':
        if (!transactionId) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Transaction ID required' })
          }
        }

        const phonePeData = await getPhonePeOrderStatus(transactionId)
        if (phonePeData) {
          await docClient.send(new UpdateCommand({
            TableName: process.env.PAYMENT_TRANSACTIONS_TABLE,
            Key: { transactionId },
            UpdateExpression: 'SET phonepe_status = :status, phonepe_data = :data, last_sync = :sync',
            ExpressionAttributeValues: {
              ':status': phonePeData.state,
              ':data': phonePeData,
              ':sync': new Date().toISOString()
            }
          }))
        }

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            phonepe_data: phonePeData,
            timestamp: new Date().toISOString()
          })
        }

      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid action' })
        }
    }

  } catch (error) {
    console.error('Reconciliation error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
