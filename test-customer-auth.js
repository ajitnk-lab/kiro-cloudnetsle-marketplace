const AWS = require('aws-sdk');
const axios = require('axios');

AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

async function testCustomerAuth() {
    console.log('Testing customer authentication...');
    
    try {
        const result = await cognito.adminInitiateAuth({
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            UserPoolId: 'us-east-1_5EpprbR5R',
            ClientId: '58u72aor8kf4f93pf93pdnqecu',
            AuthParameters: {
                USERNAME: 'ajitnk2006+customer001@gmail.com',
                PASSWORD: 'TestPass123!'
            }
        }).promise();
        
        const idToken = result.AuthenticationResult.IdToken;
        const accessToken = result.AuthenticationResult.AccessToken;
        
        console.log('✅ Customer authentication successful');
        
        // Test catalog API (should work for customers)
        const catalogResponse = await axios.get('https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/catalog', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ Catalog API with access token: ${catalogResponse.status}`);
        console.log(`   Found ${catalogResponse.data.solutions?.length || 0} solutions`);
        
        // Test admin API (should fail for customer)
        try {
            const adminResponse = await axios.get('https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/admin/solutions', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`⚠️  Admin API with customer ID token: ${adminResponse.status} (should fail)`);
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('✅ Admin API correctly rejected customer: 403 Forbidden');
            } else {
                console.log(`❌ Admin API unexpected response: ${error.response?.status}`);
            }
        }
        
        return { idToken, accessToken };
        
    } catch (error) {
        console.error('❌ Customer authentication failed:', error.message);
        return null;
    }
}

testCustomerAuth();
