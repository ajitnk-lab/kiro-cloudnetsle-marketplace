#!/usr/bin/env node

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Table mappings: old -> new
const tableMappings = {
  'MP-1759859484941-DataStackUserTableDAF10CB8-MM0KVOMUI09Z': 'marketplace-users',
  'MP-1759859484941-DataStackSolutionTable263711A4-LPPU70GV5QCI': 'marketplace-solutions',
  'MP-1759859484941-DataStackPartnerApplicationTable548221AF-1XYHN9D5GAA2F': 'marketplace-partner-applications',
  'MP-1759859484941-DataStackTokenTable96347A0A-120T54JEA6XOY': 'marketplace-tokens',
  'MP-1759859484941-DataStackUserSolutionEntitlementsTableA6D19624-TT3JYD97B74Q': 'marketplace-user-solution-entitlements'
};

async function checkTableExists(tableName) {
  try {
    await docClient.send(new ScanCommand({ TableName: tableName, Limit: 1 }));
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function migrateTable(oldTableName, newTableName) {
  console.log(`🔄 Migrating ${oldTableName} -> ${newTableName}`);
  
  // Check if new table exists
  const newTableExists = await checkTableExists(newTableName);
  if (!newTableExists) {
    console.log(`   ⚠️  New table ${newTableName} doesn't exist yet. Skipping migration.`);
    return;
  }
  
  // Check if old table exists
  const oldTableExists = await checkTableExists(oldTableName);
  if (!oldTableExists) {
    console.log(`   ⚠️  Old table ${oldTableName} doesn't exist. Skipping migration.`);
    return;
  }
  
  let lastEvaluatedKey = null;
  let totalItems = 0;
  
  do {
    // Scan old table
    const scanParams = {
      TableName: oldTableName,
      Limit: 25, // Process in small batches
    };
    
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const scanResult = await docClient.send(new ScanCommand(scanParams));
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      // Prepare batch write to new table
      const putRequests = scanResult.Items.map(item => ({
        PutRequest: { Item: item }
      }));
      
      // Write to new table in batches of 25
      const batchWriteParams = {
        RequestItems: {
          [newTableName]: putRequests
        }
      };
      
      await docClient.send(new BatchWriteCommand(batchWriteParams));
      totalItems += scanResult.Items.length;
      console.log(`   ✅ Migrated ${totalItems} items so far...`);
    }
    
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`   ✅ Migration complete: ${totalItems} items migrated`);
}

async function migrateAllTables() {
  console.log('🚀 Starting table data migration...');
  
  for (const [oldTable, newTable] of Object.entries(tableMappings)) {
    try {
      await migrateTable(oldTable, newTable);
    } catch (error) {
      console.error(`❌ Error migrating ${oldTable}:`, error.message);
    }
  }
  
  console.log('✅ Migration process completed!');
  console.log('');
  console.log('⚠️  IMPORTANT: Verify data integrity before deleting old tables');
  console.log('   Run: aws dynamodb scan --table-name marketplace-users --limit 5');
}

// Only run migration if called directly
if (require.main === module) {
  migrateAllTables().catch(console.error);
}

module.exports = { migrateAllTables, tableMappings };
