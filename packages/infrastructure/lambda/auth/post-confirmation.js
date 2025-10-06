const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

exports.handler = async (event) => {
  console.log('Post confirmation trigger called:', JSON.stringify(event, null, 2))
  
  try {
    // This function is triggered automatically by Cognito after user confirmation
    const { userAttributes, userName } = event.request
    
    // Extract user information from Cognito attributes
    const email = userAttributes.email
    const givenName = userAttributes.given_name || ''
    const familyName = userAttributes.family_name || ''
    const role = userAttributes['custom:role'] || 'customer'
    const company = userAttributes['custom:company'] || ''
    
    // Create user profile in DynamoDB
    const userProfile = {
      userId: userName, // This is the Cognito user ID
      email,
      role,
      profile: {
        name: `${givenName} ${familyName}`.trim() || email.split('@')[0],
        company,
        givenName,
        familyName,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      cognitoStatus: 'confirmed',
    }

    console.log('Creating user profile:', userProfile)

    await docClient.send(new PutCommand({
      TableName: process.env.USER_TABLE_NAME,
      Item: userProfile,
      // Prevent overwriting existing profiles
      ConditionExpression: 'attribute_not_exists(userId)',
    }))

    console.log('User profile created successfully')
    
    // Return the event unchanged (required for Cognito triggers)
    return event
  } catch (error) {
    console.error('Error in post confirmation trigger:', error)
    
    // For Cognito triggers, we should not throw errors unless we want to prevent the operation
    // Log the error but allow the user confirmation to proceed
    if (error.name === 'ConditionalCheckFailedException') {
      console.log('User profile already exists, skipping creation')
      return event
    }
    
    // For other errors, we might want to fail the confirmation
    throw error
  }
}