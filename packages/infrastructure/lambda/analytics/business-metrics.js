const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' })

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
    ExpressionAttributeValues: { 
      ':status': 'completed'
    }
  }

  params = applyFilters(params, filters)

  const result = await docClient.send(new ScanCommand(params))
  
  // Pro tier pricing constants
  const PRO_TIER_PRICE_INR = 299 // ₹299 per pro upgrade
  
  // Calculate totals
  const totalTransactions = result.Items.length
  // Handle different payment gateways: Cashfree (paisa) vs PhonePe (rupees)
  const totalAmountINR = result.Items.reduce((sum, item) => {
    const amount = item.amount || 0
    // Cashfree stores in paisa, PhonePe stores in rupees
    return sum + (item.paymentGateway === 'cashfree' ? amount / 100 : amount)
  }, 0)
  const byCountry = {}
  
  // Get user data to determine country for each transaction
  for (const item of result.Items) {
    let country = 'India' // Default to India since all payments are via Cashfree (Indian payment gateway)
    
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
    
    // Convert from paisa to rupees for country totals
    byCountry[country] = (byCountry[country] || 0) + ((item.amount || 0) / 100)
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

// Get transaction status breakdown
const getTransactionBreakdown = async (filters = {}) => {
  let params = {
    TableName: process.env.PAYMENT_TRANSACTIONS_TABLE
    // No status filter - get ALL transactions
  }
  
  params = applyFilters(params, filters)
  const result = await docClient.send(new ScanCommand(params))
  
  const statusCounts = {}
  result.Items.forEach(item => {
    const status = item.status || 'unknown'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })
  
  return {
    total: result.Items.length,
    byStatus: statusCounts,
    completed: statusCounts.completed || 0,
    failed: statusCounts.failed || 0,
    pending: (statusCounts.pending || 0) + (statusCounts.initiated || 0) // Map initiated to pending
  }
}

// Get daily revenue trend for last 30 days
const getDailyRevenueTrend = async () => {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
  
  const params = {
    TableName: process.env.PAYMENT_TRANSACTIONS_TABLE,
    FilterExpression: '#status = :status AND createdAt BETWEEN :start AND :end',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { 
      ':status': 'completed',
      ':start': thirtyDaysAgo.toISOString(),
      ':end': now.toISOString()
    }
  }

  const result = await docClient.send(new ScanCommand(params))
  const dailyRevenue = {}
  
  // Initialize last 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    dailyRevenue[date] = 0
  }
  
  // Group by date and calculate revenue (include ALL completed transactions)
  result.Items.forEach(item => {
    if (item.createdAt) {
      const date = new Date(item.createdAt).toISOString().split('T')[0]
      // Handle both PhonePe (no paymentGateway field) and Cashfree transactions
      const amount = item.paymentGateway === 'cashfree' ? (item.amount || 0) / 100 : (item.amount || 0)
      if (dailyRevenue.hasOwnProperty(date)) {
        dailyRevenue[date] += amount
      }
    }
  })
  
  return dailyRevenue
}

// Get conversion funnel data
const getConversionFunnel = async () => {
  // Get all users
  const allUsers = await docClient.send(new ScanCommand({
    TableName: process.env.MARKETPLACE_USERS_TABLE
  }))
  
  // Get users with entitlements (logged in)
  const entitlements = await docClient.send(new ScanCommand({
    TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE
  }))
  
  // Get pro users
  const proUsers = await docClient.send(new ScanCommand({
    TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
    FilterExpression: '#tier = :pro OR #tier = :Pro OR #tier = :PRO',
    ExpressionAttributeNames: { '#tier': 'tier' },
    ExpressionAttributeValues: { ':pro': 'pro', ':Pro': 'Pro', ':PRO': 'PRO' }
  }))
  
  const uniqueLoggedIn = new Set(entitlements.Items.map(item => item.userId).filter(Boolean))
  const uniquePro = new Set(proUsers.Items.map(item => item.userId).filter(Boolean))
  
  return {
    registered: allUsers.Items.length,
    loggedIn: uniqueLoggedIn.size,
    upgraded: uniquePro.size,
    registrationRate: 100, // Base rate
    loginRate: allUsers.Items.length > 0 ? (uniqueLoggedIn.size / allUsers.Items.length) * 100 : 0,
    conversionRate: uniqueLoggedIn.size > 0 ? (uniquePro.size / uniqueLoggedIn.size) * 100 : 0
  }
}

