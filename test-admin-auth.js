const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: 'us-east-1',
  credentials: new AWS.SharedIniFileCredentials({profile: 'member-account'})
});

const cognito = new AWS.CognitoIdentityServiceProvider();

async function testAdminAuth() {
  try {
    // Test admin login
    const authResult = await cognito.adminInitiateAuth({
      UserPoolId: 'us-east-1_p1hItqB3S',
      ClientId: '3f96bb4ivvj61katpipekoujj1',
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: 'admin@cloudnestle.com',
        PASSWORD: 'AdminPass123!'
      }
    }).promise();

    console.log('✅ Admin authentication successful');
    console.log('Access Token:', authResult.AuthenticationResult.AccessToken.substring(0, 50) + '...');
    
    // Test API call with token
    const fetch = require('node-fetch');
    const response = await fetch('https://7kzsoygrzl.execute-api.us-east-1.amazonaws.com/prod/admin/applications', {
      headers: {
        'Authorization': `Bearer ${authResult.AuthenticationResult.AccessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    const data = await response.text();
    console.log('API Response:', data.substring(0, 200));
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}

testAdminAuth();
