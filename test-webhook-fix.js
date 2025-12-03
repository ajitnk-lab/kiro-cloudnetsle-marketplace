const https = require('https');

// Test webhook payload - simulating a successful UPI payment
const testPayload = {
  data: {
    order: {
      order_id: "CF_1764241164066_r5gfhovw5", // Existing transaction
      order_amount: 299.00,
      order_currency: "INR"
    },
    payment: {
      cf_payment_id: "4628437105",
      payment_status: "SUCCESS",
      payment_amount: 299.00,
      payment_currency: "INR",
      payment_message: "00::Transaction Success",
      payment_time: "2025-11-28T17:20:00+05:30",
      bank_reference: "018045263393",
      payment_method: {
        upi: {
          channel: null,
          upi_id: "test@okhdfcbank"
        }
      },
      payment_group: "upi"
    },
    customer_details: {
      customer_name: null,
      customer_id: "d9f9597e-5061-706d-8bbd-bb3630555b98",
      customer_email: "user@example.com",
      customer_phone: "9999999999"
    },
    payment_gateway_details: {
      gateway_name: "CASHFREE",
      gateway_settlement: "CASHFREE"
    },
    event_time: "2025-11-28T17:20:00+05:30",
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
    'Content-Length': Buffer.byteLength(postData),
    'x-webhook-signature': 'test-signature',
    'x-webhook-timestamp': Date.now().toString(),
    'x-webhook-version': '2025-01-01'
  }
};

console.log('🧪 Testing fixed Cashfree webhook...');
console.log('📤 Sending test webhook for existing transaction:', testPayload.data.order.order_id);

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 Response Body:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: Webhook returned HTTP 200 - Fix is working!');
      console.log('🎯 Expected behavior: Should acknowledge already processed transaction');
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