// Get recent transactions (last 10)
const getRecentTransactions = async () => {
  const params = {
    TableName: process.env.PAYMENT_TRANSACTIONS_TABLE
  }
  
  const result = await docClient.send(new ScanCommand(params))
  
  // Sort by createdAt and get last 10
  const sortedTransactions = result.Items
    .filter(item => item.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
  
  return sortedTransactions.map(item => ({
    id: item.transactionId || item.id,
    amount: item.paymentGateway === 'cashfree' ? (item.amount || 0) / 100 : (item.amount || 0),
    currency: 'INR',
    status: item.status,
    gateway: item.paymentGateway,
    userId: item.userId,
    createdAt: item.createdAt,
    date: new Date(item.createdAt).toLocaleDateString()
  }))
}

// Generate key business insights from real data
const getKeyBusinessInsights = async () => {
  try {
    // Get all data needed for insights
    const [allTransactions, allUsers, entitlements, proUsers] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: process.env.PAYMENT_TRANSACTIONS_TABLE })),
      docClient.send(new ScanCommand({ TableName: process.env.MARKETPLACE_USERS_TABLE })),
      docClient.send(new ScanCommand({ TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE })),
      docClient.send(new ScanCommand({
        TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
        FilterExpression: '#tier = :pro OR #tier = :Pro OR #tier = :PRO',
        ExpressionAttributeNames: { '#tier': 'tier' },
        ExpressionAttributeValues: { ':pro': 'pro', ':Pro': 'Pro', ':PRO': 'PRO' }
      }))
    ])
    
    const completedTransactions = allTransactions.Items.filter(t => t.status === 'completed')
    const failedTransactions = allTransactions.Items.filter(t => t.status === 'failed')
    const pendingTransactions = allTransactions.Items.filter(t => t.status === 'initiated')
    
    const totalRevenue = completedTransactions.reduce((sum, t) => {
      return sum + (t.paymentGateway === 'cashfree' ? (t.amount || 0) / 100 : (t.amount || 0))
    }, 0)
    
    const uniqueLoggedIn = new Set(entitlements.Items.map(item => item.userId).filter(Boolean))
    const uniquePro = new Set(proUsers.Items.map(item => item.userId).filter(Boolean))
    
    // Prepare data for Bedrock analysis
    const businessData = {
      totalUsers: allUsers.Items.length,
      registeredUsers: uniqueLoggedIn.size,
      proUsers: uniquePro.size,
      totalRevenue: totalRevenue,
      transactions: {
        total: allTransactions.Items.length,
        completed: completedTransactions.length,
        failed: failedTransactions.length,
        pending: pendingTransactions.length
      },
      conversionRate: uniqueLoggedIn.size > 0 ? (uniquePro.size / uniqueLoggedIn.size) * 100 : 0,
      paymentSuccessRate: allTransactions.Items.length > 0 ? (completedTransactions.length / allTransactions.Items.length) * 100 : 0
    }
    
    // Generate AI insights using Bedrock
    const aiInsights = await generateBedrockInsights(businessData)
    return aiInsights
    
  } catch (error) {
    console.error('Error generating business insights:', error)
    // Fallback to basic insights if Bedrock fails
    return {
      strengths: ['Data collection in progress'],
      improvements: ['System optimization ongoing'],
      opportunities: ['AI analysis enhancement']
    }
  }
}

