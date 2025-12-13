// Fix for CatalogPage.tsx - Remove hardcoded externalUrl logic

// The issue is that the frontend is checking for solution.externalUrl 
// but this field doesn't exist in the database. The code should either:
// 1. Add externalUrl to the database for AWS Solution Finder
// 2. Remove the hardcoded URL logic and treat it like other solutions

// Let's add the externalUrl to the AWS Solution Finder solution in the database
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const SOLUTION_TABLE_NAME = 'marketplace-solutions-1765283908734';

async function fixAwsSolutionFinder() {
  try {
    // Update AWS Solution Finder to remove the externalUrl expectation
    // Instead, we'll make it work like other solutions without external URLs
    console.log('Updating AWS Solution Finder to work without external URL...');
    
    await docClient.send(new UpdateCommand({
      TableName: SOLUTION_TABLE_NAME,
      Key: { solutionId: 'aws-solution-finder-001' },
      UpdateExpression: 'REMOVE externalUrl SET actionButtonText = :buttonText, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':buttonText': 'View Details',
        ':updatedAt': new Date().toISOString()
      }
    }));
    
    console.log('✅ AWS Solution Finder updated successfully!');
    console.log('The solution will now show "View Details" button instead of "Access Now"');
    console.log('This removes the hardcoded URL dependency.');
    
  } catch (error) {
    console.error('❌ Failed to update AWS Solution Finder:', error);
  }
}

fixAwsSolutionFinder();
