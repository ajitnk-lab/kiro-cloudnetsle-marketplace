const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

function generateApiKey() {
  return 'aws_finder_' + crypto.randomBytes(32).toString('hex');
}

async function generateApiKeysForCustomers() {
  const userTableName = 'MP-1759859484941-DataStackUserTableDAF10CB8-32RMTH8QZDCX';
  
  try {
    // Scan for all customer users
    const result = await dynamodb.scan({
      TableName: userTableName,
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: {
        '#role': 'role'
      },
      ExpressionAttributeValues: {
        ':role': 'customer'
      }
    }).promise();

    console.log(`Found ${result.Items.length} customer users`);

    // Generate API keys for each customer
    for (const user of result.Items) {
      if (!user.awsFinderApiKey) {
        const apiKey = generateApiKey();
        
        await dynamodb.update({
          TableName: userTableName,
          Key: { userId: user.userId },
          UpdateExpression: 'SET awsFinderApiKey = :apiKey, awsFinderTier = :tier, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':apiKey': apiKey,
            ':tier': 'free', // Default to free tier (10 searches/day)
            ':updatedAt': new Date().toISOString()
          }
        }).promise();

        console.log(`✅ Generated API key for customer: ${user.email} (${user.userId})`);
        console.log(`   API Key: ${apiKey}`);
        console.log(`   Tier: free (10 searches/day)`);
      } else {
        console.log(`⏭️  Customer ${user.email} already has API key`);
      }
    }

    console.log('\n🎉 API key generation completed!');
    return result.Items.length;
  } catch (error) {
    console.error('❌ Error generating API keys:', error);
    throw error;
  }
}

async function createTestCustomer() {
  const userTableName = 'MP-1759859484941-DataStackUserTableDAF10CB8-32RMTH8QZDCX';
  const testUserId = 'test-customer-' + Date.now();
  const apiKey = generateApiKey();
  
  const testUser = {
    userId: testUserId,
    email: 'test.customer@example.com',
    role: 'customer',
    profile: {
      name: 'Test Customer',
      company: 'Test Company'
    },
    status: 'active',
    awsFinderApiKey: apiKey,
    awsFinderTier: 'free',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await dynamodb.put({
      TableName: userTableName,
      Item: testUser
    }).promise();

    console.log('✅ Test customer created successfully!');
    console.log('User ID:', testUserId);
    console.log('Email:', testUser.email);
    console.log('API Key:', apiKey);
    console.log('Tier: free (10 searches/day)');
    console.log('\nTest URL:');
    console.log(`https://awssolutionfinder.solutions.cloudnestle.com/search?apikey=${apiKey}`);
    
    return testUser;
  } catch (error) {
    console.error('❌ Error creating test customer:', error);
    throw error;
  }
}

// Run based on command line argument
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'test') {
    createTestCustomer()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    generateApiKeysForCustomers()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { generateApiKeysForCustomers, createTestCustomer };