const generateBedrockInsights = async (businessData) => {
  try {
    const prompt = `Analyze this marketplace business data and provide actionable insights:

Business Metrics:
- Total Users: ${businessData.totalUsers}
- Registered Users: ${businessData.registeredUsers}
- Pro Users: ${businessData.proUsers}
- Total Revenue: ₹${businessData.totalRevenue}
- Transactions: ${businessData.transactions.completed} completed, ${businessData.transactions.failed} failed, ${businessData.transactions.pending} pending
- Conversion Rate: ${businessData.conversionRate.toFixed(1)}%
- Payment Success Rate: ${businessData.paymentSuccessRate.toFixed(1)}%

Provide insights in this exact JSON format:
{
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3", "improvement 4"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3", "opportunity 4"]
}

Focus on specific, actionable insights based on the actual numbers provided.`

    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-pro-v1:0',
      contentType: 'application/json',
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: [{ text: prompt }]
        }],
        inferenceConfig: {
          max_new_tokens: 1000,
          temperature: 0.7
        }
      })
    })

    const response = await bedrockClient.send(command)
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    
    // Parse the AI response for Nova Pro model
    const aiResponse = responseBody.output.message.content[0].text
    console.log('Raw AI response:', aiResponse)
    
    // Clean and extract JSON from AI response
    let cleanResponse = aiResponse.trim()
    
    // Remove markdown code blocks if present
    if (cleanResponse.includes('```json')) {
      const jsonStart = cleanResponse.indexOf('```json') + 7
      const jsonEnd = cleanResponse.lastIndexOf('```')
      if (jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd).trim()
      }
    } else if (cleanResponse.includes('```')) {
      const jsonStart = cleanResponse.indexOf('```') + 3
      const jsonEnd = cleanResponse.lastIndexOf('```')
      if (jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd).trim()
      }
    }
    
    // Extract JSON object from response
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanResponse = jsonMatch[0]
    }
    
    console.log('Cleaned response for parsing:', cleanResponse)
    
    // Validate JSON before parsing
    if (!cleanResponse || cleanResponse.length < 10) {
      throw new Error('Invalid or empty AI response')
    }
    
    const insights = JSON.parse(cleanResponse)
    
    // Validate insights structure
    if (!insights.strengths || !insights.improvements || !insights.opportunities) {
      throw new Error('Invalid insights structure from AI')
    }
    
    return insights
    
  } catch (error) {
    console.error('Bedrock API error:', error)
    // Generate insights based on REAL data analysis
    const { totalUsers, registeredUsers, proUsers, totalRevenue, transactions, conversionRate, paymentSuccessRate } = businessData
    
    const strengths = []
    const improvements = []
    const opportunities = []
    
    // Analyze real data for strengths
    if (totalUsers > 0) {
      strengths.push(`Active user base: ${totalUsers} total users engaged with platform`)
    }
    if (totalRevenue > 0) {
      strengths.push(`Revenue generation: ₹${totalRevenue.toLocaleString()} from ${transactions.completed} successful transactions`)
    }
    if (conversionRate > 0) {
      strengths.push(`User conversion: ${conversionRate.toFixed(1)}% of registered users upgrade to Pro`)
    }
    if (paymentSuccessRate > 80) {
      strengths.push(`Payment reliability: ${paymentSuccessRate.toFixed(1)}% transaction success rate`)
    }
    
    // Analyze real data for improvements
    if (transactions.failed > 0) {
      const failureRate = ((transactions.failed / transactions.total) * 100).toFixed(1)
      improvements.push(`Payment failures: ${failureRate}% failure rate needs optimization`)
    }
    if (transactions.pending > 0) {
      improvements.push(`Pending transactions: ${transactions.pending} transactions require follow-up`)
    }
    if (conversionRate < 10) {
      improvements.push(`Low conversion: Only ${proUsers} Pro users from ${registeredUsers} registered (${conversionRate.toFixed(1)}%)`)
    }
    if (paymentSuccessRate < 90) {
      improvements.push(`Payment gateway: ${paymentSuccessRate.toFixed(1)}% success rate below optimal threshold`)
    }
    
    // Generate opportunities based on data patterns
    if (registeredUsers > proUsers * 5) {
      opportunities.push('Implement targeted conversion campaigns for registered users')
    }
    if (transactions.failed > transactions.completed * 0.1) {
      opportunities.push('Add payment retry mechanisms and alternative payment methods')
    }
    if (totalUsers > registeredUsers * 2) {
      opportunities.push('Enhance user onboarding to increase registration rates')
    }
    opportunities.push('Implement usage analytics to identify user behavior patterns')
    
    // Ensure minimum insights
    if (strengths.length === 0) strengths.push('Platform operational with user engagement')
    if (improvements.length === 0) improvements.push('Monitor system performance and user feedback')
    if (opportunities.length === 0) opportunities.push('Analyze user data for growth opportunities')
    
    return { strengths, improvements, opportunities }
  }
}

