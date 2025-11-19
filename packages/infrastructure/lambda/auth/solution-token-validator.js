const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
    console.log('Solution Token Validator Event:', JSON.stringify(event, null, 2));
    
    try {
        const { token, action, solution_id, check_only } = JSON.parse(event.body);
        
        if (!token || !solution_id) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Token and solution_id are required',
                    solution_id: solution_id || 'unknown'
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
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid token',
                    solution_id: solution_id
                })
            };
        }

        const entitlement = tokenResult.Items[0];
        
        // Verify solution_id matches (handle both field naming conventions)
        const entitlementSolutionId = entitlement.solutionId || entitlement.solution_id;
        if (entitlementSolutionId !== solution_id) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Token not valid for this solution',
                    solution_id: solution_id
                })
            };
        }

        // Get user details from USER_TABLE
        const userResult = await docClient.send(new QueryCommand({
            TableName: process.env.USER_TABLE,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': entitlement.userId
            }
        }));

        if (!userResult.Items || userResult.Items.length === 0) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'User not found',
                    solution_id: solution_id
                })
            };
        }

        const user = userResult.Items[0];
        const userTier = user.awsFinderTier || entitlement.tier || 'registered';
        
        // For pro users, return unlimited access
        if (userTier === 'pro') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    allowed: true,
                    user_email: user.email,
                    access_tier: 'pro',
                    quota_remaining: -1, // Unlimited
                    user: {
                        email: user.email,
                        tier: userTier
                    }
                })
            };
        }

        // For registered users, check daily limits
        const today = new Date().toISOString().split('T')[0];
        const dailyLimit = 10;
        
        // Check if we should increment usage (not a check_only request)
        if (!check_only && action === 'search') {
            // Update daily usage
            const updateResult = await docClient.send(new UpdateCommand({
                TableName: process.env.USER_SOLUTION_ENTITLEMENTS_TABLE,
                Key: { pk: entitlement.pk, sk: entitlement.sk },
                UpdateExpression: 'SET dailyUsage = if_not_exists(dailyUsage, :zero) + :inc, lastUsageDate = :today',
                ExpressionAttributeValues: {
                    ':inc': 1,
                    ':zero': 0,
                    ':today': today
                },
                ReturnValues: 'ALL_NEW'
            }));
            
            const newUsage = updateResult.Attributes.dailyUsage;
            const quotaRemaining = Math.max(0, dailyLimit - newUsage);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    allowed: newUsage <= dailyLimit,
                    user_email: user.email,
                    access_tier: userTier,
                    quota_remaining: quotaRemaining,
                    user: {
                        email: user.email,
                        tier: userTier
                    }
                })
            };
        } else {
            // Just check current usage without incrementing
            const currentUsage = entitlement.dailyUsage || 0;
            const quotaRemaining = Math.max(0, dailyLimit - currentUsage);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    allowed: currentUsage < dailyLimit,
                    user_email: user.email,
                    access_tier: userTier,
                    quota_remaining: quotaRemaining,
                    user: {
                        email: user.email,
                        tier: userTier
                    }
                })
            };
        }

    } catch (error) {
        console.error('Solution token validation error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                solution_id: 'unknown'
            })
        };
    }
};
