const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

// Calculate date ranges
const getDateRange = (range, customStart, customEnd) => {
  const now = new Date()
  let start = new Date()
  
  if (range === 'custom' && customStart && customEnd) {
    return {
      start: new Date(customStart).toISOString(),
      end: new Date(customEnd).toISOString()
    }
  }
  
  switch (range) {
    case '7d':
      start.setDate(now.getDate() - 7)
      break
    case '30d':
      start.setDate(now.getDate() - 30)
      break
    case '90d':
      start.setDate(now.getDate() - 90)
      break
    case '1y':
      start.setFullYear(now.getFullYear() - 1)
      break
    default:
      start.setDate(now.getDate() - 30)
  }
  
  return {
    start: start.toISOString(),
    end: now.toISOString()
  }
}

// Apply filters to DynamoDB query
const applyFilters = (params, filters) => {
  const expressions = []
  const names = { ...params.ExpressionAttributeNames }
  const values = { ...params.ExpressionAttributeValues }

  // Date range filter
  if (filters.dateRange || filters.startDate) {
    const dateRange = getDateRange(filters.dateRange, filters.startDate, filters.endDate)
    expressions.push('#createdAt BETWEEN :startDate AND :endDate')
    names['#createdAt'] = 'createdAt'
    values[':startDate'] = dateRange.start
    values[':endDate'] = dateRange.end
  }

  // Country filter
  if (filters.country && filters.country !== 'all') {
    expressions.push('#country = :country')
    names['#country'] = 'country'
    values[':country'] = filters.country
  }

  // Solution filter
  if (filters.solution && filters.solution !== 'all') {
    expressions.push('#solution_id = :solution')
    names['#solution_id'] = 'solution_id'
    values[':solution'] = filters.solution
  }

  // Combine with existing filter
  if (expressions.length > 0) {
    const additionalFilter = expressions.join(' AND ')
    params.FilterExpression = params.FilterExpression 
      ? `${params.FilterExpression} AND ${additionalFilter}`
      : additionalFilter
  }

  params.ExpressionAttributeNames = names
  params.ExpressionAttributeValues = values
  return params
}

// Get real revenue from payment transactions with user country data
const calculateRevenue = async (filters = {}) => {
  let params = {
    TableName: process.env.PAYMENT_TRANSACTIONS_TABLE,
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'completed' }
  }

  params = applyFilters(params, filters)

  const result = await docClient.send(new ScanCommand(params))
  
  // Pro tier pricing constants
  const PRO_TIER_PRICE_INR = 299 // ₹299 per pro upgrade
  
  // Calculate totals
  const totalTransactions = result.Items.length
  const totalAmountINR = result.Items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const byCountry = {}
  
  // Get user data to determine country for each transaction
  for (const item of result.Items) {
    let country = 'India' // Default to India since all payments are via PhonePe (Indian payment gateway)
    
    // Try to get user's country if userId exists
    if (item.userId) {
      try {
        const userResult = await docClient.send(new QueryCommand({
          TableName: process.env.USER_TABLE,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': item.userId }
        }))
        
        if (userResult.Items && userResult.Items.length > 0) {
          const user = userResult.Items[0]
          country = user.profile?.country || user.country || 'India'
        }
      } catch (error) {
        console.log('Could not fetch user country, using default:', error.message)
      }
    }
    
    byCountry[country] = (byCountry[country] || 0) + (item.amount || 0)
  }

  return { 
    total: totalAmountINR,
    totalINR: `₹${totalAmountINR.toLocaleString('en-IN')}`,
    calculation: {
      completedTransactions: totalTransactions,
      pricePerUpgrade: PRO_TIER_PRICE_INR,
      formula: `${totalTransactions} completed transactions × ₹${PRO_TIER_PRICE_INR} = ₹${totalAmountINR.toLocaleString('en-IN')}`,
      breakdown: `Total Revenue = ${totalTransactions} × ₹${PRO_TIER_PRICE_INR} = ₹${totalAmountINR.toLocaleString('en-IN')}`
    },
    byCountry, 
    transactions: totalTransactions 
  }
}

