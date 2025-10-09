const AWS = require('aws-sdk');
const axios = require('axios');

// Configuration
const config = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_5EpprbR5R',
    clientId: '58u72aor8kf4f93pf93pdnqecu',
    apiGatewayUrl: 'https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod',
    adminEmail: 'ajitnk2006+admin@gmail.com',
    adminPassword: 'AdminPass123!',
    stackName: 'MP-1759859484941'
};

AWS.config.update({ region: config.region });
const cognito = new AWS.CognitoIdentityServiceProvider();

let idToken = null;
let accessToken = null;

async function getStackOutputs() {
    const cloudformation = new AWS.CloudFormation();
    try {
        const result = await cloudformation.describeStacks({
            StackName: config.stackName
        }).promise();
        
        const outputs = result.Stacks[0].Outputs;
        const userPoolId = outputs.find(o => o.OutputKey === 'UserPoolId')?.OutputValue;
        const clientId = outputs.find(o => o.OutputKey === 'UserPoolClientId')?.OutputValue;
        const apiUrl = outputs.find(o => o.OutputKey === 'ApiGatewayUrl')?.OutputValue;
        
        console.log('✅ Stack outputs verified:');
        console.log(`   UserPoolId: ${userPoolId}`);
        console.log(`   ClientId: ${clientId}`);
        console.log(`   API URL: ${apiUrl}`);
        
        return { userPoolId, clientId, apiUrl };
    } catch (error) {
        console.error('❌ Failed to get stack outputs:', error.message);
        throw error;
    }
}

async function testCognitoAdminAuth() {
    console.log('\n🔐 Testing Cognito Admin Authentication...');
    
    try {
        const params = {
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            UserPoolId: config.userPoolId,
            ClientId: config.clientId,
            AuthParameters: {
                USERNAME: config.adminEmail,
                PASSWORD: config.adminPassword
            }
        };
        
        const result = await cognito.adminInitiateAuth(params).promise();
        
        if (result.AuthenticationResult) {
            idToken = result.AuthenticationResult.IdToken;
            accessToken = result.AuthenticationResult.AccessToken;
            
            console.log('✅ Admin authentication successful');
            console.log(`   ID Token: ${idToken.substring(0, 50)}...`);
            console.log(`   Access Token: ${accessToken.substring(0, 50)}...`);
            
            // Decode and verify admin role
            const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
            console.log(`   User: ${payload.email}`);
            console.log(`   Role: ${payload['custom:role']}`);
            
            if (payload['custom:role'] !== 'admin') {
                throw new Error('User does not have admin role');
            }
            
            return true;
        } else {
            throw new Error('No authentication result');
        }
    } catch (error) {
        console.error('❌ Cognito authentication failed:', error.message);
        return false;
    }
}

