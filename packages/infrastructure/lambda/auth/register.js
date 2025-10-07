const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const cognitoClient = new CognitoIdentityProviderClient({})

exports.handler = async (event) => {
  console.log('Register function called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    const body = JSON.parse(event.body || '{}')
    console.log('Registration request body:', body)

    // Handle both direct registration and post-confirmation
    if (body.userId && body.email) {
      // This is a post-confirmation call from Cognito
      const { userId, email, role = 'customer', profile = {} } = body

      const userProfile = {
        userId,
        email,
        role,
        profile: {
          name: profile.name || '',
          company: profile.company || '',
          ...profile,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
      }

      await docClient.send(new PutCommand({
        TableName: process.env.USER_TABLE_NAME,
        Item: userProfile,
      }))

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'User profile created successfully',
          user: userProfile,
        }),
      }
    } else {
      // This is a direct registration request from frontend
      const { name, email, password, role = 'customer', company } = body

      if (!name || !email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name, email, and password are required' }),
        }
      }

      // For now, return success and let frontend handle Cognito registration
      // The actual Cognito registration is handled by the frontend
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Registration request received. Please complete registration through Cognito.',
          email,
          role,
        }),
      }
    }
  } catch (error) {
    console.error('Error in registration:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    }
  }
}