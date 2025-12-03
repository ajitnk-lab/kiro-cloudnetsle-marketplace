const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')
const crypto = require('crypto')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE

const generatePermanentToken = (userId, solutionId) => {
  const hash = crypto.createHash('sha256')
  hash.update(`${userId}:${solutionId}:${process.env.TOKEN_SECRET || 'default-secret'}`)
  return 'tok_perm_' + hash.digest('hex').substring(0, 32)
}

const getBaseUrl = (solutionId) => {
  const solutionUrls = {
    'faiss': 'https://awssolutionfinder.solutions.cloudnestle.com/search',
    'aws-finder': 'https://awssolutionfinder.solutions.cloudnestle.com/search',
    'aws-solution-finder-001': 'https://awssolutionfinder.solutions.cloudnestle.com/search'
  }
  
  return solutionUrls[solutionId] || `https://solution-${solutionId}.example.com`
}

exports.handler = async (event) => {
  console.log('Solution Token Generator called:', JSON.stringify(event, null, 2))
  
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
    const { user_id, solution_id, access_tier } = body

    if (!user_id || !solution_id || !access_tier) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: user_id, solution_id, access_tier' 
        }),
      }
    }

    if (!['registered', 'pro'].includes(access_tier)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid access_tier. Must be "registered" or "pro"' 
        }),
      }
    }

    const pk = `user#${user_id}` // Use UUID-based key (consistent with other functions)
    const sk = `solution#${solution_id}`
    
    // Check if entitlement already exists
    try {
      const getCommand = new GetCommand({
        TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
        Key: { pk, sk }
      })
      const result = await docClient.send(getCommand)
      
      if (result.Item) {
        // Return existing token
        const baseUrl = getBaseUrl(solution_id)
        const redirectUrl = `${baseUrl}?token=${result.Item.token}&user_id=${encodeURIComponent(user_id)}&tier=${access_tier}`
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            token: result.Item.token,
            expires_at: null,
            redirect_url: redirectUrl,
            access_tier,
            user_id
          }),
        }
      }
    } catch (error) {
      console.log('No existing entitlement found, creating new one')
    }

    // Generate new permanent token
    const token = generatePermanentToken(user_id, solution_id)
    
    // Create new entitlement
    const putCommand = new PutCommand({
      TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
      Item: {
        pk,
        sk,
        userId: user_id, // Use userId field (consistent with other functions)
        solutionId: solution_id, // Use solutionId field (consistent with other functions)
        access_tier,
        token,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      }
    })

    await docClient.send(putCommand)
    console.log(`Created new entitlement for ${user_id}:${solution_id}`)

    // Generate redirect URL
    const baseUrl = getBaseUrl(solution_id)
    const redirectUrl = `${baseUrl}?token=${token}&user_id=${encodeURIComponent(user_id)}&tier=${access_tier}`

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token,
        expires_at: null,
        redirect_url: redirectUrl,
        access_tier,
        user_id
      }),
    }

  } catch (error) {
    console.error('Error in solution token generator:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    }
  }
}


