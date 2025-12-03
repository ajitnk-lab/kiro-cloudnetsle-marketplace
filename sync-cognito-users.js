#!/usr/bin/env node

const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

// Configuration
const REGION = 'us-east-1';
const MEMBER_PROFILE = 'member-account';
const USER_POOL_ID = 'us-east-1_p1hItqB3S'; // From stack output
const TABLE_NAME = 'marketplace-users-1764183053';

// Create clients
const dynamoClient = new DynamoDBClient({ 
  region: REGION
});

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: REGION
});

async function getAllUsers() {
  const users = [];
  let lastEvaluatedKey = undefined;
  
  do {
    const params = {
      TableName: TABLE_NAME,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
    };
    
    const result = await dynamoClient.send(new ScanCommand(params));
    const items = result.Items.map(item => unmarshall(item));
    users.push(...items);
    lastEvaluatedKey = result.LastEvaluatedKey;
    
    console.log(`Scanned ${items.length} users, total: ${users.length}`);
  } while (lastEvaluatedKey);
  
  return users;
}

async function createCognitoUser(user) {
  const { email, role, profile, userId } = user;
  
  try {
    // Create user in Cognito
    const createParams = {
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:role', Value: role },
        { Name: 'name', Value: profile?.name || 'User' }
      ],
      MessageAction: 'SUPPRESS', // Don't send welcome email
      TemporaryPassword: 'TempPass123!', // They'll need to reset
      ForceAliasCreation: false
    };

    // Add company for partners
    if (role === 'partner' && profile?.company) {
      createParams.UserAttributes.push({
        Name: 'custom:company',
        Value: profile.company
      });
    }

    await cognitoClient.send(new AdminCreateUserCommand(createParams));
    console.log(`✅ Created Cognito user: ${email} (${role})`);
    
    return true;
  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      console.log(`⚠️  User already exists: ${email}`);
      return false;
    } else {
      console.error(`❌ Failed to create user ${email}:`, error.message);
      return false;
    }
  }
}

async function main() {
  console.log('🚀 Starting Cognito user sync...');
  console.log(`📊 Syncing users from ${TABLE_NAME} to Cognito pool ${USER_POOL_ID}`);
  
  try {
    // Get all users from DynamoDB
    const users = await getAllUsers();
    console.log(`\n📋 Found ${users.length} users in DynamoDB`);
    
    // Group users by role
    const usersByRole = users.reduce((acc, user) => {
      const role = user.role || 'customer';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('👥 User breakdown by role:');
    Object.entries(usersByRole).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} users`);
    });
    
    // Create Cognito users
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    console.log('\n🔄 Creating Cognito users...');
    
    for (const user of users) {
      if (!user.email) {
        console.log(`⚠️  Skipping user without email: ${user.userId}`);
        skipped++;
        continue;
      }
      
      const result = await createCognitoUser(user);
      if (result === true) {
        created++;
      } else if (result === false) {
        skipped++;
      } else {
        failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n✅ Cognito user sync completed!');
    console.log(`📊 Results:`);
    console.log(`   Created: ${created} users`);
    console.log(`   Skipped: ${skipped} users`);
    console.log(`   Failed: ${failed} users`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run sync
main().catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
