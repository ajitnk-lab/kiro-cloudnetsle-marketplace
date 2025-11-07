const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

async function fixAwsSolutionFinder() {
  const solutionId = '61deb2fb-6e5e-4cda-ac5d-ff20202a8788';
  
  try {
    // Update the solution with proper values
    await dynamodb.update({
      TableName: 'MP-1759859484941-DataStackSolutionTable263711A4-152RYQUO5ELUL',
      Key: { solutionId },
      UpdateExpression: 'SET #status = :status, partnerId = :partnerId, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'approved',  // Change from 'active' to 'approved'
        ':partnerId': 'admin-system',  // Change from 'system' to something more appropriate
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    console.log('✅ AWS Solution Finder updated successfully');
    console.log('Status changed to: approved');
    console.log('Partner ID changed to: admin-system');
    console.log('Solution should now appear in catalog');
    
  } catch (error) {
    console.error('❌ Error updating solution:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  fixAwsSolutionFinder()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { fixAwsSolutionFinder };
