const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async (event) => {
    console.log('Validate Token Event:', JSON.stringify(event, null, 2));
    
    try {
        const { token, userId } = JSON.parse(event.body);
        
        if (!token) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: JSON.stringify({
                    error: 'token is required'
                })
            };
        }

        // Query token from User-Solution Entitlements table using TokenIndex
        const tokenResult = await docClient.send(new QueryCommand({
            TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
            IndexName: 'TokenIndex',
            KeyConditionExpression: '#token = :token',
            ExpressionAttributeNames: {
                '#token': 'token'
            },
            ExpressionAttributeValues: {
                ':token': token
            }
        }));

        if (!tokenResult.Items || tokenResult.Items.length === 0) {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: JSON.stringify({
                    valid: false,
                    error: 'Invalid token'
                })
            };
        }

        const entitlement = tokenResult.Items[0];

        // Validate userId if provided
        if (userId && entitlement.user_email !== userId) {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: JSON.stringify({
                    valid: false,
                    error: 'Token does not match user'
                })
            };
        }

        // Check if entitlement is active
        if (entitlement.status !== 'active') {
            return {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: JSON.stringify({
                    valid: false,
                    error: 'Token is not active'
                })
            };
        }

        // Return validation success with usage info
        const usageRemaining = entitlement.access_tier === 'pro' ? 'unlimited' : 10;

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify({
                valid: true,
                userId: entitlement.user_email,
                solutionId: entitlement.solution_id,
                tier: entitlement.access_tier,
                usage_remaining: usageRemaining,
                token: token
            })
        };

    } catch (error) {
        console.error('Error validating token:', error);
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
