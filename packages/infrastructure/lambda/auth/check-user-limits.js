const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const USER_TABLE = process.env.USER_TABLE

exports.handler = async (event) => {
  console.log('Check user limits request:', JSON.stringify(event, null, 2))

  try {
    const { userEmail } = JSON.parse(event.body)

    if (!userEmail) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'User email is required' })
      }
    }

    // Get user details using EmailIndex GSI
    const { QueryCommand } = require('@aws-sdk/lib-dynamodb')
    const getUserCommand = new QueryCommand({
      TableName: USER_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': userEmail
      }
    })
    const userResult = await docClient.send(getUserCommand)

    if (!userResult.Items || userResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'User not found' })
      }
    }

    const user = userResult.Items[0]
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // Get user's entitlement to determine actual tier
    let userTier = 'free'
    let dailyLimit = 10
    
    try {
      const entitlementCommand = new QueryCommand({
        TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE || 'marketplace-user-solution-entitlements',
        KeyConditionExpression: 'pk = :pk AND sk = :sk',
        ExpressionAttributeValues: {
          ':pk': `user#${userEmail}`,
          ':sk': 'solution#aws-solution-finder'
        }
      })
      const entitlementResult = await docClient.send(entitlementCommand)
      
      if (entitlementResult.Items && entitlementResult.Items.length > 0) {
        const entitlement = entitlementResult.Items[0]
        userTier = entitlement.access_tier || 'registered'
        dailyLimit = userTier === 'pro' ? -1 : 10
      }
    } catch (error) {
      console.log('Could not fetch entitlement, using default tier:', error)
    }

    // Initialize daily usage if not exists or if it's a new day
    if (!user.dailyUsage || user.dailyUsage.date !== today) {
      user.dailyUsage = {
        date: today,
        searchCount: 0
      }
    }

    // Determine limits based on tier
    let canUpgrade, tierName
    
    if (userTier === 'pro') {
      canUpgrade = false
      tierName = 'Pro'
    } else if (userTier === 'registered') {
      canUpgrade = true
      tierName = 'Registered'
    } else {
      canUpgrade = true
      tierName = 'Free'
    }

    const searchesUsed = user.dailyUsage.searchCount || 0
    const searchesRemaining = dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - searchesUsed)
    const limitReached = dailyLimit !== -1 && searchesUsed >= dailyLimit

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        user: {
          email: user.email,
          tier: userTier,
          tierName: tierName
        },
        limits: {
          dailyLimit: dailyLimit,
          searchesUsed: searchesUsed,
          searchesRemaining: searchesRemaining,
          limitReached: limitReached,
          canUpgrade: canUpgrade
        },
        usage: user.dailyUsage
      })
    }

  } catch (error) {
    console.error('Check user limits error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      })
    }
  }
}
