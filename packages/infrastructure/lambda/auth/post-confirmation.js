const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

exports.handler = async (event) => {
  console.log('Post confirmation trigger:', JSON.stringify(event, null, 2))
  
  try {
    const { userAttributes, userName } = event.request
    
    // Create user profile in DynamoDB after Cognito confirmation
    const userProfile = {
      userId: userName,
      email: userAttributes.email,
      role: userAttributes['custom:role'] || 'customer',
      profile: {
        name: `${userAttributes.given_name || ''} ${userAttributes.family_name || ''}`.trim(),
        company: userAttributes['custom:company'] || '',
      },
      partnerStatus: userAttributes['custom:partnerStatus'] || 'none',
      marketplaceStatus: userAttributes['custom:marketplaceStatus'] || (userAttributes['custom:role'] === 'partner' ? 'pending' : 'none'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    }

    await docClient.send(new PutCommand({
      TableName: process.env.USER_TABLE_NAME,
      Item: userProfile,
    }))

    console.log('User profile created successfully:', userProfile)
    return event
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error)
    throw error
  }
}
