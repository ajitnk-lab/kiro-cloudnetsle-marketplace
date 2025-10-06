const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

// Instamojo configuration
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY;
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;
const INSTAMOJO_ENDPOINT = process.env.INSTAMOJO_ENDPOINT || 'https://test.instamojo.com/api/1.1/';

exports.createPaymentRequest = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const { solutionId, userId, amount, currency = 'INR', purpose } = JSON.parse(event.body);

    // Validate required fields
    if (!solutionId || !userId || !amount || !purpose) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: solutionId, userId, amount, purpose'
        })
      };
    }

    // Get solution details
    const solutionResult = await dynamodb.get({
      TableName: process.env.SOLUTIONS_TABLE,
      Key: { solutionId }
    }).promise();

    if (!solutionResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Solution not found' })
      };
    }

    const solution = solutionResult.Item;

    // Get user details
    const userResult = await dynamodb.get({
      TableName: process.env.USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!userResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = userResult.Item;

    // Generate unique transaction ID
    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Create payment request with Instamojo
    const paymentData = {
      purpose: purpose,
      amount: amount,
      phone: user.phone || '9999999999',
      buyer_name: user.name || user.email,
      redirect_url: `${process.env.FRONTEND_URL}/payment/success`,
      send_email: true,
      webhook: `${process.env.API_GATEWAY_URL}/payments/webhook`,
      send_sms: false,
      email: user.email,
      allow_repeated_payments: false
    };

    // Make request to Instamojo API
    const response = await fetch(`${INSTAMOJO_ENDPOINT}payment-requests/`, {
      method: 'POST',
      headers: {
        'X-Api-Key': INSTAMOJO_API_KEY,
        'X-Auth-Token': INSTAMOJO_AUTH_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(paymentData)
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Instamojo API Error:', result);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Payment request creation failed',
          details: result.message
        })
      };
    }

    // Store transaction in DynamoDB
    const transaction = {
      transactionId,
      userId,
      solutionId,
      amount: parseFloat(amount),
      currency,
      status: 'pending',
      paymentRequestId: result.payment_request.id,
      paymentUrl: result.payment_request.longurl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      solutionName: solution.name,
      userEmail: user.email
    };

    await dynamodb.put({
      TableName: process.env.TRANSACTIONS_TABLE,
      Item: transaction
    }).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        transactionId,
        paymentUrl: result.payment_request.longurl,
        paymentRequestId: result.payment_request.id,
        amount,
        currency,
        solutionName: solution.name
      })
    };

  } catch (error) {
    console.error('Payment creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

exports.handleWebhook = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const webhookData = JSON.parse(event.body);
    console.log('Webhook received:', webhookData);

    const { payment_id, payment_request_id, status } = webhookData;

    if (!payment_id || !payment_request_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid webhook data' })
      };
    }

    // Find transaction by payment request ID
    const queryResult = await dynamodb.query({
      TableName: process.env.TRANSACTIONS_TABLE,
      IndexName: 'PaymentRequestIndex',
      KeyConditionExpression: 'paymentRequestId = :paymentRequestId',
      ExpressionAttributeValues: {
        ':paymentRequestId': payment_request_id
      }
    }).promise();

    if (!queryResult.Items || queryResult.Items.length === 0) {
      console.error('Transaction not found for payment request:', payment_request_id);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Transaction not found' })
      };
    }

    const transaction = queryResult.Items[0];

    // Update transaction status
    const updateParams = {
      TableName: process.env.TRANSACTIONS_TABLE,
      Key: { transactionId: transaction.transactionId },
      UpdateExpression: 'SET #status = :status, paymentId = :paymentId, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status === 'Credit' ? 'completed' : 'failed',
        ':paymentId': payment_id,
        ':updatedAt': new Date().toISOString()
      }
    };

    await dynamodb.update(updateParams).promise();

    // If payment successful, grant access to solution
    if (status === 'Credit') {
      await grantSolutionAccess(transaction.userId, transaction.solutionId);
      await sendPaymentConfirmationEmail(transaction);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Webhook processed successfully' })
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message
      })
    };
  }
};

async function grantSolutionAccess(userId, solutionId) {
  try {
    const accessRecord = {
      userId,
      solutionId,
      accessGrantedAt: new Date().toISOString(),
      accessType: 'purchased',
      status: 'active'
    };

    await dynamodb.put({
      TableName: process.env.USER_SOLUTIONS_TABLE,
      Item: accessRecord
    }).promise();

    console.log(`Access granted to user ${userId} for solution ${solutionId}`);
  } catch (error) {
    console.error('Error granting solution access:', error);
    throw error;
  }
}

async function sendPaymentConfirmationEmail(transaction) {
  try {
    const emailParams = {
      Source: process.env.FROM_EMAIL,
      Destination: {
        ToAddresses: [transaction.userEmail]
      },
      Message: {
        Subject: {
          Data: `Payment Confirmation - ${transaction.solutionName}`
        },
        Body: {
          Html: {
            Data: `
              <h2>Payment Successful!</h2>
              <p>Thank you for your purchase. Your payment has been processed successfully.</p>
              <h3>Transaction Details:</h3>
              <ul>
                <li><strong>Solution:</strong> ${transaction.solutionName}</li>
                <li><strong>Amount:</strong> ₹${transaction.amount}</li>
                <li><strong>Transaction ID:</strong> ${transaction.transactionId}</li>
                <li><strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleDateString()}</li>
              </ul>
              <p>You can now access your purchased solution from your dashboard.</p>
              <p><a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a></p>
            `
          }
        }
      }
    };

    await ses.sendEmail(emailParams).promise();
    console.log(`Confirmation email sent to ${transaction.userEmail}`);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

exports.getTransactionStatus = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const { transactionId } = event.pathParameters;

    const result = await dynamodb.get({
      TableName: process.env.TRANSACTIONS_TABLE,
      Key: { transactionId }
    }).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Transaction not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.Item)
    };

  } catch (error) {
    console.error('Error fetching transaction:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

exports.getUserTransactions = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    const { userId } = event.pathParameters;

    const result = await dynamodb.query({
      TableName: process.env.TRANSACTIONS_TABLE,
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false // Sort by createdAt descending
    }).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.Items || [])
    };

  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};