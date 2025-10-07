const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb')
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { randomUUID } = require('crypto')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const s3Client = new S3Client({})

// Validation functions
const validateSolution = (solution) => {
  const errors = []
  
  if (!solution.name || solution.name.trim().length < 2) {
    errors.push('Solution name must be at least 2 characters')
  }
  
  if (!solution.description || solution.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters')
  }
  
  if (!solution.category || solution.category.trim().length === 0) {
    errors.push('Category is required')
  }
  
  if (!solution.pricing || !solution.pricing.model || !['upfront', 'subscription'].includes(solution.pricing.model)) {
    errors.push('Valid pricing model is required (upfront or subscription)')
  }
  
  if (!solution.pricing || !solution.pricing.amount || solution.pricing.amount <= 0) {
    errors.push('Pricing amount must be greater than 0')
  }
  
  if (solution.pricing?.model === 'subscription' && !solution.pricing.billingCycle) {
    errors.push('Billing cycle is required for subscription pricing')
  }
  
  return errors
}

const generatePresignedUrl = async (bucketName, key, operation = 'getObject') => {
  try {
    const command = operation === 'putObject' 
      ? new PutObjectCommand({ Bucket: bucketName, Key: key })
      : new GetObjectCommand({ Bucket: bucketName, Key: key })
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return url
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    throw error
  }
}

