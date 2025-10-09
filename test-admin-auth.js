const AWS = require('aws-sdk');
const axios = require('axios');

const config = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_5EpprbR5R',
    clientId: '58u72aor8kf4f93pf93pdnqecu',
    apiGatewayUrl: 'https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod',
    adminEmail: 'ajitnk2006+admin@gmail.com',
    adminPassword: 'AdminPass123!'
};

AWS.config.update({ region: config.region });
const cognito = new AWS.CognitoIdentityServiceProvider();

let idToken = null;
let accessToken = null;

async function authenticateAdmin() {
    console.log('🔐 Authenticating admin user...');
    
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
        
        console.log(`   UserPool: ${config.userPoolId}`);
        console.log(`   Client: ${config.clientId}`);
        console.log(`   Email: ${config.adminEmail}`);
        
        const result = await cognito.adminInitiateAuth(params).promise();
        
        if (result.AuthenticationResult) {
            idToken = result.AuthenticationResult.IdToken;
            accessToken = result.AuthenticationResult.AccessToken;
            
            const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
            console.log(`✅ Admin authenticated: ${payload.email} (${payload['custom:role']})`);
            
            return true;
        } else {
            console.error('❌ No authentication result returned');
            return false;
        }
    } catch (error) {
        console.error(`❌ Authentication failed:`, error);
        if (error.code) console.error(`   Error code: ${error.code}`);
        if (error.message) console.error(`   Message: ${error.message}`);
        return false;
    }
}

async function testAdminEndpoint(endpoint, tokenType = 'id') {
    const token = tokenType === 'id' ? idToken : accessToken;
    
    try {
        const response = await axios.get(`${config.apiGatewayUrl}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ ${endpoint} (${tokenType} token): ${response.status}`);
        
        if (response.data) {
            if (Array.isArray(response.data)) {
                console.log(`   Found ${response.data.length} items`);
                if (response.data.length > 0) {
                    console.log(`   Sample: ${JSON.stringify(response.data[0]).substring(0, 100)}...`);
                }
            } else {
                console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
            }
        }
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error(`❌ ${endpoint} (${tokenType} token): ${error.response?.status} - ${error.response?.data?.message || error.message}`);
        return { success: false, error: error.response?.data };
    }
}

async function runAuthenticatedTest() {
    console.log('🚀 Testing Admin Authentication & API Access\n');
    
    // Step 1: Authenticate
    const authSuccess = await authenticateAdmin();
    if (!authSuccess) return;
    
    console.log('\n🔗 Testing Admin Endpoints with Authentication...');
    
    // Step 2: Test with ID token (should work)
    console.log('\n--- Testing with ID Token ---');
    await testAdminEndpoint('/admin/solutions', 'id');
    await testAdminEndpoint('/admin/applications', 'id');
    await testAdminEndpoint('/admin/users', 'id');
    
    // Step 3: Test with Access token (may fail)
    console.log('\n--- Testing with Access Token ---');
    await testAdminEndpoint('/admin/solutions', 'access');
    await testAdminEndpoint('/admin/applications', 'access');
    await testAdminEndpoint('/admin/users', 'access');
    
    // Step 4: Test CORS with auth
    console.log('\n🌐 Testing CORS with Authentication...');
    try {
        const response = await axios.get(`${config.apiGatewayUrl}/admin/solutions`, {
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Origin': 'http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com'
            }
        });
        console.log(`✅ CORS with auth: ${response.status}`);
    } catch (error) {
        console.error(`❌ CORS with auth: ${error.response?.status} - ${error.message}`);
    }
}

runAuthenticatedTest().catch(console.error);
