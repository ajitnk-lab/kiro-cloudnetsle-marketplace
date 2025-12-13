#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const LEGACY_TABLE = 'marketplace-user-solution-entitlements-1764183053';
const PROD_TABLE = 'marketplace-user-solution-entitlements-prod';

async function migrateEntitlements() {
  console.log('🔄 Starting entitlements migration...');
  
  try {
    // Scan legacy table
    console.log(`📖 Reading data from ${LEGACY_TABLE}...`);
    const scanResult = await docClient.send(new ScanCommand({
      TableName: LEGACY_TABLE
    }));
    
    console.log(`📊 Found ${scanResult.Items.length} entitlements to migrate`);
    
    if (scanResult.Items.length === 0) {
      console.log('✅ No data to migrate');
      return;
    }
    
    // Migrate each item
    let migrated = 0;
    for (const item of scanResult.Items) {
      try {
        await docClient.send(new PutCommand({
          TableName: PROD_TABLE,
          Item: item
        }));
        migrated++;
        console.log(`✅ Migrated entitlement for user ${item.userId} (${migrated}/${scanResult.Items.length})`);
      } catch (error) {
        console.error(`❌ Failed to migrate entitlement for user ${item.userId}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed! ${migrated}/${scanResult.Items.length} entitlements migrated`);
    console.log(`\n📋 Summary:`);
    console.log(`   Legacy table: ${LEGACY_TABLE} (${scanResult.Items.length} items)`);
    console.log(`   Prod table: ${PROD_TABLE} (${migrated} items)`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateEntitlements();
