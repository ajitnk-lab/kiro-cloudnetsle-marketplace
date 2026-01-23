const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { SESClient, VerifyEmailIdentityCommand } = require('@aws-sdk/client-ses')
const crypto = require('crypto')
const { getCountryFromRequest } = require('./geo-utils')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const sesClient = new SESClient({})

// Generate permanent token for user-solution combination
const generatePermanentToken = (userEmail, solutionId) => {
  const hash = crypto.createHash('sha256')
  hash.update(`${userEmail}:${solutionId}:${process.env.TOKEN_SECRET || 'default-secret'}`)
  return 'tok_perm_' + hash.digest('hex').substring(0, 32)
}

exports.handler = async (event) => {
  console.log('Post-confirmation trigger:', JSON.stringify(event, null, 2))
  
  try {
    const { userAttributes } = event.request
    const userName = event.userName
    const userEmail = userAttributes.email
    
    // Get country from request headers/IP
    const country = getCountryFromRequest(event)
    
    console.log('Creating user profile for:', userName, 'with email:', userEmail, 'country:', country)
    
    const userProfile = {
      userId: userName,
      email: userEmail,
      emailVerified: true,
      role: userAttributes['custom:role'] || 'customer',
      country: country, // Add country field
      profile: {
        name: `${userAttributes.given_name || ''} ${userAttributes.family_name || ''}`.trim(),
        email: userEmail,
        company: userAttributes['custom:company'] || '',
        country: country // Also add to profile object
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await docClient.send(new PutCommand({
      TableName: process.env.USER_TABLE_NAME,
      Item: userProfile
    }))

    console.log('User profile created:', userProfile)

    // Auto-register email with SES sandbox for invoice delivery
    try {
      await sesClient.send(new VerifyEmailIdentityCommand({ EmailAddress: userEmail }))
      console.log(`✅ SES verification email sent to: ${userEmail}`)
    } catch (sesError) {
      console.error('SES verification failed (non-blocking):', sesError)
    }

    // Create entitlement for aws-solution-finder-001 for all new users
    if (process.env.USER_SOLUTION_ENTITLEMENTS_TABLE) {
      try {
        const solutionId = 'aws-solution-finder-001'
        const token = generatePermanentToken(userEmail, solutionId)
        const pk = `user#${userProfile.userId}`
        const sk = `solution#${solutionId}`
        
        const entitlement = {
          pk,
          sk,
          userId: userProfile.userId,
          solutionId,
          token,
          tier: 'registered',
          accessTier: 'registered', // Add this field for validation
          dailyLimit: 10, // Add daily limit for registered users
          dailyUsage: 0,
          lastUsageDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        await docClient.send(new PutCommand({
          TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
          Item: entitlement,
        }))

        console.log(`Created entitlement for ${userEmail}:${solutionId} with token ${token}`)
        
        // Record initial subscription in history
        if (process.env.SUBSCRIPTION_HISTORY_TABLE) {
          await docClient.send(new PutCommand({
            TableName: process.env.SUBSCRIPTION_HISTORY_TABLE,
            Item: {
              userId: userProfile.userId,
              timestamp: new Date().toISOString(),
              userEmail,
              solutionId,
              action: 'signup',
              fromTier: 'none',
              toTier: 'registered',
              startDate: new Date().toISOString(),
              endDate: null, // No expiry for registered tier
              recordedAt: new Date().toISOString()
            }
          }))
          console.log(`Recorded signup history for ${userEmail}`)
        }
      } catch (error) {
        console.error('Error creating solution entitlement:', error)
        // Don't fail the registration if entitlement creation fails
      }
    }

    return event
  } catch (error) {
    console.error('Error in post-confirmation:', error)
    return event
  }
}
