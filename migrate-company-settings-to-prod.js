#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const LEGACY_TABLE = 'marketplace-company-settings-1764183053';
const PROD_TABLE = 'marketplace-company-settings-prod';

async function migrateCompanySettings() {
  console.log('🔄 Starting company settings migration...');
  
  try {
    // Scan legacy table
    console.log(`📖 Reading data from ${LEGACY_TABLE}...`);
    const scanResult = await docClient.send(new ScanCommand({
      TableName: LEGACY_TABLE
    }));
    
    console.log(`📊 Found ${scanResult.Items.length} company settings to migrate`);
    
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
        console.log(`✅ Migrated setting ${item.settingKey} (${migrated}/${scanResult.Items.length})`);
      } catch (error) {
        console.error(`❌ Failed to migrate setting ${item.settingKey}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed! ${migrated}/${scanResult.Items.length} settings migrated`);
    console.log(`\n📋 Summary:`);
    console.log(`   Legacy table: ${LEGACY_TABLE} (${scanResult.Items.length} items)`);
    console.log(`   Prod table: ${PROD_TABLE} (${migrated} items)`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateCompanySettings();
