const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const USER_TABLE_NAME = process.env.USER_TABLE_NAME
const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE

exports.handler = async (event) => {
  console.log('Profile function called:', JSON.stringify(event, null, 2))
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Get userId from Cognito claims
    const userId = event.requestContext?.authorizer?.claims?.sub
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    console.log('Looking up user with userId:', userId)

    if (event.httpMethod === 'GET') {
      const result = await docClient.send(new GetCommand({
        TableName: USER_TABLE_NAME,
        Key: { userId },
      }))

      if (!result.Item) {
        console.log('User not found in database')
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User profile not found' }),
        }
      }

      console.log('User found:', result.Item)
      
      // Also fetch user's entitlements
      let entitlements = []
      if (USER_SOLUTION_ENTITLEMENTS_TABLE) {
        try {
          // Query by email (pk = user#email) for consistency
          const userEmail = result.Item.email
          const entitlementResult = await docClient.send(new QueryCommand({
            TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: {
              ':pk': `user#${userEmail}` // Use email instead of userId
            }
          }))
          entitlements = entitlementResult.Items || []
          console.log('Found entitlements for email:', userEmail, entitlements)
        } catch (error) {
          console.error('Error fetching entitlements:', error)
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          user: result.Item,
          entitlements: entitlements
        }),
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }

  } catch (error) {
    console.error('Profile function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
