#!/usr/bin/env node

const { DynamoDBClient, ScanCommand, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

// Configuration
const ORIGINAL_PROFILE = 'default';
const MEMBER_PROFILE = 'member-account';
const REGION = 'us-east-1';
const BATCH_SIZE = 25; // DynamoDB batch write limit

// Table mappings: original -> member account
const TABLE_MAPPINGS = {
  'marketplace-users': 'marketplace-users-1764183053',
  'marketplace-solutions': 'marketplace-solutions-1764183053',
  'marketplace-sessions': 'marketplace-sessions-1764183053',
  'marketplace-user-solution-entitlements': 'marketplace-user-solution-entitlements-1764183053',
  'marketplace-partner-applications': 'marketplace-partner-applications-1764183053',
  'marketplace-payment-transactions': 'marketplace-payment-transactions-1764183053',
  'marketplace-tokens': 'marketplace-tokens-1764183053',
  'marketplace-user-sessions': 'marketplace-user-sessions-1764183053',
  'marketplace-api-metrics': 'marketplace-api-metrics-1764183053'
};

// Create DynamoDB clients
const originalClient = new DynamoDBClient({ 
  region: REGION,
  credentials: {
    profile: ORIGINAL_PROFILE
  }
});

const memberClient = new DynamoDBClient({ 
  region: REGION,
  credentials: {
    profile: MEMBER_PROFILE
  }
});

async function scanTable(client, tableName) {
  const items = [];
  let lastEvaluatedKey = undefined;
  
  do {
    const params = {
      TableName: tableName,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
    };
    
    try {
      const result = await client.send(new ScanCommand(params));
      items.push(...result.Items);
      lastEvaluatedKey = result.LastEvaluatedKey;
      console.log(`Scanned ${result.Items.length} items from ${tableName}, total: ${items.length}`);
    } catch (error) {
      console.error(`Error scanning ${tableName}:`, error.message);
      break;
    }
  } while (lastEvaluatedKey);
  
  return items;
}

async function batchWriteItems(client, tableName, items) {
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }
  
  let totalWritten = 0;
  
  for (const batch of batches) {
    const putRequests = batch.map(item => ({
      PutRequest: { Item: item }
    }));
    
    const params = {
      RequestItems: {
        [tableName]: putRequests
      }
    };
    
    try {
      await client.send(new BatchWriteItemCommand(params));
      totalWritten += batch.length;
      console.log(`Wrote batch of ${batch.length} items to ${tableName}, total: ${totalWritten}`);
    } catch (error) {
      console.error(`Error writing batch to ${tableName}:`, error.message);
      throw error;
    }
  }
  
  return totalWritten;
}

async function migrateTable(sourceTable, targetTable) {
  console.log(`\n🔄 Migrating ${sourceTable} -> ${targetTable}`);
  
  try {
    // Scan all items from source table
    const items = await scanTable(originalClient, sourceTable);
    
    if (items.length === 0) {
      console.log(`✅ ${sourceTable} is empty, skipping`);
      return;
    }
    
    // Write items to target table
    const written = await batchWriteItems(memberClient, targetTable, items);
    console.log(`✅ Successfully migrated ${written} items from ${sourceTable} to ${targetTable}`);
    
  } catch (error) {
    console.error(`❌ Failed to migrate ${sourceTable}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting DynamoDB data migration...');
  console.log(`📊 Migrating from original account (${ORIGINAL_PROFILE}) to member account (${MEMBER_PROFILE})`);
  
  let totalMigrated = 0;
  
  for (const [sourceTable, targetTable] of Object.entries(TABLE_MAPPINGS)) {
    try {
      await migrateTable(sourceTable, targetTable);
      totalMigrated++;
    } catch (error) {
      console.error(`❌ Migration failed for ${sourceTable}, continuing with next table...`);
    }
  }
  
  console.log(`\n✅ Migration completed! Successfully migrated ${totalMigrated}/${Object.keys(TABLE_MAPPINGS).length} tables`);
}

// Run migration
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
