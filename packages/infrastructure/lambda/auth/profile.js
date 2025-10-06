const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

exports.handler = async (event) => {
  console.log('Profile function called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    // Extract user ID from Cognito claims
    const userId = event.requestContext?.authorizer?.claims?.sub
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    if (event.httpMethod === 'GET') {
      // Get user profile
      const result = await docClient.send(new GetCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId },
      }))

      if (!result.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User profile not found' }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ user: result.Item }),
      }
    }

    if (event.httpMethod === 'PUT') {
      // Update user profile
      const body = JSON.parse(event.body || '{}')
      const { profile } = body

      if (!profile) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Profile data is required' }),
        }
      }

      const updateExpression = 'SET profile = :profile, updatedAt = :updatedAt'
      const expressionAttributeValues = {
        ':profile': profile,
        ':updatedAt': new Date().toISOString(),
      }

      const result = await docClient.send(new UpdateCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Profile updated successfully',
          user: result.Attributes,
        }),
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  } catch (error) {
    console.error('Error handling profile request:', error)
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