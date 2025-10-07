const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient({});

// Admin user configuration
const ADMIN_CONFIG = {
  email: 'ajitnk2006+admin@gmail.com',
  password: 'Admin123!@#',  // Change this to a secure password
  name: 'System Administrator',
  role: 'admin'
};

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');
    
    const userId = uuidv4();
    const userPoolId = process.env.USER_POOL_ID;
    const userTableName = process.env.USER_TABLE_NAME;
    
    if (!userPoolId || !userTableName) {
      throw new Error('Missing required environment variables: USER_POOL_ID, USER_TABLE_NAME');
    }

    // 1. Create user in Cognito User Pool
    console.log('📝 Creating Cognito user...');
    
    try {
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: ADMIN_CONFIG.email,
        UserAttributes: [
          {
            Name: 'email',
            Value: ADMIN_CONFIG.email
          },
          {
            Name: 'email_verified',
            Value: 'true'
          },
          {
            Name: 'custom:role',
            Value: ADMIN_CONFIG.role
          }
        ],
        MessageAction: 'SUPPRESS', // Don't send welcome email
        TemporaryPassword: ADMIN_CONFIG.password
      }));
      
      console.log('✅ Cognito user created');
    } catch (error) {
      if (error.name === 'UsernameExistsException') {
        console.log('⚠️  Cognito user already exists, continuing...');
      } else {
        throw error;
      }
    }

    // 2. Set permanent password
    console.log('🔑 Setting permanent password...');
    
    try {
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: ADMIN_CONFIG.email,
        Password: ADMIN_CONFIG.password,
        Permanent: true
      }));
      
      console.log('✅ Password set');
    } catch (error) {
      if (error.name === 'InvalidPasswordException') {
        console.log('⚠️  Password already set, continuing...');
      } else {
        throw error;
      }
    }

    // 3. Create user record in DynamoDB
    console.log('💾 Creating DynamoDB user record...');
    
    const userRecord = {
      userId: userId,
      email: ADMIN_CONFIG.email,
      role: ADMIN_CONFIG.role,
      profile: {
        name: ADMIN_CONFIG.name,
        email: ADMIN_CONFIG.email
      },
      status: 'active',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
      permissions: [
        'admin:read',
        'admin:write',
        'admin:delete',
        'users:manage',
        'partners:manage',
        'solutions:moderate',
        'platform:configure'
      ]
    };

    await docClient.send(new PutCommand({
      TableName: userTableName,
      Item: userRecord,
      ConditionExpression: 'attribute_not_exists(userId)' // Only create if doesn't exist
    }));

    console.log('✅ DynamoDB user record created');

    console.log('\n🎉 Admin user created successfully!');
    console.log('\n📋 Admin Login Credentials:');
    console.log(`   Email: ${ADMIN_CONFIG.email}`);
    console.log(`   Password: ${ADMIN_CONFIG.password}`);
    console.log(`   Role: ${ADMIN_CONFIG.role}`);
    console.log('\n🔗 Admin Dashboard URL:');
    console.log('   https://dddzq9ul1ygr3.cloudfront.net/admin/dashboard');
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log('⚠️  Admin user already exists in DynamoDB');
      console.log('\n📋 Existing Admin Credentials:');
      console.log(`   Email: ${ADMIN_CONFIG.email}`);
      console.log(`   Password: ${ADMIN_CONFIG.password}`);
      console.log(`   Role: ${ADMIN_CONFIG.role}`);
    } else {
      console.error('❌ Error creating admin user:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('\n✅ Admin user setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to create admin user:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser, ADMIN_CONFIG };