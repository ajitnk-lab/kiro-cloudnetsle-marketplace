const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const crypto = require('crypto')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE

// Simple location tracking without external dependency
const trackUserLocation = async (userEmail, headers) => {
  try {
    if (!process.env.ENABLE_LOCATION_TRACKING || process.env.ENABLE_LOCATION_TRACKING !== 'true') {
      return null
    }

    const country = headers['cloudfront-viewer-country'] || 'Unknown'
    const city = headers['cloudfront-viewer-city'] || 'Unknown'
    const ip = headers['x-forwarded-for']?.split(',')[0] || 'Unknown'
    
    // Hash IP for privacy
    const ipHash = ip !== 'Unknown' ? 
      crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'default-salt')).digest('hex').substring(0, 16) : 
      'unknown'

    const sessionData = {
      pk: `session#${userEmail}`,
      sk: `${Date.now()}#${ipHash}`,
      user_email: userEmail,
      country,
      city,
      ip_hash: ipHash,
      timestamp: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
    }

    if (process.env.USER_SESSIONS_TABLE_NAME) {
      await docClient.send(new PutCommand({
        TableName: process.env.USER_SESSIONS_TABLE_NAME,
        Item: sessionData
      }))
    }

    return { country, city }
  } catch (error) {
    console.error('Location tracking error:', error)
    return null
  }
}

// Get quota limits based on access tier
const getQuotaLimits = (accessTier) => {
  const limits = {
    'registered': { daily: 10, monthly: 300 },
    'pro': { daily: -1, monthly: -1 } // -1 means unlimited
  }
  return limits[accessTier] || limits['registered']
}

// Check quota without updating
const checkQuota = (usage, limits) => {
  const today = new Date().toISOString().split('T')[0]
  
  // Handle both old and new entitlement formats
  let todayUsage = 0
  
  if (typeof usage === 'number') {
    // New format: usage is directly the dailyUsage number
    todayUsage = usage || 0
  } else {
    // Old format: usage is an object with daily_usage structure
    const dailyUsage = usage?.daily_usage || {}
    todayUsage = dailyUsage[today] || 0
  }
  
  if (limits.daily === -1) {
    return { allowed: true, used: todayUsage, remaining: -1 }
  }
  
  const allowed = todayUsage < limits.daily
  return {
    allowed,
    used: todayUsage,
    remaining: Math.max(0, limits.daily - todayUsage),
    limit: limits.daily,
    reason: allowed ? null : 'Daily quota exceeded'
  }
}

// Check current usage and increment if not check_only
const checkAndUpdateQuota = async (entitlement, limits, checkOnly = false) => {
  const today = new Date().toISOString().split('T')[0]
  
  // Handle both old and new entitlement formats
  let todayUsage = 0
  
  if (entitlement.dailyUsage !== undefined) {
    // New UUID-based format: simple dailyUsage field
    todayUsage = entitlement.dailyUsage || 0
  } else {
    // Old email-based format: nested usage.daily_usage structure
    const usage = entitlement.usage || {}
    const dailyUsage = usage.daily_usage || {}
    todayUsage = dailyUsage[today] || 0
  }
  
  if (limits.daily === -1) {
    return { allowed: true, used: todayUsage, remaining: -1 }
  }
  
  if (todayUsage >= limits.daily) {
    return { allowed: false, used: todayUsage, remaining: 0, reason: 'daily_limit_exceeded' }
  }
  
  // If not check_only, increment usage
  if (!checkOnly) {
    const newUsage = todayUsage + 1
    
    if (entitlement.dailyUsage !== undefined) {
      // New format: update dailyUsage directly
      await docClient.send(new UpdateCommand({
        TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
        Key: { pk: entitlement.pk, sk: entitlement.sk },
        UpdateExpression: 'SET dailyUsage = :dailyUsage, updatedAt = :updatedAt, lastUsageDate = :today',
        ExpressionAttributeValues: {
          ':dailyUsage': newUsage,
          ':updatedAt': new Date().toISOString(),
          ':today': today
        }
      }))
    } else {
      // Old format: update nested usage structure
      const usage = entitlement.usage || {}
      const dailyUsage = usage.daily_usage || {}
      const updatedDailyUsage = { ...dailyUsage, [today]: newUsage }
      const updatedUsage = { ...usage, daily_usage: updatedDailyUsage }
      
      await docClient.send(new UpdateCommand({
        TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
        Key: { pk: entitlement.pk, sk: entitlement.sk },
        UpdateExpression: 'SET #usage = :usage, updated_at = :updatedAt',
        ExpressionAttributeNames: {
          '#usage': 'usage'
        },
        ExpressionAttributeValues: {
          ':usage': updatedUsage,
          ':updatedAt': new Date().toISOString()
        }
      }))
    }
    
    return { allowed: true, used: newUsage, remaining: Math.max(0, limits.daily - newUsage) }
  }
  
  return { allowed: true, used: todayUsage, remaining: Math.max(0, limits.daily - todayUsage) }
}