exports.handler = async (event) => {
  console.log('Catalog function called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
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

    // Partner solution management
    if (resource.includes('/partner/solutions')) {
      if (requesterRole !== 'partner' && requesterRole !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Partner access required' }),
        }
      }

      if (httpMethod === 'POST') {
        // Create new solution
        const body = JSON.parse(event.body || '{}')
        const { solution } = body

        if (!solution) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Solution data is required' }),
          }
        }

        const validationErrors = validateSolution(solution)
        if (validationErrors.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
          }
        }

        const solutionId = randomUUID()
        const newSolution = {
          solutionId,
          partnerId: requesterId,
          ...solution,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await docClient.send(new PutCommand({
          TableName: process.env.SOLUTION_TABLE_NAME,
          Item: newSolution,
        }))

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            message: 'Solution created successfully',
            solution: newSolution,
          }),
        }
      }

      if (httpMethod === 'GET') {
        // Get partner's solutions
        const result = await docClient.send(new QueryCommand({
          TableName: process.env.SOLUTION_TABLE_NAME,
          IndexName: 'PartnerIndex',
          KeyConditionExpression: 'partnerId = :partnerId',
          ExpressionAttributeValues: {
            ':partnerId': requesterId,
          },
          ScanIndexForward: false,
        }))

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            solutions: result.Items || [],
            count: result.Count || 0,
          }),
        }
      }

      if (httpMethod === 'PUT' && pathParameters?.solutionId) {
        // Update solution
        const solutionId = pathParameters.solutionId
        const body = JSON.parse(event.body || '{}')

        // Check if solution exists and belongs to partner
        const existingSolution = await docClient.send(new GetCommand({
          TableName: process.env.SOLUTION_TABLE_NAME,
          Key: { solutionId },
        }))

        if (!existingSolution.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Solution not found' }),
          }
        }

        if (existingSolution.Item.partnerId !== requesterId && requesterRole !== 'admin') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied' }),
          }
        }

        const updateExpressions = []
        const expressionAttributeNames = {}
        const expressionAttributeValues = {}

        // Build update expression dynamically
        Object.keys(body).forEach((key) => {
          if (key !== 'solutionId' && key !== 'partnerId' && key !== 'createdAt') {
            updateExpressions.push(`#${key} = :${key}`)
            expressionAttributeNames[`#${key}`] = key
            expressionAttributeValues[`:${key}`] = body[key]
          }
        })

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
          TableName: process.env.SOLUTION_TABLE_NAME,
          Key: { solutionId },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        }))

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Solution updated successfully',
            solution: result.Attributes,
          }),
        }
      }

      if (httpMethod === 'DELETE' && pathParameters?.solutionId) {
        // Delete solution
        const solutionId = pathParameters.solutionId

        // Check if solution exists and belongs to partner
        const existingSolution = await docClient.send(new GetCommand({
          TableName: process.env.SOLUTION_TABLE_NAME,
          Key: { solutionId },
        }))

        if (!existingSolution.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Solution not found' }),
          }
        }

        if (existingSolution.Item.partnerId !== requesterId && requesterRole !== 'admin') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied' }),
          }
        }

        await docClient.send(new DeleteCommand({
          TableName: process.env.SOLUTION_TABLE_NAME,
          Key: { solutionId },
        }))

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Solution deleted successfully' }),
        }
      }
    }

    // Image upload
    if (resource.includes('/upload-image') && httpMethod === 'POST') {
      if (!requesterId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required' }),
        }
      }

      const imageKey = `solutions/${requesterId}/${randomUUID()}.jpg`
      const uploadUrl = await generatePresignedUrl(process.env.ASSETS_BUCKET_NAME, imageKey, 'putObject')

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          uploadUrl,
          imageKey,
          imageUrl: `https://${process.env.ASSETS_BUCKET_NAME}.s3.amazonaws.com/${imageKey}`,
        }),
      }
    }

    // Get categories
    if (resource.includes('/categories') && httpMethod === 'GET') {
      // For now, return predefined categories. In a real app, you might query from database
      const categories = [
        'Development Tools',
        'Business Software',
        'Security Solutions',
        'Analytics Tools',
        'Design & Creative',
        'Productivity',
        'Communication',
        'Marketing',
        'Finance & Accounting',
        'Project Management',
      ]

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ categories }),
      }
    }

    // Public catalog endpoints
    if (pathParameters?.solutionId) {
      // Get single solution by ID
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

      // Only return approved solutions for public access
      if (result.Item.status !== 'approved' && requesterRole !== 'admin' && result.Item.partnerId !== requesterId) {
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
      const { 
        q: query, 
        category, 
        priceMin, 
        priceMax, 
        pricingModel,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        limit = 20,
        offset = 0
      } = queryStringParameters || {}
      
      let scanParams = {
        TableName: process.env.SOLUTION_TABLE_NAME,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'approved',
        },
        Limit: Math.min(parseInt(limit), 100), // Cap at 100
      }

      // Add filters
      if (category) {
        scanParams.FilterExpression += ' AND category = :category'
        scanParams.ExpressionAttributeValues[':category'] = category
      }

      if (pricingModel) {
        scanParams.FilterExpression += ' AND pricing.#model = :pricingModel'
        scanParams.ExpressionAttributeNames['#model'] = 'model'
        scanParams.ExpressionAttributeValues[':pricingModel'] = pricingModel
      }

      if (priceMin) {
        scanParams.FilterExpression += ' AND pricing.amount >= :priceMin'
        scanParams.ExpressionAttributeValues[':priceMin'] = parseFloat(priceMin)
      }

      if (priceMax) {
        scanParams.FilterExpression += ' AND pricing.amount <= :priceMax'
        scanParams.ExpressionAttributeValues[':priceMax'] = parseFloat(priceMax)
      }

      if (query) {
        scanParams.FilterExpression += ' AND (contains(#name, :query) OR contains(description, :query) OR contains(tags, :query))'
        scanParams.ExpressionAttributeNames['#name'] = 'name'
        scanParams.ExpressionAttributeValues[':query'] = query
      }

      const result = await docClient.send(new ScanCommand(scanParams))

      // Sort results (DynamoDB scan doesn't support sorting, so we do it in memory)
      let sortedItems = result.Items || []
      if (sortBy && sortedItems.length > 0) {
        sortedItems.sort((a, b) => {
          let aVal = a[sortBy]
          let bVal = b[sortBy]
          
          if (sortBy === 'price') {
            aVal = a.pricing?.amount || 0
            bVal = b.pricing?.amount || 0
          }
          
          if (sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1
          } else {
            return aVal > bVal ? 1 : -1
          }
        })
      }

      // Apply pagination
      const startIndex = parseInt(offset)
      const endIndex = startIndex + parseInt(limit)
      const paginatedItems = sortedItems.slice(startIndex, endIndex)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          solutions: paginatedItems,
          count: paginatedItems.length,
          total: sortedItems.length,
          hasMore: endIndex < sortedItems.length,
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
      Limit: 20, // Default limit
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