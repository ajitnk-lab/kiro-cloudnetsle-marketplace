const axios = require('axios');

async function testDirectCall() {
    console.log('Testing direct API call with test token...');
    
    try {
        const response = await axios.get('https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/admin/solutions', {
            headers: {
                'Authorization': 'Bearer test-admin-token',
                'Content-Type': 'application/json',
                'Origin': 'http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com'
            }
        });
        
        console.log('✅ Success:', response.status);
        console.log('Data:', response.data);
    } catch (error) {
        console.log('❌ Failed:', error.response?.status, error.response?.data);
    }
}

testDirectCall();