exports.handler = async (event) => {
  console.log('Solution Token Validator called:', JSON.stringify(event, null, 2))
  
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
    const { token, user_email, solution_id } = body
    
    if (!token || !solution_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['token', 'solution_id']
        }),
      }
    }

    console.log(`Validating token for solution: ${solution_id}`)

    // If user_email is provided, query directly
    if (user_email) {
      const pk = `user#${user_email}`
      const sk = `solution#${solution_id}`
      
      const queryCommand = new QueryCommand({
        TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
        KeyConditionExpression: 'pk = :pk AND sk = :sk',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':sk': sk
        }
      })

      const result = await docClient.send(queryCommand)
      
      if (!result.Items || result.Items.length === 0) {
        console.log(`No entitlement found for user: ${user_email}, solution: ${solution_id}`)
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            error: 'No valid entitlement found',
            user_email,
            solution_id
          }),
        }
      }

      const entitlement = result.Items[0]
      console.log('Found entitlement:', JSON.stringify(entitlement, null, 2))

      // Validate token
      if (token !== entitlement.token) {
        console.log('Token mismatch')
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Invalid token' }),
        }
      }

      // Process entitlement (existing logic continues below)
      const accessTier = entitlement.access_tier || entitlement.accessTier || 'registered'
      console.log('DEBUG: Direct query - Entitlement access_tier:', entitlement.access_tier)
      console.log('DEBUG: Direct query - Entitlement accessTier:', entitlement.accessTier)
      console.log('DEBUG: Direct query - Final accessTier:', accessTier)
      const limits = getQuotaLimits(accessTier)
      
      // Handle both old and new entitlement formats for usage
      const usage = entitlement.dailyUsage !== undefined ? entitlement.dailyUsage : (entitlement.usage || {})
      const quotaCheck = checkQuota(usage, limits)
      
      if (!quotaCheck.allowed) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: 'Quota exceeded',
            reason: quotaCheck.reason,
            limit: quotaCheck.limit,
            used: quotaCheck.used,
            access_tier: accessTier
          }),
        }
      }

      await trackUserLocation(user_email, event.headers || {})

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          allowed: true,  // FAISS expects 'allowed' not 'valid'
          user_email,
          solution_id,
          access_tier: accessTier,
          quota_remaining: limits.daily === -1 ? -1 : Math.max(0, limits.daily - (quotaCheck.used || 0)),
          quota: {
            daily_limit: limits.daily,
            daily_used: quotaCheck.used || 0,
            unlimited: limits.daily === -1
          },
          entitlement_status: entitlement.status,
          created_at: entitlement.created_at
        }),
      }
    }

    // If no user_email provided, scan for token match
    console.log('No user_email provided, scanning for token match')
    
    // First try to find by solution_id (new format) or solution_id (old format)
    const scanCommand = new ScanCommand({
      TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
      FilterExpression: '(solution_id = :solution_id OR solutionId = :solution_id) AND #token = :token',
      ExpressionAttributeNames: {
        '#token': 'token'
      },
      ExpressionAttributeValues: {
        ':solution_id': solution_id,
        ':token': token
      }
    })

    const scanResult = await docClient.send(scanCommand)
    
    if (!scanResult.Items || scanResult.Items.length === 0) {
      console.log(`No entitlement found for token: ${token.substring(0, 10)}...`)
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid token',
          solution_id
        }),
      }
    }

    const entitlement = scanResult.Items[0]
    console.log('Found entitlement by token:', JSON.stringify(entitlement, null, 2))

    // Check if entitlement is active (handle both old and new formats)
    const status = entitlement.status || 'active' // New format doesn't have status field, assume active
    if (status !== 'active') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Entitlement not active',
          status: status
        }),
      }
    }

    // Get quota limits for the user's tier (handle both old and new formats)
    const accessTier = entitlement.tier || entitlement.access_tier || entitlement.accessTier || 'registered'
    console.log('DEBUG: Entitlement access_tier:', entitlement.access_tier)
    console.log('DEBUG: Entitlement accessTier:', entitlement.accessTier)
    console.log('DEBUG: Final accessTier:', accessTier)
    const limits = getQuotaLimits(accessTier)
    
    // Check current usage and increment if not check_only
    const checkOnly = body.check_only === true
    const quotaCheck = await checkAndUpdateQuota(entitlement, limits, checkOnly)
    
    if (!quotaCheck.allowed) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Quota exceeded',
          reason: quotaCheck.reason,
          limit: quotaCheck.limit,
          used: quotaCheck.used,
          access_tier: accessTier
        }),
      }
    }

    // Track location if enabled
    const userEmailFromEntitlement = entitlement.user_email
    await trackUserLocation(userEmailFromEntitlement, event.headers || {})

    // Return successful validation in the format FAISS frontend expects
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        allowed: true,  // FAISS expects 'allowed' not 'valid'
        user_email: userEmailFromEntitlement,
        solution_id,
        access_tier: accessTier,
        quota_remaining: limits.daily === -1 ? -1 : Math.max(0, limits.daily - (quotaCheck.used || 0)),
        quota: {
          daily_limit: limits.daily,
          daily_used: quotaCheck.used || 0,
          unlimited: limits.daily === -1
        },
        entitlement_status: entitlement.status,
        created_at: entitlement.created_at
      }),
    }

  } catch (error) {
    console.error('Token validation error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Token validation failed',
        message: error.message 
      }),
    }
  }
}
