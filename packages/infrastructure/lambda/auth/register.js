const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider')
const https = require('https')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const cognitoClient = new CognitoIdentityProviderClient({})

// reCAPTCHA verification function
const verifyRecaptcha = async (token) => {
  const secretKey = '6LdKqgEsAAAAAAbNhlUVBhV9VZUVKzoMQuur-M5-'
  
  return new Promise((resolve, reject) => {
    const postData = `secret=${secretKey}&response=${token}`
    
    const options = {
      hostname: 'www.google.com',
      port: 443,
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    })
    
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

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
    const { userId, email, role, userType, profile = {}, recaptchaToken } = body
    
    // Verify reCAPTCHA if token is provided
    if (recaptchaToken) {
      try {
        const recaptchaResult = await verifyRecaptcha(recaptchaToken)
        if (!recaptchaResult.success) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'reCAPTCHA verification failed' }),
          }
        }
      } catch (error) {
        console.error('reCAPTCHA verification error:', error)
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'reCAPTCHA verification failed' }),
        }
      }
    }
    
    // Use userType if provided, otherwise fall back to role, otherwise default to customer
    const userRole = userType || role || 'customer'

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
      role: userRole,
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