async function testApiEndpoint(method, endpoint, data = null, useIdToken = true) {
    const token = useIdToken ? idToken : accessToken;
    const tokenType = useIdToken ? 'ID' : 'Access';
    
    try {
        const config = {
            method,
            url: `${config.apiGatewayUrl}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        console.log(`✅ ${method} ${endpoint} (${tokenType} token): ${response.status}`);
        
        if (response.data) {
            if (Array.isArray(response.data)) {
                console.log(`   Response: Array with ${response.data.length} items`);
            } else {
                console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
            }
        }
        
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        console.error(`❌ ${method} ${endpoint} (${tokenType} token): ${error.response?.status || error.message}`);
        if (error.response?.data) {
            console.error(`   Error: ${JSON.stringify(error.response.data)}`);
        }
        return { success: false, error: error.message, status: error.response?.status };
    }
}

async function testAllAdminEndpoints() {
    console.log('\n🔗 Testing Admin API Endpoints...');
    
    const endpoints = [
        { method: 'GET', path: '/admin/solutions', desc: 'Get all solutions' },
        { method: 'GET', path: '/admin/applications', desc: 'Get partner applications' },
        { method: 'GET', path: '/admin/users', desc: 'Get all users' },
        { method: 'POST', path: '/admin/solutions/approve', desc: 'Approve solution', data: { solutionId: 'test-id' } },
        { method: 'POST', path: '/admin/applications/approve', desc: 'Approve application', data: { applicationId: 'test-id' } }
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
        console.log(`\nTesting: ${endpoint.desc}`);
        
        // Test with ID token (should work)
        const idResult = await testApiEndpoint(endpoint.method, endpoint.path, endpoint.data, true);
        results.push({ ...endpoint, idToken: idResult });
        
        // Test with Access token (should fail for API Gateway Cognito authorizer)
        const accessResult = await testApiEndpoint(endpoint.method, endpoint.path, endpoint.data, false);
        results.push({ ...endpoint, accessToken: accessResult });
    }
    
    return results;
}

async function testDynamoDBTables() {
    console.log('\n🗄️ Testing DynamoDB Table Access...');
    
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const tables = [
        'marketplace-solutions-1759859485186',
        'marketplace-users-1759859485186'
    ];
    
    for (const tableName of tables) {
        try {
            const result = await dynamodb.scan({
                TableName: tableName,
                Limit: 1
            }).promise();
            
            console.log(`✅ Table ${tableName}: Accessible (${result.Count} items scanned)`);
        } catch (error) {
            console.error(`❌ Table ${tableName}: ${error.message}`);
        }
    }
}

async function testLambdaFunction() {
    console.log('\n⚡ Testing Lambda Function Direct Invocation...');
    
    const lambda = new AWS.Lambda();
    const functionName = 'MP-1759859484941-ApiStackAdminFunctionBC1359F9-FxRfDSoR42l7';
    
    try {
        const payload = {
            httpMethod: 'GET',
            path: '/admin/solutions',
            headers: {
                Authorization: `Bearer ${idToken}`
            },
            requestContext: {
                authorizer: {
                    claims: JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString())
                }
            }
        };
        
        const result = await lambda.invoke({
            FunctionName: functionName,
            Payload: JSON.stringify(payload)
        }).promise();
        
        const response = JSON.parse(result.Payload);
        console.log(`✅ Lambda direct invocation: ${response.statusCode}`);
        
        if (response.body) {
            const body = JSON.parse(response.body);
            console.log(`   Response: ${JSON.stringify(body).substring(0, 100)}...`);
        }
    } catch (error) {
        console.error(`❌ Lambda direct invocation failed: ${error.message}`);
    }
}

async function testCORSHeaders() {
    console.log('\n🌐 Testing CORS Headers...');
    
    try {
        const response = await axios.options(`${config.apiGatewayUrl}/admin/solutions`, {
            headers: {
                'Origin': 'http://localhost:5173',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'authorization,content-type'
            }
        });
        
        console.log('✅ CORS preflight successful');
        console.log(`   Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin']}`);
        console.log(`   Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods']}`);
        console.log(`   Access-Control-Allow-Headers: ${response.headers['access-control-allow-headers']}`);
    } catch (error) {
        console.error(`❌ CORS preflight failed: ${error.message}`);
    }
}

async function runCompleteTest() {
    console.log('🚀 Starting Complete Admin Functionality Test\n');
    console.log('='.repeat(60));
    
    try {
        // Step 1: Get stack configuration
        await getStackOutputs();
        
        // Step 2: Test Cognito authentication
        const authSuccess = await testCognitoAdminAuth();
        if (!authSuccess) {
            console.log('\n❌ Authentication failed - stopping tests');
            return;
        }
        
        // Step 3: Test DynamoDB access
        await testDynamoDBTables();
        
        // Step 4: Test Lambda function directly
        await testLambdaFunction();
        
        // Step 5: Test CORS
        await testCORSHeaders();
        
        // Step 6: Test all API endpoints
        const endpointResults = await testAllAdminEndpoints();
        
        // Summary
        console.log('\n📊 TEST SUMMARY');
        console.log('='.repeat(60));
        
        const idTokenSuccess = endpointResults.filter(r => r.idToken?.success).length;
        const idTokenTotal = endpointResults.filter(r => r.idToken).length;
        const accessTokenSuccess = endpointResults.filter(r => r.accessToken?.success).length;
        const accessTokenTotal = endpointResults.filter(r => r.accessToken).length;
        
        console.log(`ID Token Endpoints: ${idTokenSuccess}/${idTokenTotal} successful`);
        console.log(`Access Token Endpoints: ${accessTokenSuccess}/${accessTokenTotal} successful`);
        
        if (idTokenSuccess === idTokenTotal) {
            console.log('\n✅ ALL ADMIN FUNCTIONALITY WORKING CORRECTLY');
        } else {
            console.log('\n❌ SOME ADMIN ENDPOINTS STILL FAILING');
        }
        
    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
    }
}

// Run the complete test
runCompleteTest().catch(console.error);
