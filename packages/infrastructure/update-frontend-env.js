#!/usr/bin/env node

const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const fs = require('fs');
const path = require('path');

async function updateFrontendEnv() {
  try {
    const client = new CloudFormationClient({ region: 'us-east-1' });
    const stackName = 'MP-1762926799834';
    
    console.log('🔍 Extracting current resource IDs from CloudFormation...');
    
    const command = new DescribeStacksCommand({ StackName: stackName });
    const response = await client.send(command);
    
    const outputs = response.Stacks[0].Outputs;
    const getOutput = (key) => outputs.find(o => o.OutputKey === key)?.OutputValue;
    
    const apiUrl = getOutput('ApiGatewayUrl');
    const userPoolId = getOutput('UserPoolId');
    const clientId = getOutput('UserPoolClientId');
    
    console.log(`   ✅ API Gateway URL: ${apiUrl}`);
    console.log(`   ✅ User Pool ID: ${userPoolId}`);
    console.log(`   ✅ Client ID: ${clientId}`);
    
    // Update frontend .env file
    const frontendEnvPath = path.join(__dirname, '../frontend/.env');
    const envContent = `# AWS Cognito Configuration (Auto-generated from CloudFormation)
VITE_USER_POOL_ID=${userPoolId}
VITE_USER_POOL_CLIENT_ID=${clientId}

# API Configuration (Auto-generated from CloudFormation)
VITE_API_URL=${apiUrl}

# AWS Region
VITE_AWS_REGION=us-east-1

# Generated on: ${new Date().toUTCString()}
# Stack: ${stackName}
`;
    
    fs.writeFileSync(frontendEnvPath, envContent);
    console.log('   ✅ Updated frontend/.env with current resource IDs');
    
  } catch (error) {
    console.error('❌ Error updating frontend env:', error.message);
    process.exit(1);
  }
}

updateFrontendEnv();
