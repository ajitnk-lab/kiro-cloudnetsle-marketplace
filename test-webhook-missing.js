const https = require('https');

// Test webhook payload - simulating a transaction that doesn't exist
const testPayload = {
  data: {
    order: {
      order_id: "CF_NONEXISTENT_12345", // Non-existent transaction
      order_amount: 299.00,
      order_currency: "INR"
    },
    payment: {
      payment_status: "SUCCESS",
      payment_amount: 299.00,
      payment_currency: "INR"
    },
    type: "PAYMENT_SUCCESS_WEBHOOK"
  }
};

const postData = JSON.stringify(testPayload);

const options = {
  hostname: 'x3toyrmnn0.execute-api.us-west-1.amazonaws.com',
  port: 443,
  path: '/prod/payments/cashfree-webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing webhook with non-existent transaction...');
console.log('📤 Sending test webhook for missing transaction:', testPayload.data.order.order_id);

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 Response Body:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: Webhook returned HTTP 200 for missing transaction - Fix is working!');
      console.log('🎯 Expected behavior: Should gracefully handle missing transactions');
    } else {
      console.log('❌ FAILED: Webhook did not return HTTP 200');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e);
});

req.write(postData);
req.end();
