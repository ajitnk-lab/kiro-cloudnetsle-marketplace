const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')
const crypto = require('crypto')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

// Generate secure token
const generateToken = () => {
  return 'tok_' + crypto.randomBytes(32).toString('hex')
}

// Generate UUID for token ID
const generateTokenId = () => {
  return crypto.randomUUID()
}

exports.handler = async (event) => {
  console.log('Token Manager called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    const { resource, httpMethod, pathParameters } = event
    
    // Generate Token API
    if (resource.includes('/generate-token') && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { user_id, solution_id, tier, return_url } = body

      if (!user_id || !solution_id || !tier) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: user_id, solution_id, tier' }),
        }
      }

      // Generate token
      const tokenId = generateTokenId()
      const token = generateToken()
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = now + (60 * 60) // 1 hour expiry

      // Set usage limits based on tier
      const tierLimits = {
        'registered': 10,
        'pro': 999999 // Effectively unlimited
      }

      const tokenData = {
        tokenId,
        token,
        userId: user_id,
        solutionId: solution_id,
        tier,
        createdAt: now,
        expiresAt,
        usageCount: 0,
        maxUsage: tierLimits[tier] || 10,
        isActive: true
      }

      // Store token in DynamoDB
      await docClient.send(new PutCommand({
        TableName: process.env.TOKEN_TABLE_NAME,
        Item: tokenData,
      }))

      // Build redirect URL
      const baseUrl = return_url || `https://awssolutionfinder.solutions.cloudnestle.com/search`
      const redirectUrl = `${baseUrl}?user_id=${user_id}&token=${token}&tier=${tier}`

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          token,
          tokenId,
          redirect_url: redirectUrl,
          expires_at: new Date(expiresAt * 1000).toISOString(),
          tier,
          usage_remaining: tierLimits[tier] || 10
        }),
      }
    }

    // Validate Token API
    if (resource.includes('/validate-token') && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { token, solution_id } = body

      if (!token || !solution_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: token, solution_id' }),
        }
      }

      // Find token in database
      const result = await docClient.send(new QueryCommand({
        TableName: process.env.TOKEN_TABLE_NAME,
        IndexName: 'SolutionIndex',
        KeyConditionExpression: 'solutionId = :solutionId',
        FilterExpression: '#token = :token AND isActive = :active',
        ExpressionAttributeNames: {
          '#token': 'token'
        },
        ExpressionAttributeValues: {
          ':solutionId': solution_id,
          ':token': token,
          ':active': true
        },
        Limit: 1
      }))

      if (!result.Items || result.Items.length === 0) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            valid: false, 
            error: 'Invalid or expired token' 
          }),
        }
      }

      const tokenData = result.Items[0]
      const now = Math.floor(Date.now() / 1000)

      // Check if token is expired
      if (tokenData.expiresAt < now) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            valid: false, 
            error: 'Token expired' 
          }),
        }
      }

      // Calculate usage remaining
      const usageRemaining = tokenData.tier === 'pro' ? 'unlimited' : 
        Math.max(0, tokenData.maxUsage - tokenData.usageCount)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: true,
          user_id: tokenData.userId,
          tier: tokenData.tier,
          usage_remaining: usageRemaining,
          expires_at: new Date(tokenData.expiresAt * 1000).toISOString(),
          token_id: tokenData.tokenId
        }),
      }
    }

    // Track Usage API
    if (resource.includes('/track-usage') && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { token, solution_id, action } = body

      if (!token || !solution_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: token, solution_id' }),
        }
      }

      // Find and validate token
      const result = await docClient.send(new QueryCommand({
        TableName: process.env.TOKEN_TABLE_NAME,
        IndexName: 'SolutionIndex',
        KeyConditionExpression: 'solutionId = :solutionId',
        FilterExpression: '#token = :token AND isActive = :active',
        ExpressionAttributeNames: {
          '#token': 'token'
        },
        ExpressionAttributeValues: {
          ':solutionId': solution_id,
          ':token': token,
          ':active': true
        },
        Limit: 1
      }))

      if (!result.Items || result.Items.length === 0) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Invalid token' 
          }),
        }
      }

      const tokenData = result.Items[0]
      const now = Math.floor(Date.now() / 1000)

      // Check if token is expired
      if (tokenData.expiresAt < now) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Token expired' 
          }),
        }
      }

      // For pro users, don't track usage limits
      if (tokenData.tier === 'pro') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            usage_remaining: 'unlimited',
            tier: 'pro',
            upgrade_needed: false
          }),
        }
      }

      // Check if usage limit exceeded
      if (tokenData.usageCount >= tokenData.maxUsage) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Usage limit exceeded',
            usage_remaining: 0,
            tier: tokenData.tier,
            upgrade_needed: true
          }),
        }
      }

      // Increment usage count
      const newUsageCount = tokenData.usageCount + 1
      await docClient.send(new UpdateCommand({
        TableName: process.env.TOKEN_TABLE_NAME,
        Key: { tokenId: tokenData.tokenId },
        UpdateExpression: 'SET usageCount = :newCount',
        ExpressionAttributeValues: {
          ':newCount': newUsageCount
        }
      }))

      const usageRemaining = Math.max(0, tokenData.maxUsage - newUsageCount)
      const upgradeNeeded = usageRemaining === 0

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          usage_remaining: usageRemaining,
          tier: tokenData.tier,
          upgrade_needed: upgradeNeeded
        }),
      }
    }

    // Get User Tokens API (for debugging/admin)
    if (resource.includes('/user-tokens') && httpMethod === 'GET') {
      const userId = pathParameters?.userId
      
      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing userId parameter' }),
        }
      }

      const result = await docClient.send(new QueryCommand({
        TableName: process.env.TOKEN_TABLE_NAME,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false, // Most recent first
        Limit: 10
      }))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          tokens: result.Items || [],
          count: result.Count || 0
        }),
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' }),
    }

  } catch (error) {
    console.error('Error in token manager:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
