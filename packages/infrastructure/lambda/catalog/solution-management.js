const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
// Generate UUID without external dependency
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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
  
  if (!solution.category || solution.category.trim().length < 1) {
    errors.push('Category is required')
  }
  
  if (!solution.pricing || !solution.pricing.model || !['upfront', 'subscription'].includes(solution.pricing.model)) {
    errors.push('Valid pricing model is required (upfront or subscription)')
  }
  
  if (!solution.pricing.amount || solution.pricing.amount <= 0) {
    errors.push('Pricing amount must be greater than 0')
  }
  
  if (solution.pricing.model === 'subscription' && !solution.pricing.billingCycle) {
    errors.push('Billing cycle is required for subscription pricing')
  }
  
  return errors
}

const generatePresignedUrl = async (bucketName, key, operation = 'getObject', expiresIn = 3600) => {
  try {
    const command = operation === 'putObject' 
      ? new PutObjectCommand({ Bucket: bucketName, Key: key })
      : new GetObjectCommand({ Bucket: bucketName, Key: key })
    
    return await getSignedUrl(s3Client, command, { expiresIn })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    throw error
  }
}

exports.handler = async (event) => {
  console.log('Solution management function called:', JSON.stringify(event, null, 2))
  
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
        const solutionData = body

        const validationErrors = validateSolution(solutionData)
        if (validationErrors.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
          }
        }

        const solutionId = generateUUID()
        const solution = {
          solutionId,
          partnerId: requesterId,
          name: solutionData.name,
          description: solutionData.description,
          category: solutionData.category,
          tags: solutionData.tags || [],
          pricing: solutionData.pricing,
          assets: {
            images: solutionData.assets?.images || [],
            documentation: solutionData.assets?.documentation || [],
            downloadUrl: solutionData.assets?.downloadUrl || '',
          },
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await docClient.send(new PutCommand({
          TableName: process.env.SOLUTION_TABLE_NAME,
          Item: solution,
        }))

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            message: 'Solution created successfully',
            solution,
          }),
        }
      }

      if (httpMethod === 'GET') {
        // Get partner's solutions
        const { status, limit = 50, lastKey } = queryStringParameters || {}
        
        let params = {
          TableName: process.env.SOLUTION_TABLE_NAME,
          IndexName: 'PartnerIndex',
          KeyConditionExpression: 'partnerId = :partnerId',
          ExpressionAttributeValues: {
            ':partnerId': requesterId,
          },
          Limit: parseInt(limit),
          ScanIndexForward: false, // Sort by createdAt descending
        }

        if (lastKey) {
          params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey))
        }

        if (status) {
          params.FilterExpression = '#status = :status'
          params.ExpressionAttributeNames = { '#status': 'status' }
          params.ExpressionAttributeValues[':status'] = status
        }

        const result = await docClient.send(new QueryCommand(params))

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            solutions: result.Items || [],
            count: result.Count || 0,
            lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
          }),
        }
      }

      if (httpMethod === 'PUT' && pathParameters?.solutionId) {
        // Update solution
        const solutionId = pathParameters.solutionId
        const body = JSON.parse(event.body || '{}')

        // Check if user owns this solution
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
        const allowedFields = ['name', 'description', 'category', 'tags', 'pricing', 'assets']
        
        allowedFields.forEach(field => {
          if (body[field] !== undefined) {
            updateExpressions.push(`#${field} = :${field}`)
            expressionAttributeNames[`#${field}`] = field
            expressionAttributeValues[`:${field}`] = body[field]
          }
        })

        if (updateExpressions.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No valid fields to update' }),
          }
        }

        // Validate if updating core solution data
        if (body.name || body.description || body.category || body.pricing) {
          const validationErrors = validateSolution({ ...existingSolution.Item, ...body })
          if (validationErrors.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
            }
          }
        }

        updateExpressions.push('updatedAt = :updatedAt')
        expressionAttributeValues[':updatedAt'] = new Date().toISOString()

        // If solution was approved and core data changed, set back to draft
        if (existingSolution.Item.status === 'approved' && (body.name || body.description || body.pricing)) {
          updateExpressions.push('#status = :status')
          expressionAttributeNames['#status'] = 'status'
          expressionAttributeValues[':status'] = 'draft'
        }

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

        // Check if user owns this solution
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

        // Delete associated images from S3
        if (existingSolution.Item.assets?.images?.length > 0) {
          for (const imageUrl of existingSolution.Item.assets.images) {
            try {
              const key = imageUrl.split('/').pop() // Extract key from URL
              await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.ASSETS_BUCKET_NAME,
                Key: `solutions/${solutionId}/${key}`,
              }))
            } catch (error) {
              console.error('Error deleting image:', error)
              // Continue with deletion even if image deletion fails
            }
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

    // Admin solution management
    if (resource.includes('/admin/solutions')) {
      if (requesterRole !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Admin access required' }),
        }
      }

      if (httpMethod === 'GET') {
        // Get all solutions for admin review
        const { status, category, partnerId, limit = 50, lastKey } = queryStringParameters || {}
        
        let params = {
          TableName: process.env.SOLUTION_TABLE_NAME,
          Limit: parseInt(limit),
        }

        if (lastKey) {
          params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey))
        }

        if (status) {
          params.IndexName = 'StatusIndex'
          params.KeyConditionExpression = '#status = :status'
          params.ExpressionAttributeNames = { '#status': 'status' }
          params.ExpressionAttributeValues = { ':status': status }
          
          if (category) {
            params.FilterExpression = 'category = :category'
            params.ExpressionAttributeValues[':category'] = category
          }
          
          if (partnerId) {
            params.FilterExpression = params.FilterExpression 
              ? `${params.FilterExpression} AND partnerId = :partnerId`
              : 'partnerId = :partnerId'
            params.ExpressionAttributeValues[':partnerId'] = partnerId
          }
          
          const result = await docClient.send(new QueryCommand(params))
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              solutions: result.Items || [],
              count: result.Count || 0,
              lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
            }),
          }
        } else {
          // Scan all solutions
          if (category) {
            params.FilterExpression = 'category = :category'
            params.ExpressionAttributeValues = { ':category': category }
          }
          
          if (partnerId) {
            params.FilterExpression = params.FilterExpression 
              ? `${params.FilterExpression} AND partnerId = :partnerId`
              : 'partnerId = :partnerId'
            params.ExpressionAttributeValues = params.ExpressionAttributeValues || {}
            params.ExpressionAttributeValues[':partnerId'] = partnerId
          }
          
          const result = await docClient.send(new ScanCommand(params))
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              solutions: result.Items || [],
              count: result.Count || 0,
              lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
            }),
          }
        }
      }

      if (httpMethod === 'PUT' && pathParameters?.solutionId) {
        // Update solution status (approve/reject)
        const solutionId = pathParameters.solutionId
        const body = JSON.parse(event.body || '{}')
        const { status, reviewNotes } = body

        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Valid status is required (approved, rejected, pending)' }),
          }
        }

        const result = await docClient.send(new UpdateCommand({
          TableName: process.env.SOLUTION_TABLE_NAME,
          Key: { solutionId },
          UpdateExpression: 'SET #status = :status, reviewNotes = :reviewNotes, reviewedAt = :reviewedAt, updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':status': status,
            ':reviewNotes': reviewNotes || '',
            ':reviewedAt': new Date().toISOString(),
            ':updatedAt': new Date().toISOString(),
          },
          ReturnValues: 'ALL_NEW',
        }))

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Solution status updated successfully',
            solution: result.Attributes,
          }),
        }
      }
    }

    // Image upload functionality
    if (resource.includes('/upload-image') && httpMethod === 'POST') {
      if (!requesterId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required' }),
        }
      }

      const body = JSON.parse(event.body || '{}')
      const { fileName, fileType, solutionId } = body

      if (!fileName || !fileType) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'fileName and fileType are required' }),
        }
      }

      // Generate unique key for the image
      const imageId = generateUUID()
      const key = solutionId 
        ? `solutions/${solutionId}/${imageId}-${fileName}`
        : `temp/${requesterId}/${imageId}-${fileName}`

      // Generate presigned URL for upload
      const uploadUrl = await generatePresignedUrl(process.env.ASSETS_BUCKET_NAME, key, 'putObject', 300)
      const imageUrl = `https://${process.env.ASSETS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          uploadUrl,
          imageUrl,
          key,
        }),
      }
    }

    // Get categories
    if (resource.includes('/categories') && httpMethod === 'GET') {
      // Get unique categories from all approved solutions
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
        ProjectionExpression: 'category',
      }))

      const categories = [...new Set(result.Items?.map(item => item.category) || [])]
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ categories }),
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' }),
    }
  } catch (error) {
    console.error('Error in solution management:', error)
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