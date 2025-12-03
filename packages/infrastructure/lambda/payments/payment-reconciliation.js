const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PAYMENT_TRANSACTIONS_TABLE = process.env.PAYMENT_TRANSACTIONS_TABLE;
const USER_TABLE = process.env.USER_TABLE;
const USER_SOLUTION_ENTITLEMENTS_TABLE = process.env.USER_SOLUTION_ENTITLEMENTS_TABLE;

// Update user tier to Pro (same logic as webhook)
const updateUserTier = async (userId, userEmail) => {
  try {
    // Update user table
    await docClient.send(new UpdateCommand({
      TableName: USER_TABLE,
      Key: { userId },
      UpdateExpression: 'SET subscriptionTier = :tier, subscriptionStatus = :status, subscriptionStartDate = :startDate, lastPaymentDate = :paymentDate, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':tier': 'pro',
        ':status': 'active',
        ':startDate': new Date().toISOString(),
        ':paymentDate': new Date().toISOString(),
        ':updatedAt': new Date().toISOString()
      }
    }));

    // Update existing entitlement record (don't create new one)
    const pk = `user#${userEmail}`;
    const sk = `solution#aws-solution-finder-001`;

    await docClient.send(new UpdateCommand({
      TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
      Key: { pk, sk },
      UpdateExpression: 'SET access_tier = :tier, #tier = :tier, updated_at = :updatedAt, updatedAt = :updatedAt, #status = :status',
      ExpressionAttributeNames: {
        '#tier': 'tier',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':tier': 'pro',
        ':updatedAt': new Date().toISOString(),
        ':status': 'active'
      }
    }));

    console.log(`✅ Reconciled: ${userEmail} upgraded to Pro tier`);
    return true;
  } catch (error) {
    console.error(`❌ Error reconciling user ${userEmail}:`, error);
    return false;
  }
};

exports.handler = async (event) => {
  console.log('Payment Reconciliation Handler called:', JSON.stringify(event, null, 2));
  
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // Scan all completed payment transactions
    console.log('🔍 Scanning for completed payments...');
    
    const scanCommand = new ScanCommand({
      TableName: PAYMENT_TRANSACTIONS_TABLE,
      FilterExpression: '#status = :status AND #type = :type',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#type': 'type'
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
        ':type': 'pro_upgrade'
      }
    });

    const paymentResult = await docClient.send(scanCommand);
    const completedPayments = paymentResult.Items || [];
    
    console.log(`📋 Found ${completedPayments.length} completed pro upgrade payments`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const payment of completedPayments) {
      processed++;
      
      try {
        const { userId, userEmail, transactionId } = payment;
        
        if (!userId || !userEmail) {
          console.log(`⚠️ Skipping payment ${transactionId}: missing userId or userEmail`);
          continue;
        }

        // Check current entitlement status
        const pk = `user#${userEmail}`;
        const sk = `solution#aws-solution-finder-001`;
        
        const entitlementResult = await docClient.send(new GetCommand({
          TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
          Key: { pk, sk }
        }));

        const entitlement = entitlementResult.Item;
        
        if (!entitlement) {
          console.log(`⚠️ No entitlement found for ${userEmail}, skipping`);
          continue;
        }

        // Check if already pro
        if (entitlement.access_tier === 'pro' || entitlement.tier === 'pro') {
          console.log(`✅ ${userEmail} already has pro tier, skipping`);
          continue;
        }

        // Update to pro tier
        console.log(`🔄 Updating ${userEmail} from ${entitlement.access_tier} to pro...`);
        
        const success = await updateUserTier(userId, userEmail);
        if (success) {
          updated++;
        } else {
          errors++;
        }

      } catch (error) {
        console.error(`❌ Error processing payment ${payment.transactionId}:`, error);
        errors++;
      }
    }

    const summary = {
      total_payments_found: completedPayments.length,
      payments_processed: processed,
      entitlements_updated: updated,
      errors: errors,
      timestamp: new Date().toISOString()
    };

    console.log('📊 Reconciliation Summary:', summary);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment reconciliation completed',
        summary
      })
    };

  } catch (error) {
    console.error('❌ Error in payment reconciliation:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Reconciliation failed',
        message: error.message 
      })
    };
  }
};
