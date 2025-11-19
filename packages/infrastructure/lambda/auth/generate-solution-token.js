const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async (event) => {
    console.log('Generate Solution Token Event:', JSON.stringify(event, null, 2));
    
    try {
        const { userId, solutionId, tier = 'registered' } = JSON.parse(event.body);
        
        if (!userId || !solutionId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: JSON.stringify({
                    error: 'userId and solutionId are required'
                })
            };
        }

        // Generate permanent token
        const token = uuidv4();
        const timestamp = Date.now(); // Use timestamp number instead of ISO string

        // Store token in Token table
        await docClient.send(new PutCommand({
            TableName: process.env.TOKEN_TABLE,
            Item: {
                tokenId: token,
                userId: userId,
                solutionId: solutionId,
                tier: tier,
                createdAt: timestamp,
                expiresAt: null, // Permanent token
                status: 'active'
            }
        }));

        // Create user-solution entitlement
        await docClient.send(new PutCommand({
            TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
            Item: {
                pk: `user#${userId}`, // Use lowercase 'user' to match existing records
                sk: `solution#${solutionId}`, // Use lowercase 'solution' to match existing records
                userId: userId,
                user_email: userId, // Assuming userId is email for now
                solution_id: solutionId,
                solutionId: solutionId,
                tier: tier,
                access_tier: tier, // Add access_tier field for compatibility
                token: token,
                created_at: new Date().toISOString(),
                createdAt: new Date().toISOString(), // Add both timestamp formats
                updated_at: new Date().toISOString(),
                updatedAt: new Date().toISOString(), // Add both timestamp formats
                status: 'active',
                usage_limit: tier === 'registered' ? 10 : (tier === 'pro' ? 'unlimited' : 3),
                dailyUsage: 0, // Add usage tracking field
                lastUsageDate: new Date().toISOString().split('T')[0] // Add last usage date (YYYY-MM-DD format)
            }
        }));

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify({
                success: true,
                token: token,
                userId: userId,
                solutionId: solutionId,
                tier: tier
            })
        };

    } catch (error) {
        console.error('Error generating solution token:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
