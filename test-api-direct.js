const axios = require('axios');

const config = {
    apiGatewayUrl: 'https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod',
    frontendUrl: 'http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com'
};

async function testEndpoint(method, endpoint, headers = {}) {
    try {
        const response = await axios({
            method,
            url: `${config.apiGatewayUrl}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'Origin': config.frontendUrl,
                ...headers
            }
        });
        
        console.log(`✅ ${method} ${endpoint}: ${response.status}`);
        
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
        
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        if (status === 401) {
            console.log(`✅ ${method} ${endpoint}: 401 Unauthorized (expected without auth)`);
        } else {
            console.error(`❌ ${method} ${endpoint}: ${status} - ${message}`);
        }
        
        return { success: false, status, error: message };
    }
}

async function testCORS() {
    console.log('\n🌐 Testing CORS Configuration...');
    
    const corsHeaders = {
        'Origin': config.frontendUrl,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type'
    };
    
    const endpoints = ['/admin/solutions', '/admin/applications', '/admin/users', '/catalog'];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.options(`${config.apiGatewayUrl}${endpoint}`, {
                headers: corsHeaders
            });
            
            console.log(`✅ CORS ${endpoint}: ${response.status}`);
            console.log(`   Allow-Origin: ${response.headers['access-control-allow-origin']}`);
            console.log(`   Allow-Methods: ${response.headers['access-control-allow-methods']}`);
            console.log(`   Allow-Headers: ${response.headers['access-control-allow-headers']}`);
        } catch (error) {
            console.error(`❌ CORS ${endpoint}: ${error.response?.status || error.message}`);
        }
    }
}

async function runDirectAPITest() {
    console.log('🚀 Testing API Endpoints Directly\n');
    
    // Test public endpoints
    console.log('📖 Testing Public Endpoints...');
    await testEndpoint('GET', '/catalog');
    
    // Test admin endpoints without auth (should return 401)
    console.log('\n🔒 Testing Admin Endpoints (without auth)...');
    await testEndpoint('GET', '/admin/solutions');
    await testEndpoint('GET', '/admin/applications');
    await testEndpoint('GET', '/admin/users');
    
    // Test CORS
    await testCORS();
    
    console.log('\n📋 Next Steps:');
    console.log('1. Visit frontend: ' + config.frontendUrl);
    console.log('2. Login with: ajitnk2006+admin@gmail.com / AdminPass123!');
    console.log('3. Check browser network tab for API calls');
    console.log('4. Verify admin dashboard loads solutions');
    
    console.log('\n🔍 If admin dashboard is empty:');
    console.log('- Check browser console for errors');
    console.log('- Verify network requests show 200 responses');
    console.log('- Check if ID token is being sent in Authorization header');
}

runDirectAPITest().catch(console.error);