// Get real user counts
// Get real user counts with breakdown
const getUserCounts = async (filters = {}) => {
  try {
    // Get ALL registered users from users table
    let userParams = {
      TableName: process.env.USER_TABLE
    }
    userParams = applyFilters(userParams, filters)
    const registeredResult = await docClient.send(new ScanCommand(userParams))
    
    // Get users who have logged in (have entitlements)
    const entitlementResult = await docClient.send(new ScanCommand({
      TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
      FilterExpression: 'attribute_exists(userId)'
    }))
    
    // Get pro users from entitlements (count unique users only)
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
    
    // Count all registered users (from users table, not entitlements)
    const registeredUsers = registeredResult.Items.length
    // Count users who have logged in at least once (have entitlements)
    const loggedInUsers = entitlementResult.Items.length
    // Count users who registered but never logged in
    const neverLoggedInUsers = registeredUsers - loggedInUsers
    // Count unique pro users (from entitlements table)
    const proUsers = proResult.Items.length
    const anonymousUsers = uniqueAnonymousSessions.size
    const totalUsers = registeredUsers + anonymousUsers // Include both registered and anonymous users
    
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
        loggedInUsers: loggedInUsers,
        neverLoggedInUsers: neverLoggedInUsers,
        proUsers: proUsers,
        breakdown: `${registeredUsers} registered users (${loggedInUsers} logged in, ${neverLoggedInUsers} never logged in, ${proUsers} pro) + ${anonymousUsers} anonymous sessions = ${totalUsers} total users`
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

    // Get pro users from entitlements - count unique users only (check multiple tier values)
    const proUsers = await docClient.send(new ScanCommand({
      TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
      FilterExpression: '#tier = :pro OR #tier = :Pro OR #tier = :PRO',
      ExpressionAttributeNames: { '#tier': 'tier' },
      ExpressionAttributeValues: { 
        ':pro': 'pro',
        ':Pro': 'Pro', 
        ':PRO': 'PRO'
      }
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
    const [revenue, users, conversions, transactions, dailyTrend, funnel, recentTransactions, insights] = await Promise.all([
      calculateRevenue(filters),
      getUserCounts(filters),
      getConversionRates(filters),
      getTransactionBreakdown(filters),
      getDailyRevenueTrend(),
      getConversionFunnel(),
      getRecentTransactions(),
      getKeyBusinessInsights()
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
      transactions: {
        total: transactions.total,
        completed: transactions.completed,
        failed: transactions.failed,
        pending: transactions.pending,
        byStatus: transactions.byStatus
      },
      dailyRevenue: dailyTrend,
      conversionFunnel: funnel,
      recentTransactions: recentTransactions,
      businessInsights: [
        ...insights.strengths.map(item => ({ type: 'strength', text: item })),
        ...insights.improvements.map(item => ({ type: 'improvement', text: item })),
        ...insights.opportunities.map(item => ({ type: 'opportunity', text: item }))
      ],
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
