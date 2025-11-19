const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider')
const https = require('https')
const crypto = require('crypto')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const cognitoClient = new CognitoIdentityProviderClient({})

// Generate permanent token for user-solution combination
const generatePermanentToken = (userEmail, solutionId) => {
  const hash = crypto.createHash('sha256')
  hash.update(`${userEmail}:${solutionId}:${process.env.TOKEN_SECRET || 'default-secret'}`)
  return 'tok_perm_' + hash.digest('hex').substring(0, 32)
}

// Get base URL for solution
function getBaseUrl(solutionId) {
  const solutionUrls = {
    'faiss': 'https://awssolutionfinder.solutions.cloudnestle.com',
    'aws-finder': 'https://awssolutionfinder.solutions.cloudnestle.com'
  }
  
  return solutionUrls[solutionId] || `https://solution-${solutionId}.example.com`
}

// reCAPTCHA verification function
const verifyRecaptcha = async (token) => {
  const secretKey = '6LdKqgEsAAAAAAbNhlUVBhV9VZUVKzoMQuur-M5' // Production secret key
  
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
    const queryParams = event.queryStringParameters || {}
    
    // Get solution_id from query params (URL) or body, prioritizing query params
    const solution_id = queryParams.solution_id || body.solution_id
    const return_url = queryParams.return_url || body.return_url
    
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
      tier: solution_id ? 'registered' : 'free', // Set tier based on whether they're registering for a solution
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

    let responseData = {
      message: 'User profile created successfully',
      user: userProfile,
    }

    // If solution_id is provided, create entitlement and generate token
    if (solution_id && process.env.USER_SOLUTION_ENTITLEMENTS_TABLE) {
      try {
        const token = generatePermanentToken(email, solution_id)
        const pk = `user#${email}`
        const sk = `solution#${solution_id}`
        
        // Create entitlement for registered tier
        const entitlement = {
          pk,
          sk,
          user_email: email,
          solution_id,
          access_tier: 'registered',
          token,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'active'
        }

        await docClient.send(new PutCommand({
          TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
          Item: entitlement,
        }))

        // Generate redirect URL
        const baseUrl = return_url || getBaseUrl(solution_id)
        const redirectUrl = `${baseUrl}?token=${token}&user_email=${encodeURIComponent(email)}&tier=registered`

        responseData.solution_access = {
          solution_id,
          access_tier: 'registered',
          token,
          redirect_url: redirectUrl
        }

        console.log(`Created entitlement for ${email}:${solution_id} with token`)
      } catch (error) {
        console.error('Error creating solution entitlement:', error)
        // Don't fail the registration if entitlement creation fails
        responseData.solution_access_error = 'Failed to create solution access'
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(responseData),
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