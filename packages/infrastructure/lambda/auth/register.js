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

    // This function is called after Cognito registration to create user profile
    const body = JSON.parse(event.body || '{}')
    const { userId, email, role = 'customer', profile = {} } = body

    if (!userId || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId and email are required' }),
      }
    }

    // Create user profile in DynamoDB
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
  } catch (error) {
    console.error('Error creating user profile:', error)
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