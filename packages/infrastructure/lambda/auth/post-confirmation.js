const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

exports.handler = async (event) => {
  console.log('Post-confirmation trigger:', JSON.stringify(event, null, 2))
  
  try {
    const { userAttributes } = event.request
    const userName = event.userName // userName is at the top level
    
    console.log('Creating user profile for:', userName, 'with email:', userAttributes.email)
    
    const userProfile = {
      userId: userName,
      email: userAttributes.email,
      emailVerified: true,
      role: userAttributes['custom:role'] || 'customer',
      profile: {
        name: `${userAttributes.given_name || ''} ${userAttributes.family_name || ''}`.trim(),
        email: userAttributes.email,
        company: userAttributes['custom:company'] || ''
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
    return event
  } catch (error) {
    console.error('Error in post-confirmation:', error)
    return event
  }
}