// Get real user counts
// Get real user counts with breakdown
const getUserCounts = async (filters = {}) => {
  try {
    // Get registered users
    let userParams = {
      TableName: process.env.USER_TABLE
    }
    userParams = applyFilters(userParams, filters)
    const registeredResult = await docClient.send(new ScanCommand(userParams))
    
    // Get pro users from entitlements
    const proResult = await docClient.send(new ScanCommand({
      TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
      FilterExpression: 'tier = :tier',
      ExpressionAttributeValues: { ':tier': 'pro' }
    }))
    
    // Get anonymous users from sessions (unique IPs/sessions without userId)
    const sessionResult = await docClient.send(new ScanCommand({
      TableName: process.env.USER_SESSIONS_TABLE,
      FilterExpression: 'attribute_not_exists(userId) OR userId = :empty',
      ExpressionAttributeValues: { ':empty': '' }
    }))
    
    // Count unique anonymous sessions (by IP or session ID)
    const uniqueAnonymousSessions = new Set()
    sessionResult.Items.forEach(session => {
      const identifier = session.ipAddress || session.sessionId || session.id
      if (identifier) {
        uniqueAnonymousSessions.add(identifier)
      }
    })
    
    const registeredUsers = registeredResult.Items.length
    const proUsers = proResult.Items.length
    const anonymousUsers = uniqueAnonymousSessions.size
    const totalUsers = anonymousUsers + registeredUsers
    
    // Calculate breakdown by role and country
    const byRole = {}
    const byCountry = {}
    
    registeredResult.Items.forEach(item => {
      const role = item.role || 'customer'
      const country = item.country || 'Unknown'
      
      byRole[role] = (byRole[role] || 0) + 1
      byCountry[country] = (byCountry[country] || 0) + 1
    })

    return { 
      total: totalUsers,
      calculation: {
        anonymousUsers: anonymousUsers,
        registeredUsers: registeredUsers,
        proUsers: proUsers,
        breakdown: `${anonymousUsers} anonymous + ${registeredUsers} registered (${proUsers} pro) = ${totalUsers} total users`
      },
      byRole, 
      byCountry 
    }
  } catch (error) {
    console.error('Error getting user counts:', error)
    return { 
      total: 0,
      calculation: {
        anonymousUsers: 0,
        registeredUsers: 0,
        proUsers: 0,
        breakdown: '0 anonymous + 0 registered (0 pro) = 0 total users'
      },
      byRole: {}, 
      byCountry: {} 
    }
  }
}

// Get real conversion rates
const getConversionRates = async (filters = {}) => {
  try {
    // Get total registered users
    const registeredUsers = await docClient.send(new ScanCommand({
      TableName: process.env.USER_TABLE
    }))

    // Get pro users from entitlements - count unique users only
    const proUsers = await docClient.send(new ScanCommand({
      TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
      FilterExpression: 'tier = :tier',
      ExpressionAttributeValues: { ':tier': 'pro' }
    }))

    // Count unique pro users (in case there are multiple entitlements per user)
    const uniqueProUsers = new Set()
    proUsers.Items.forEach(item => {
      if (item.userId) {
        uniqueProUsers.add(item.userId)
      }
    })

    const totalRegistered = registeredUsers.Items.length
    const totalPro = uniqueProUsers.size
    
    // Ensure pro users cannot exceed registered users
    const actualPro = Math.min(totalPro, totalRegistered)
    const conversionRate = totalRegistered > 0 ? (actualPro / totalRegistered) * 100 : 0

    return {
      totalRegistered,
      totalPro: actualPro,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      calculation: {
        formula: `${actualPro} pro users ÷ ${totalRegistered} registered users × 100 = ${parseFloat(conversionRate.toFixed(2))}%`,
        breakdown: `Conversion Rate = ${actualPro} ÷ ${totalRegistered} × 100 = ${parseFloat(conversionRate.toFixed(2))}%`
      }
    }
  } catch (error) {
    console.error('Error calculating conversion rates:', error)
    return {
      totalRegistered: 0,
      totalPro: 0,
      conversionRate: 0,
      calculation: {
        formula: '0 pro users ÷ 0 registered users × 100 = 0%',
        breakdown: 'No data available'
      }
    }
  }
}

exports.handler = async (event) => {
  console.log('Business Metrics API called:', JSON.stringify(event, null, 2))

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: corsHeaders, body: '' }
    }

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed' })
      }
    }

    const queryParams = event.queryStringParameters || {}
    
    const filters = {
      dateRange: queryParams.dateRange || '30d',
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      country: queryParams.country,
      solution: queryParams.solution,
      tier: queryParams.tier,
      device: queryParams.device
    }

    // Get real data from DynamoDB
    const [revenue, users, conversions] = await Promise.all([
      calculateRevenue(filters),
      getUserCounts(filters),
      getConversionRates(filters)
    ])

    const response = {
      revenue: {
        total: revenue.total,
        totalINR: revenue.totalINR,
        calculation: revenue.calculation,
        transactions: revenue.transactions,
        byCountry: revenue.byCountry
      },
      users: {
        total: users.total,
        calculation: users.calculation,
        byRole: users.byRole,
        byCountry: users.byCountry
      },
      conversions: {
        rate: conversions.conversionRate,
        calculation: conversions.calculation,
        registeredToPro: conversions.totalPro,
        totalRegistered: conversions.totalRegistered
      },
      filters: filters,
      timestamp: new Date().toISOString()
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Business metrics error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
