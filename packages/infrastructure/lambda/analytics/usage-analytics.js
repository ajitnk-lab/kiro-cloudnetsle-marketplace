const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

// Get usage patterns from entitlements table
const getUsagePatterns = async (filters = {}) => {
  const params = {
    TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE
  }

  if (filters.solution_id) {
    params.FilterExpression = 'solutionId = :solution_id'
    params.ExpressionAttributeValues = { ':solution_id': filters.solution_id }
  }

  const result = await docClient.send(new ScanCommand(params))
  
  const tierDistribution = {}
  const usageByCountry = {}
  const totalUsage = {}
  const uniqueUsers = new Set() // Track unique users
  
  result.Items.forEach(item => {
    const tier = item.tier || 'registered'
    const country = item.country || 'Unknown'
    const userId = item.userId
    
    // Count unique users only
    if (userId) {
      uniqueUsers.add(userId)
    }
    
    tierDistribution[tier] = (tierDistribution[tier] || 0) + 1
    usageByCountry[country] = (usageByCountry[country] || 0) + 1
    
    // Calculate total usage from all usage-related fields
    let userTotalUsage = 0
    
    // Check for various usage fields that might exist
    if (item.dailyUsage) userTotalUsage += item.dailyUsage
    if (item.totalUsage) userTotalUsage += item.totalUsage
    if (item.searchCount) userTotalUsage += item.searchCount
    
    // Also check for date-based usage fields (usage_YYYY-MM-DD format)
    Object.keys(item).forEach(key => {
      if (key.startsWith('usage_') && typeof item[key] === 'number') {
        userTotalUsage += item[key]
      }
    })
    
    const userEmail = item.userEmail || userId
    if (userEmail) {
      totalUsage[userEmail] = (totalUsage[userEmail] || 0) + userTotalUsage
    }
  })

  const avgUsagePerUser = uniqueUsers.size > 0 
    ? Object.values(totalUsage).reduce((sum, usage) => sum + usage, 0) / uniqueUsers.size
    : 0

  const totalSearchesCount = Object.values(totalUsage).reduce((sum, usage) => sum + usage, 0)
  const userCount = Object.keys(totalUsage).length

  return {
    totalUsers: uniqueUsers.size, // Use unique user count instead of total records
    userCalculation: {
      uniqueUsers: uniqueUsers.size,
      totalEntitlements: result.Items.length,
      breakdown: `${uniqueUsers.size} unique users with solution entitlements (from ${result.Items.length} total entitlement records)`,
      formula: `Active Users = Unique userId count from entitlements table = ${uniqueUsers.size}`
    },
    tierDistribution,
    usageByCountry,
    avgUsagePerUser: Math.round(avgUsagePerUser * 100) / 100,
    totalSearches: totalSearchesCount,
    searchCalculation: {
      totalUsers: userCount,
      totalSearches: totalSearchesCount,
      breakdown: `${totalSearchesCount} total searches across ${userCount} users`,
      formula: `Sum of all user usage = ${totalSearchesCount} searches`
    }
  }
}

// Get session analytics from user sessions table
const getSessionAnalytics = async (filters = {}) => {
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
  
  const deviceUsage = {}
  const browserUsage = {}
  const countryActivity = {}
  const hourlyActivity = {}
  
  result.Items.forEach(item => {
    const device = item.device || 'unknown'
    const browser = item.browser || 'unknown'
    const country = item.country || 'Unknown'
    
    deviceUsage[device] = (deviceUsage[device] || 0) + 1
    browserUsage[browser] = (browserUsage[browser] || 0) + 1
    countryActivity[country] = (countryActivity[country] || 0) + 1
    
    // Extract hour from timestamp for activity patterns
    if (item.createdAt) {
      const hour = new Date(item.createdAt).getHours()
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1
    }
  })

  return {
    totalSessions: result.Items.length,
    deviceUsage,
    browserUsage,
    countryActivity,
    hourlyActivity
  }
}

