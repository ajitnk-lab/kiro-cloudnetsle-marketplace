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

// Get geographic distribution from user sessions
const getGeographicData = async (filters = {}) => {
  const params = {
    TableName: process.env.USER_SESSIONS_TABLE
  }

  if (filters.solution_id) {
    params.FilterExpression = 'solution_id = :solution_id'
    params.ExpressionAttributeValues = { ':solution_id': filters.solution_id }
  }

  if (filters.start_date && filters.end_date) {
    const filterExpr = 'createdAt BETWEEN :start AND :end'
    if (params.FilterExpression) {
      params.FilterExpression += ' AND ' + filterExpr
    } else {
      params.FilterExpression = filterExpr
    }
    params.ExpressionAttributeValues = {
      ...params.ExpressionAttributeValues,
      ':start': filters.start_date,
      ':end': filters.end_date
    }
  }

  const result = await docClient.send(new ScanCommand(params))
  
  // If no sessions found, fallback to entitlements data for geographic distribution
  if (result.Items.length === 0) {
    console.log('No sessions found, using entitlements for geographic data')
    const entitlementsResult = await docClient.send(new ScanCommand({
      TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE
    }))
    
    const byCountry = {}
    const byCity = {}
    const byTimezone = {}
    const byDevice = {}

    entitlementsResult.Items.forEach(item => {
      const country = item.country || 'India' // Default to India for consistency
      const city = 'Unknown' // Entitlements don't have city data
      const timezone = 'UTC'
      const device = 'unknown'

      byCountry[country] = (byCountry[country] || 0) + 1
      byCity[`${city}, ${country}`] = (byCity[`${city}, ${country}`] || 0) + 1
      byTimezone[timezone] = (byTimezone[timezone] || 0) + 1
      byDevice[device] = (byDevice[device] || 0) + 1
    })

    return {
      totalSessions: entitlementsResult.Items.length,
      sessionCalculation: {
        source: 'entitlements',
        message: `Using ${entitlementsResult.Items.length} entitlement records as session proxy (sessions table empty)`,
        breakdown: `${entitlementsResult.Items.length} user entitlements used as session count`
      },
      byCountry,
      byCity,
      byTimezone,
      byDevice
    }
  }
  
  const byCountry = {}
  const byCity = {}
  const byTimezone = {}
  const byDevice = {}

  result.Items.forEach(item => {
    const country = item.country || 'India' // Default to India for consistency
    const city = item.city || 'Unknown'
    const timezone = item.timezone || 'UTC'
    const device = item.device || 'unknown'

    byCountry[country] = (byCountry[country] || 0) + 1
    byCity[`${city}, ${country}`] = (byCity[`${city}, ${country}`] || 0) + 1
    byTimezone[timezone] = (byTimezone[timezone] || 0) + 1
    byDevice[device] = (byDevice[device] || 0) + 1
  })

  return {
    totalSessions: result.Items.length,
    sessionCalculation: {
      source: 'sessions',
      message: `${result.Items.length} actual user sessions`,
      breakdown: `${result.Items.length} sessions from sessions table`
    },
    byCountry,
    byCity,
    byTimezone,
    byDevice
  }
}

// Get revenue by geography from payment transactions
const getRevenueByGeography = async (filters = {}) => {
  const params = {
    TableName: process.env.PAYMENT_TRANSACTIONS_TABLE,
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'completed' }
  }

  if (filters.solution_id) {
    params.FilterExpression += ' AND solution_id = :solution_id'
    params.ExpressionAttributeValues[':solution_id'] = filters.solution_id
  }

  if (filters.start_date && filters.end_date) {
    params.FilterExpression += ' AND createdAt BETWEEN :start AND :end'
    params.ExpressionAttributeValues[':start'] = filters.start_date
    params.ExpressionAttributeValues[':end'] = filters.end_date
  }

  const result = await docClient.send(new ScanCommand(params))
  
  const revenueByCountry = {}
  const transactionsByCountry = {}

  result.Items.forEach(item => {
    const country = item.country || 'India' // Default to India for consistency
    const amount = item.amount || 0

    revenueByCountry[country] = (revenueByCountry[country] || 0) + amount
    transactionsByCountry[country] = (transactionsByCountry[country] || 0) + 1
  })

  return { revenueByCountry, transactionsByCountry }
}

// Get user distribution by geography
const getUsersByGeography = async (filters = {}) => {
  const params = {
    TableName: process.env.USER_TABLE
  }

  if (filters.role) {
    params.FilterExpression = '#role = :role'
    params.ExpressionAttributeNames = { '#role': 'role' }
    params.ExpressionAttributeValues = { ':role': filters.role }
  }

  const result = await docClient.send(new ScanCommand(params))
  
  const usersByCountry = {}
  const usersByRole = {}

  result.Items.forEach(item => {
    const country = item.country || 'India' // Default to India for consistency
    const role = item.role || 'customer'

    usersByCountry[country] = (usersByCountry[country] || 0) + 1
    usersByRole[role] = (usersByRole[role] || 0) + 1
  })

  return { usersByCountry, usersByRole, totalUsers: result.Items.length }
}

exports.handler = async (event) => {
  console.log('Geographic Analytics API called:', JSON.stringify(event, null, 2))

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
      start_date: queryParams.start_date,
      end_date: queryParams.end_date,
      solution_id: queryParams.solution_id,
      role: queryParams.role
    }

    // Get real geographic data
    const [geoData, revenueGeo, usersGeo] = await Promise.all([
      getGeographicData(filters),
      getRevenueByGeography(filters),
      getUsersByGeography(filters)
    ])

    const response = {
      sessions: {
        total: geoData.totalSessions,
        calculation: geoData.sessionCalculation,
        byCountry: geoData.byCountry,
        byCity: geoData.byCity,
        byTimezone: geoData.byTimezone,
        byDevice: geoData.byDevice
      },
      revenue: {
        byCountry: revenueGeo.revenueByCountry,
        transactionsByCountry: revenueGeo.transactionsByCountry
      },
      users: {
        total: usersGeo.totalUsers,
        byCountry: usersGeo.usersByCountry,
        byRole: usersGeo.usersByRole
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
    console.error('Geographic analytics error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
