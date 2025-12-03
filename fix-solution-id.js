const AWS = require('aws-sdk');

// Configure AWS
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-west-1' });

async function fixSolutionId() {
    const tableName = 'marketplace-solutions-1764183053';
    
    try {
        // 1. Get the current solution record
        const currentRecord = await dynamodb.get({
            TableName: tableName,
            Key: {
                solutionId: '08658994-ed42-42e6-9995-99be166532e4'
            }
        }).promise();
        
        if (!currentRecord.Item) {
            console.log('❌ Current solution record not found');
            return;
        }
        
        console.log('✅ Found current solution record');
        
        // 2. Create new record with correct solution ID
        const newRecord = {
            ...currentRecord.Item,
            solutionId: 'aws-solution-finder-001',
            updatedAt: new Date().toISOString()
        };
        
        // 3. Put new record
        await dynamodb.put({
            TableName: tableName,
            Item: newRecord
        }).promise();
        
        console.log('✅ Created new solution record with ID: aws-solution-finder-001');
        
        // 4. Delete old record
        await dynamodb.delete({
            TableName: tableName,
            Key: {
                solutionId: '08658994-ed42-42e6-9995-99be166532e4'
            }
        }).promise();
        
        console.log('✅ Deleted old solution record with UUID');
        console.log('🎉 Solution ID successfully updated to: aws-solution-finder-001');
        
    } catch (error) {
        console.error('❌ Error updating solution ID:', error);
    }
}

fixSolutionId();
