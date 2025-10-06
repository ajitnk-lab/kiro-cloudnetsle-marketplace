const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

exports.handler = async (event) => {
  console.log('Catalog function called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    const { resource, pathParameters, queryStringParameters } = event

    // Get single solution by ID
    if (pathParameters?.solutionId) {
      const result = await docClient.send(new GetCommand({
        TableName: process.env.SOLUTION_TABLE_NAME,
        Key: { solutionId: pathParameters.solutionId },
      }))

      if (!result.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Solution not found' }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ solution: result.Item }),
      }
    }

    // Search solutions
    if (resource.includes('/search')) {
      const { q: query, category, status = 'approved' } = queryStringParameters || {}
      
      let scanParams = {
        TableName: process.env.SOLUTION_TABLE_NAME,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
      }

      // Add category filter if provided
      if (category) {
        scanParams.FilterExpression += ' AND category = :category'
        scanParams.ExpressionAttributeValues[':category'] = category
      }

      // Add text search filter if provided
      if (query) {
        scanParams.FilterExpression += ' AND (contains(#name, :query) OR contains(description, :query))'
        scanParams.ExpressionAttributeNames['#name'] = 'name'
        scanParams.ExpressionAttributeValues[':query'] = query
      }

      const result = await docClient.send(new ScanCommand(scanParams))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          solutions: result.Items || [],
          count: result.Count || 0,
        }),
      }
    }

    // List all approved solutions
    const result = await docClient.send(new QueryCommand({
      TableName: process.env.SOLUTION_TABLE_NAME,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'approved',
      },
      ScanIndexForward: false, // Sort by updatedAt descending
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        solutions: result.Items || [],
        count: result.Count || 0,
      }),
    }
  } catch (error) {
    console.error('Error handling catalog request:', error)
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