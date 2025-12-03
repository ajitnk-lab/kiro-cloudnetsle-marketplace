const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')

const client = new DynamoDBClient({ region: process.env.AWS_REGION })
const docClient = DynamoDBDocumentClient.from(client)

// Helper function to get date ranges
const getDateRange = (period) => {
  const now = new Date()
  let startDate, endDate = now

  switch (period) {
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'overall':
      startDate = new Date('2024-01-01') // Start from beginning
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
}

// Calculate MRR (Monthly Recurring Revenue)
const calculateMRR = async (period) => {
  const { startDate, endDate } = getDateRange(period)
  
  // Get all pro subscriptions in period
  const proUsers = await docClient.send(new ScanCommand({
    TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
    FilterExpression: '#tier = :pro AND createdAt BETWEEN :start AND :end',
    ExpressionAttributeNames: { '#tier': 'tier' },
    ExpressionAttributeValues: { 
      ':pro': 'pro', 
      ':start': startDate, 
      ':end': endDate 
    }
  }))

  const monthlyRevenue = proUsers.Items.length * 299 // ₹299 per pro user
  return monthlyRevenue
}

// Calculate ARPU (Average Revenue Per User)
const calculateARPU = async (period) => {
  const { startDate, endDate } = getDateRange(period)
  
  const [transactions, users] = await Promise.all([
    docClient.send(new ScanCommand({
      TableName: process.env.PAYMENT_TRANSACTIONS_TABLE,
      FilterExpression: '#status = :completed AND createdAt BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { 
        ':completed': 'completed',
        ':start': startDate, 
        ':end': endDate 
      }
    })),
    docClient.send(new ScanCommand({
      TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
      FilterExpression: 'createdAt BETWEEN :start AND :end',
      ExpressionAttributeValues: { ':start': startDate, ':end': endDate }
    }))
  ])

  const totalRevenue = transactions.Items.reduce((sum, t) => {
    return sum + (t.paymentGateway === 'cashfree' ? (t.amount || 0) / 100 : (t.amount || 0))
  }, 0)

  const activeUsers = new Set(users.Items.map(u => u.userId)).size
  return activeUsers > 0 ? totalRevenue / activeUsers : 0
}

// Calculate Churn Rate
const calculateChurnRate = async (period) => {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Users active last month
  const lastMonthUsers = await docClient.send(new ScanCommand({
    TableName: process.env.USER_SESSIONS_TABLE,
    FilterExpression: 'createdAt BETWEEN :start AND :end',
    ExpressionAttributeValues: { 
      ':start': lastMonth.toISOString(), 
      ':end': thisMonth.toISOString() 
    }
  }))

  // Users active this month
  const thisMonthUsers = await docClient.send(new ScanCommand({
    TableName: process.env.USER_SESSIONS_TABLE,
    FilterExpression: 'createdAt >= :start',
    ExpressionAttributeValues: { ':start': thisMonth.toISOString() }
  }))

  const lastMonthUserIds = new Set(lastMonthUsers.Items.map(u => u.userId))
  const thisMonthUserIds = new Set(thisMonthUsers.Items.map(u => u.userId))
  
  const churnedUsers = [...lastMonthUserIds].filter(id => !thisMonthUserIds.has(id))
  return lastMonthUserIds.size > 0 ? (churnedUsers.length / lastMonthUserIds.size) * 100 : 0
}

// Calculate Active Users
const calculateActiveUsers = async (period) => {
  const { startDate, endDate } = getDateRange(period)
  
  const sessions = await docClient.send(new ScanCommand({
    TableName: process.env.USER_SESSIONS_TABLE,
    FilterExpression: 'createdAt BETWEEN :start AND :end',
    ExpressionAttributeValues: { ':start': startDate, ':end': endDate }
  }))

  return new Set(sessions.Items.map(s => s.userId)).size
}

// Calculate Conversion Rate (overall pro conversion rate)
const calculateConversionRate = async (period) => {
  // For conversion rate, always use all-time data for meaningful metrics
  const [allUsers, proUsers] = await Promise.all([
    docClient.send(new ScanCommand({
      TableName: process.env.MARKETPLACE_USERS_TABLE
    })),
    docClient.send(new ScanCommand({
      TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
      FilterExpression: '#tier = :pro OR #tier = :Pro OR #tier = :PRO',
      ExpressionAttributeNames: { '#tier': 'tier' },
      ExpressionAttributeValues: { ':pro': 'pro', ':Pro': 'Pro', ':PRO': 'PRO' }
    }))
  ])

  const totalUsers = allUsers.Items.length
  const convertedUsers = new Set(proUsers.Items.map(u => u.userId)).size
  
  return totalUsers > 0 ? (convertedUsers / totalUsers) * 100 : 0
}

// Main handler
exports.handler = async (event) => {
  try {
    const period = event.queryStringParameters?.period || 'monthly'
    
    const [mrr, arpu, churnRate, activeUsers, conversionRate] = await Promise.all([
      calculateMRR(period),
      calculateARPU(period),
      calculateChurnRate(period),
      calculateActiveUsers(period),
      calculateConversionRate(period)
    ])

    const arr = mrr * 12 // Annual Recurring Revenue
    
    const kpis = {
      period,
      revenue: {
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        arpu: Math.round(arpu * 100) / 100
      },
      customers: {
        activeUsers,
        churnRate: Math.round(churnRate * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10
      },
      growth: {
        mrrGrowth: period === 'monthly' ? 'N/A' : 'N/A', // TODO: Calculate MoM growth
        userGrowth: period === 'monthly' ? 'N/A' : 'N/A'  // TODO: Calculate user growth
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify(kpis)
    }
  } catch (error) {
    console.error('MSME KPIs error:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to calculate MSME KPIs' })
    }
  }
}
