const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')
const { randomUUID } = require('crypto')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const sesClient = new SESClient({})

// Validation functions
const validatePartnerApplication = (application) => {
  const errors = []
  
  if (!application.businessName || application.businessName.trim().length < 2) {
    errors.push('Business name is required and must be at least 2 characters')
  }
  
  if (!application.businessType || !['individual', 'company', 'organization'].includes(application.businessType)) {
    errors.push('Valid business type is required (individual, company, organization)')
  }
  
  if (!application.contactInfo || !application.contactInfo.phone) {
    errors.push('Contact phone number is required')
  }
  
  if (!application.businessAddress || !application.businessAddress.country) {
    errors.push('Business address with country is required')
  }
  
  if (!application.taxInfo || !application.taxInfo.taxId) {
    errors.push('Tax ID is required')
  }
  
  return errors
}

const sendNotificationEmail = async (to, subject, body) => {
  try {
    await sesClient.send(new SendEmailCommand({
      Source: process.env.FROM_EMAIL || 'ajitnk2006+noreply@gmail.com',
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Html: {
            Data: body,
          },
        },
      },
    }))
  } catch (error) {
    console.error('Failed to send email:', error)
    // Don't fail the main operation if email fails
  }
}

exports.handler = async (event) => {
  console.log('Partner application function called:', JSON.stringify(event, null, 2))
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      'Content-Type': 'application/json',
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      }
    }

    const { httpMethod, pathParameters, queryStringParameters } = event
    const requesterId = event.requestContext?.authorizer?.claims?.sub
    const requesterRole = event.requestContext?.authorizer?.claims?.['custom:role']

    if (httpMethod === 'POST') {
      // Submit partner application
      if (!requesterId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Authentication required' }),
        }
      }

      const body = JSON.parse(event.body || '{}')
      const { application } = body

      if (!application) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Application data is required' }),
        }
      }

      const validationErrors = validatePartnerApplication(application)
      if (validationErrors.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
        }
      }

      const applicationId = randomUUID()
      const partnerApplication = {
        applicationId,
        userId: requesterId,
        ...application,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Save application
      await docClient.send(new PutCommand({
        TableName: process.env.PARTNER_APPLICATION_TABLE_NAME,
        Item: partnerApplication,
      }))

      // Send confirmation email to applicant
      const userEmail = event.requestContext?.authorizer?.claims?.email
      if (userEmail) {
        await sendNotificationEmail(
          userEmail,
          'Partner Application Submitted',
          `
            <h2>Thank you for your partner application!</h2>
            <p>We have received your application to become a partner on our marketplace.</p>
            <p><strong>Application ID:</strong> ${applicationId}</p>
            <p>Our team will review your application and get back to you within 3-5 business days.</p>
            <p>Best regards,<br>Marketplace Team</p>
          `
        )
      }

      // Notify admins (you would typically have an admin notification system)
      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail) {
        await sendNotificationEmail(
          adminEmail,
          'New Partner Application Submitted',
          `
            <h2>New Partner Application</h2>
            <p>A new partner application has been submitted and requires review.</p>
            <p><strong>Application ID:</strong> ${applicationId}</p>
            <p><strong>Business Name:</strong> ${application.businessName}</p>
            <p><strong>Applicant:</strong> ${userEmail}</p>
            <p>Please review the application in the admin dashboard.</p>
          `
        )
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Partner application submitted successfully',
          applicationId,
          status: 'pending',
        }),
      }
    }

    if (httpMethod === 'GET') {
      // Get partner applications
      if (requesterRole === 'admin') {
        // Admin can see all applications
        const { status, limit = 50, lastKey } = queryStringParameters || {}
        
        let params = {
          TableName: process.env.PARTNER_APPLICATION_TABLE_NAME,
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
          
          const result = await docClient.send(new QueryCommand(params))
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              applications: result.Items || [],
              count: result.Count || 0,
              lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
            }),
          }
        } else {
          const result = await docClient.send(new ScanCommand(params))
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              applications: result.Items || [],
              count: result.Count || 0,
              lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
            }),
          }
        }
      } else if (pathParameters?.applicationId) {
        // Get specific application (user can only see their own)
        const applicationId = pathParameters.applicationId
        
        const result = await docClient.send(new GetCommand({
          TableName: process.env.PARTNER_APPLICATION_TABLE_NAME,
          Key: { applicationId },
        }))

        if (!result.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Application not found' }),
          }
        }

        // Check if user owns this application (unless admin)
        if (requesterRole !== 'admin' && result.Item.userId !== requesterId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied' }),
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ application: result.Item }),
        }
      } else {
        // Get user's own applications
        if (!requesterId) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication required' }),
          }
        }

        const result = await docClient.send(new QueryCommand({
          TableName: process.env.PARTNER_APPLICATION_TABLE_NAME,
          IndexName: 'UserIndex',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': requesterId,
          },
        }))

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            applications: result.Items || [],
            count: result.Count || 0,
          }),
        }
      }
    }

    if (httpMethod === 'PUT' && pathParameters?.applicationId) {
      // Update application status (admin only)
      if (requesterRole !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Admin access required' }),
        }
      }

      const applicationId = pathParameters.applicationId
      const body = JSON.parse(event.body || '{}')
      const { status, reviewNotes } = body

      if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Valid status is required (approved, rejected, pending)' }),
        }
      }

      // Get the application first
      const getResult = await docClient.send(new GetCommand({
        TableName: process.env.PARTNER_APPLICATION_TABLE_NAME,
        Key: { applicationId },
      }))

      if (!getResult.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Application not found' }),
        }
      }

      // Update application status
      const updateResult = await docClient.send(new UpdateCommand({
        TableName: process.env.PARTNER_APPLICATION_TABLE_NAME,
        Key: { applicationId },
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

      // If approved, update user role to partner
      if (status === 'approved') {
        await docClient.send(new UpdateCommand({
          TableName: process.env.USER_TABLE_NAME,
          Key: { userId: getResult.Item.userId },
          UpdateExpression: 'SET #role = :role, partnerStatus = :partnerStatus, updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#role': 'role',
          },
          ExpressionAttributeValues: {
            ':role': 'partner',
            ':partnerStatus': 'active',
            ':updatedAt': new Date().toISOString(),
          },
        }))
      }

      // Send notification email
      const userResult = await docClient.send(new GetCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: { userId: getResult.Item.userId },
      }))

      if (userResult.Item?.email) {
        const emailSubject = status === 'approved' 
          ? 'Partner Application Approved!' 
          : status === 'rejected' 
          ? 'Partner Application Update' 
          : 'Partner Application Under Review'

        const emailBody = status === 'approved'
          ? `
            <h2>Congratulations! Your partner application has been approved.</h2>
            <p>Welcome to our marketplace partner program!</p>
            <p>You can now start adding your solutions to the marketplace.</p>
            ${reviewNotes ? `<p><strong>Notes:</strong> ${reviewNotes}</p>` : ''}
            <p>Best regards,<br>Marketplace Team</p>
          `
          : status === 'rejected'
          ? `
            <h2>Partner Application Update</h2>
            <p>Thank you for your interest in becoming a partner. After careful review, we are unable to approve your application at this time.</p>
            ${reviewNotes ? `<p><strong>Reason:</strong> ${reviewNotes}</p>` : ''}
            <p>You may reapply in the future if your circumstances change.</p>
            <p>Best regards,<br>Marketplace Team</p>
          `
          : `
            <h2>Partner Application Update</h2>
            <p>Your partner application is currently under review.</p>
            ${reviewNotes ? `<p><strong>Notes:</strong> ${reviewNotes}</p>` : ''}
            <p>We will notify you once the review is complete.</p>
            <p>Best regards,<br>Marketplace Team</p>
          `

        await sendNotificationEmail(userResult.Item.email, emailSubject, emailBody)
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Application updated successfully',
          application: updateResult.Attributes,
        }),
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' }),
    }
  } catch (error) {
    console.error('Error in partner application:', error)
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