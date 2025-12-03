const AWS = require('aws-sdk');

async function copySolutions() {
  const oldDynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
  const newDynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-west-1' });
  
  const oldTableName = 'MP-1759859484941-DataStackSolutionTable263711A4-152RYQUO5ELUL';
  const newTableName = 'marketplace-solutions-17641830531764185829885';

  try {
    // Scan old table from us-east-1
    console.log('📋 Scanning old solutions table in us-east-1...');
    const oldSolutions = await oldDynamodb.scan({
      TableName: oldTableName
    }).promise();

    console.log(`✅ Found ${oldSolutions.Items.length} solutions in old table`);

    // Copy each solution to new table in us-west-1
    for (const solution of oldSolutions.Items) {
      console.log(`📝 Copying: ${solution.name}`);
      
      await newDynamodb.put({
        TableName: newTableName,
        Item: {
          ...solution,
          updatedAt: new Date().toISOString()
        }
      }).promise();
      
      console.log(`   ✅ Copied: ${solution.name}`);
    }

    console.log(`\n🎉 Successfully copied ${oldSolutions.Items.length} solutions to new table!`);
    
  } catch (error) {
    console.error('❌ Error copying solutions:', error);
    throw error;
  }
}

copySolutions();