// Get performance metrics from CloudWatch instead of non-existent API_METRICS_TABLE
const getPerformanceMetrics = async (filters = {}) => {
  try {
    const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch')
    const cloudwatch = new CloudWatchClient({})
    
    // Get time range for metrics (default to last 24 hours)
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000)) // 24 hours ago
    
    // If filters specify time range, use that instead
    if (filters.start_date && filters.end_date) {
      startTime.setTime(new Date(filters.start_date).getTime())
      endTime.setTime(new Date(filters.end_date).getTime())
    }
    
    // Get API Gateway metrics
    const apiGatewayParams = {
      Namespace: 'AWS/ApiGateway',
      MetricName: 'Count',
      Dimensions: [
        {
          Name: 'ApiName',
          Value: 'MarketplaceAPI' // Your API Gateway name
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600, // 1 hour periods
      Statistics: ['Sum']
    }
    
    const latencyParams = {
      ...apiGatewayParams,
      MetricName: 'Latency',
      Statistics: ['Average']
    }
    
    const errorParams = {
      ...apiGatewayParams,
      MetricName: '4XXError',
      Statistics: ['Sum']
    }
    
    // Execute CloudWatch queries
    const [countResult, latencyResult, errorResult] = await Promise.all([
      cloudwatch.send(new GetMetricStatisticsCommand(apiGatewayParams)),
      cloudwatch.send(new GetMetricStatisticsCommand(latencyParams)),
      cloudwatch.send(new GetMetricStatisticsCommand(errorParams))
    ])
    
    // Process results
    const totalRequests = countResult.Datapoints?.reduce((sum, point) => sum + (point.Sum || 0), 0) || 0
    const avgResponseTime = latencyResult.Datapoints?.length > 0 
      ? latencyResult.Datapoints.reduce((sum, point) => sum + (point.Average || 0), 0) / latencyResult.Datapoints.length
      : 0
    const totalErrors = errorResult.Datapoints?.reduce((sum, point) => sum + (point.Sum || 0), 0) || 0
    
    // Create hourly breakdown for graphs
    const hourlyData = {}
    countResult.Datapoints?.forEach(point => {
      const hour = new Date(point.Timestamp).getHours()
      hourlyData[hour] = (hourlyData[hour] || 0) + (point.Sum || 0)
    })
    
    return {
      totalRequests: Math.round(totalRequests),
      avgResponseTime: Math.round(avgResponseTime),
      totalErrors: Math.round(totalErrors),
      successRate: totalRequests > 0 ? Math.round(((totalRequests - totalErrors) / totalRequests) * 100) : 100,
      hourlyBreakdown: hourlyData,
      statusCodes: {
        '200': totalRequests - totalErrors,
        '4xx': totalErrors
      },
      endpointUsage: {
        '/api/*': totalRequests // Simplified - could be expanded with more specific endpoints
      }
    }
  } catch (error) {
    console.error('Error getting CloudWatch metrics:', error)
    // Fallback to mock data if CloudWatch fails
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      totalErrors: 0,
      successRate: 100,
      hourlyBreakdown: {},
      statusCodes: {},
      endpointUsage: {}
    }
  }
}

exports.handler = async (event) => {
  console.log('Usage Analytics API called:', JSON.stringify(event, null, 2))

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
      solution_id: queryParams.solution_id
    }

    // Get real usage analytics
    const [usagePatterns, sessionAnalytics, performanceMetrics] = await Promise.all([
      getUsagePatterns(filters),
      getSessionAnalytics(filters),
      getPerformanceMetrics(filters)
    ])

    const response = {
      usage: {
        totalUsers: usagePatterns.totalUsers,
        userCalculation: usagePatterns.userCalculation,
        tierDistribution: usagePatterns.tierDistribution,
        usageByCountry: usagePatterns.usageByCountry,
        avgUsagePerUser: usagePatterns.avgUsagePerUser,
        totalSearches: usagePatterns.totalSearches,
        searchCalculation: usagePatterns.searchCalculation
      },
      sessions: {
        total: sessionAnalytics.totalSessions,
        deviceUsage: sessionAnalytics.deviceUsage,
        browserUsage: sessionAnalytics.browserUsage,
        countryActivity: sessionAnalytics.countryActivity,
        hourlyActivity: sessionAnalytics.hourlyActivity
      },
      performance: {
        totalRequests: performanceMetrics.totalRequests,
        avgResponseTime: performanceMetrics.avgResponseTime,
        statusCodes: performanceMetrics.statusCodes,
        endpointUsage: performanceMetrics.endpointUsage
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
    console.error('Usage analytics error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
