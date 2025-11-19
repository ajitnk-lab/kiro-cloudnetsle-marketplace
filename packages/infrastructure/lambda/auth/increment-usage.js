const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const USER_TABLE = process.env.USER_TABLE

exports.handler = async (event) => {
  console.log('Increment usage request:', JSON.stringify(event, null, 2))

  try {
    const { userEmail } = JSON.parse(event.body)

    if (!userEmail) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'User email is required' })
      }
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // First get the user to find their userId
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

    // Get user's entitlement to determine actual tier
    let userTier = 'free'
    let dailyLimit = 10
    
    console.log('Looking up entitlement for user:', userEmail)
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
      
      console.log('Entitlement lookup result:', entitlementResult.Items)
      
      if (entitlementResult.Items && entitlementResult.Items.length > 0) {
        const entitlement = entitlementResult.Items[0]
        userTier = entitlement.access_tier || 'registered'
        dailyLimit = userTier === 'pro' ? -1 : 10
        console.log('Found entitlement, tier:', userTier, 'dailyLimit:', dailyLimit)
      } else {
        console.log('No entitlement found, using default tier')
      }
    } catch (error) {
      console.log('Could not fetch entitlement, using default tier:', error)
    }

    // Check if daily usage exists and is for today
    let currentUsage = user.dailyUsage || { date: today, searchCount: 0 }
    
    // Reset if it's a new day
    if (currentUsage.date !== today) {
      currentUsage = { date: today, searchCount: 0 }
    }

    // Check limits BEFORE incrementing
    const currentSearches = currentUsage.searchCount

    // If user has reached limit, return 429 (Too Many Requests)
    if (dailyLimit !== -1 && currentSearches >= dailyLimit) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          message: 'Daily search limit reached. Upgrade to Pro for unlimited searches.',
          usage: {
            searchesUsed: currentSearches,
            dailyLimit: dailyLimit,
            limitReached: true,
            tier: userTier
          }
        })
      }
    }

    // Increment search count only if under limit
    currentUsage.searchCount += 1

    // Update user's daily usage using userId as primary key
    const updateCommand = new UpdateCommand({
      TableName: USER_TABLE,
      Key: { userId: user.userId },
      UpdateExpression: 'SET dailyUsage = :usage, updatedAt = :updatedAt',
      ConditionExpression: 'attribute_exists(userId)',
      ExpressionAttributeValues: {
        ':usage': currentUsage,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    })

    const result = await docClient.send(updateCommand)
    const updatedUser = result.Attributes

    // Return success with updated usage
    const searchesUsed = updatedUser.dailyUsage.searchCount
    const limitReached = dailyLimit !== -1 && searchesUsed >= dailyLimit

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        usage: {
          searchesUsed: searchesUsed,
          dailyLimit: dailyLimit,
          limitReached: limitReached,
          tier: userTier
        }
      })
    }

  } catch (error) {
    console.error('Increment usage error:', error)
    
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'User not found' })
      }
    }

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
