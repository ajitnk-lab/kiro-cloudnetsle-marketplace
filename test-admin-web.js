const axios = require('axios');

// Configuration
const config = {
    frontendUrl: 'http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com',
    apiGatewayUrl: 'https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod',
    adminEmail: 'ajitnk2006+admin@gmail.com',
    adminPassword: 'AdminPass123!'
};

async function testFrontendAccess() {
    console.log('\n🌐 Testing Frontend Access...');
    
    try {
        const response = await axios.get(config.frontendUrl);
        console.log(`✅ Frontend accessible: ${response.status}`);
        
        // Check if it contains expected content
        if (response.data.includes('Marketplace')) {
            console.log('✅ Frontend contains marketplace content');
        } else {
            console.log('⚠️  Frontend may not have loaded correctly');
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Frontend access failed: ${error.message}`);
        return false;
    }
}

async function testApiEndpoints() {
    console.log('\n🔗 Testing API Endpoints (without auth)...');
    
    const endpoints = [
        { method: 'GET', path: '/catalog', desc: 'Public catalog' },
        { method: 'OPTIONS', path: '/admin/solutions', desc: 'CORS preflight for admin' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios({
                method: endpoint.method,
                url: `${config.apiGatewayUrl}${endpoint.path}`,
                headers: {
                    'Origin': config.frontendUrl,
                    'Access-Control-Request-Method': 'GET',
                    'Access-Control-Request-Headers': 'authorization,content-type'
                }
            });
            
            console.log(`✅ ${endpoint.method} ${endpoint.path}: ${response.status}`);
            
            if (endpoint.method === 'OPTIONS') {
                console.log(`   CORS Headers:`);
                console.log(`   - Allow-Origin: ${response.headers['access-control-allow-origin']}`);
                console.log(`   - Allow-Methods: ${response.headers['access-control-allow-methods']}`);
                console.log(`   - Allow-Headers: ${response.headers['access-control-allow-headers']}`);
            }
            
        } catch (error) {
            console.error(`❌ ${endpoint.method} ${endpoint.path}: ${error.response?.status || error.message}`);
        }
    }
}

async function testAdminEndpointsWithoutAuth() {
    console.log('\n🔒 Testing Admin Endpoints (should fail without auth)...');
    
    const endpoints = [
        '/admin/solutions',
        '/admin/applications',
        '/admin/users'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${config.apiGatewayUrl}${endpoint}`);
            console.log(`⚠️  ${endpoint}: ${response.status} (should have failed)`);
        } catch (error) {
            if (error.response?.status === 401) {
                console.log(`✅ ${endpoint}: 401 Unauthorized (correct)`);
            } else {
                console.error(`❌ ${endpoint}: ${error.response?.status || error.message} (unexpected)`);
            }
        }
    }
}

async function checkDynamoDBTables() {
    console.log('\n🗄️ Checking DynamoDB Tables...');
    
    const AWS = require('aws-sdk');
    AWS.config.update({ region: 'us-east-1' });
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

async function testEnvironmentConfiguration() {
    console.log('\n⚙️  Testing Environment Configuration...');
    
    // Test if Lambda function has correct environment variables
    const AWS = require('aws-sdk');
    AWS.config.update({ region: 'us-east-1' });
    const lambda = new AWS.Lambda();
    
    try {
        const functionName = 'MP-1759859484941-ApiStackAdminFunctionBC1359F9-FxRfDSoR42l7';
        const result = await lambda.getFunctionConfiguration({
            FunctionName: functionName
        }).promise();
        
        console.log('✅ Lambda function configuration retrieved');
        console.log(`   Function: ${result.FunctionName}`);
        console.log(`   Runtime: ${result.Runtime}`);
        console.log(`   Environment Variables:`);
        
        const envVars = result.Environment?.Variables || {};
        console.log(`   - SOLUTIONS_TABLE: ${envVars.SOLUTIONS_TABLE}`);
        console.log(`   - USERS_TABLE: ${envVars.USERS_TABLE}`);
        
        // Verify correct table names
        if (envVars.SOLUTIONS_TABLE === 'marketplace-solutions-1759859485186') {
            console.log('✅ SOLUTIONS_TABLE correctly configured');
        } else {
            console.log('❌ SOLUTIONS_TABLE incorrectly configured');
        }
        
        if (envVars.USERS_TABLE === 'marketplace-users-1759859485186') {
            console.log('✅ USERS_TABLE correctly configured');
        } else {
            console.log('❌ USERS_TABLE incorrectly configured');
        }
        
    } catch (error) {
        console.error(`❌ Lambda configuration check failed: ${error.message}`);
    }
}

async function runWebTest() {
    console.log('🚀 Starting Web-Based Admin Functionality Test\n');
    console.log('='.repeat(60));
    
    try {
        // Test frontend access
        const frontendOk = await testFrontendAccess();
        
        // Test API endpoints
        await testApiEndpoints();
        
        // Test admin endpoints without auth (should fail)
        await testAdminEndpointsWithoutAuth();
        
        // Check DynamoDB tables
        await checkDynamoDBTables();
        
        // Test environment configuration
        await testEnvironmentConfiguration();
        
        // Summary
        console.log('\n📊 WEB TEST SUMMARY');
        console.log('='.repeat(60));
        
        if (frontendOk) {
            console.log('✅ Frontend deployed and accessible');
            console.log(`🌐 Test the admin login at: ${config.frontendUrl}/login`);
            console.log(`📧 Admin credentials: ${config.adminEmail} / ${config.adminPassword}`);
            console.log('\n📋 Manual Testing Steps:');
            console.log('1. Visit the frontend URL');
            console.log('2. Click "Login" and use admin credentials');
            console.log('3. Navigate to admin dashboard');
            console.log('4. Test solution management');
            console.log('5. Test user management');
            console.log('6. Verify all admin functions work');
        } else {
            console.log('❌ Frontend deployment issues detected');
        }
        
    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
    }
}

// Run the web test
runWebTest().catch(console.error);
