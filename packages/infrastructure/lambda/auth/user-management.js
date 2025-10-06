const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminDisableUserCommand, AdminEnableUserCommand } = require('@aws-sdk/client-cognito-identity-provider')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const cognitoClient = new CognitoIdentityProviderClient({})

// Input validation schemas
const validateUserProfile = (profile) => {
  const errors = []
  
  if (!profile.name || profile.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long')
  }
  
  if (profile.company && profile.company.length > 100) {
    errors.push('Company name must be less than 100 characters')
  }
  
  return errors
}

const validateRole = (role) => {
  const validRoles = ['customer', 'partner', 'admin']
  return validRoles.includes(role)
}

exports.handler = async (event) => {
  console.log('User management function called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    const { resource, httpMethod, pathParameters, queryStringParameters } = event
    const requesterId = event.requestContext?.authorizer?.claims?.sub
    const requesterRole = event.requestContext?.authorizer?.claims?.['custom:role']

    // Admin-only operations
    if (resource.includes('/admin/users')) {
      if (requesterRole !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Admin access required' }),
        }
      }

      if (httpMethod === 'GET') {
        // List all users (admin only)
        const { role, status, limit = 50, lastKey } = queryStringParameters || {}
        
        let params = {
          TableName: process.env.USER_TABLE_NAME,
          Limit: parseInt(limit),
        }

        if (lastKey) {
          params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey))
        }

        if (role) {
          params.IndexName = 'RoleIndex'
          params.KeyConditionExpression = '#role = :role'
          params.ExpressionAttributeNames = { '#role': 'role' }
          params.ExpressionAttributeValues = { ':role': role }
          
          if (status) {
            params.FilterExpression = '#status = :status'
            params.ExpressionAttributeNames['#status'] = 'status'
            params.ExpressionAttributeValues[':status'] = status
          }
          
          const result = await docClient.send(new QueryCommand(params))
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              users: result.Items || [],
              count: result.Count || 0,
              lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
            }),
          }
        } else {
          if (status) {
            params.FilterExpression = '#status = :status'
            params.ExpressionAttributeNames = { '#status': 'status' }
            params.ExpressionAttributeValues = { ':status': status }
          }
          
          const result = await docClient.send(new ScanCommand(params))
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              users: result.Items || [],
              count: result.Count || 0,
              lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
            }),
          }
        }
      }

      if (httpMethod === 'PUT' && pathParameters?.userId) {
        // Update user (admin only)
        const body = JSON.parse(event.body || '{}')
        const { role, status, profile } = body
        const userId = pathParameters.userId

        const updateExpressions = []
        const expressionAttributeNames = {}
        const expressionAttributeValues = {}

        if (role && validateRole(role)) {
          updateExpressions.push('#role = :role')
          expressionAttributeNames['#role'] = 'role'
          expressionAttributeValues[':role'] = role

          // Update role in Cognito as well
          await cognitoClient.send(new AdminUpdateUserAttributesCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: userId,
            UserAttributes: [
              {
                Name: 'custom:role',
                Value: role,
              },
            ],
          }))
        }

        if (status && ['active', 'suspended', 'pending'].includes(status)) {
          updateExpressions.push('#status = :status')
          expressionAttributeNames['#status'] = 'status'
          expressionAttributeValues[':status'] = status

          // Enable/disable user in Cognito
          if (status === 'suspended') {
            await cognitoClient.send(new AdminDisableUserCommand({
              UserPoolId: process.env.USER_POOL_ID,
              Username: userId,
            }))
          } else if (status === 'active') {
            await cognitoClient.send(new AdminEnableUserCommand({
              UserPoolId: process.env.USER_POOL_ID,
              Username: userId,
            }))
          }
        }

        if (profile) {
          const validationErrors = validateUserProfile(profile)
          if (validationErrors.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
            }
          }

          updateExpressions.push('profile = :profile')
          expressionAttributeValues[':profile'] = profile
        }

        if (updateExpressions.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No valid fields to update' }),
          }
        }

        updateExpressions.push('updatedAt = :updatedAt')
        expressionAttributeValues[':updatedAt'] = new Date().toISOString()

        const result = await docClient.send(new UpdateCommand({
          TableName: process.env.USER_TABLE_NAME,
          Key: { userId },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        }))

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'User updated successfully',
            user: result.Attributes,
          }),
        }
      }
    }

    // User profile operations
    if (resource.includes('/user/profile')) {
      if (!requesterId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' }),
        }
      }

      if (httpMethod === 'GET') {
        // Get own profile
        const result = await docClient.send(new GetCommand({
          TableName: process.env.USER_TABLE_NAME,
          Key: { userId: requesterId },
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

      if (httpMethod === 'PUT') {
        // Update own profile
        const body = JSON.parse(event.body || '{}')
        const { profile } = body

        if (!profile) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Profile data is required' }),
          }
        }

        const validationErrors = validateUserProfile(profile)
        if (validationErrors.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
          }
        }

        const result = await docClient.send(new UpdateCommand({
          TableName: process.env.USER_TABLE_NAME,
          Key: { userId: requesterId },
          UpdateExpression: 'SET profile = :profile, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':profile': profile,
            ':updatedAt': new Date().toISOString(),
          },
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
    }

    // Get user by ID (for public profiles)
    if (httpMethod === 'GET' && pathParameters?.userId) {
      const userId = pathParameters.userId
      
      const result = await docClient.send(new GetCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId },
      }))

      if (!result.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' }),
        }
      }

      // Return limited public profile information
      const publicProfile = {
        userId: result.Item.userId,
        profile: {
          name: result.Item.profile.name,
          company: result.Item.profile.company,
        },
        role: result.Item.role,
        createdAt: result.Item.createdAt,
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ user: publicProfile }),
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' }),
    }
  } catch (error) {
    console.error('Error in user management:', error)
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