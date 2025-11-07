const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

async function addAwsSolutionFinder() {
  const solutionId = uuidv4();
  const partnerId = 'system'; // System-created solution, not partner-created
  
  const solution = {
    solutionId,
    partnerId,
    name: 'AWS Solution Finder',
    description: 'AI-powered search across 10,000+ AWS repositories. Find production-ready solutions in seconds with quality scoring, setup time estimates, and intelligent recommendations.',
    category: 'Developer Tools',
    pricing: {
      model: 'freemium',
      tiers: [
        {
          name: 'Free',
          amount: 0,
          currency: 'USD',
          billingPeriod: 'daily',
          features: ['10 searches per day', 'AWS Labs repositories', 'Basic search functionality', 'Community support'],
          limits: { searches: 10, period: 'daily' }
        },
        {
          name: 'Pro',
          amount: 29,
          currency: 'USD', 
          billingPeriod: 'monthly',
          features: ['Unlimited searches', 'All AWS repositories (10,000+)', 'Advanced filtering & sorting', 'Save searches & favorites', 'Export results to CSV', 'Email support', 'Usage analytics'],
          limits: { searches: 'unlimited' }
        }
      ]
    },
    status: 'active',
    images: [],
    tags: ['aws', 'search', 'ai', 'repositories', 'developer-tools', 'productivity'],
    externalUrl: 'https://awssolutionfinder.solutions.cloudnestle.com',
    demoUrl: 'https://awssolutionfinder.solutions.cloudnestle.com/search',
    apiEndpoint: 'https://5to8z1h4ue.execute-api.us-east-1.amazonaws.com/prod/',
    accessType: 'external_link', // Indicates this opens external URL
    features: [
      'Search across 10,000+ AWS repositories',
      'AI-powered semantic search with Amazon Nova Pro',
      'Quality scoring and freshness indicators',
      'Setup time and complexity estimates',
      'Real-time search results in under 10 seconds',
      'Support for AWS Labs and AWS Samples repositories'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await dynamodb.put({
      TableName: 'MP-1759859484941-DataStackSolutionTable263711A4-152RYQUO5ELUL',
      Item: solution
    }).promise();

    console.log('✅ AWS Solution Finder added to marketplace catalog');
    console.log('Solution ID:', solutionId);
    console.log('Product URL: https://marketplace.cloudnestle.com/solutions/' + solutionId);
    
    return solution;
  } catch (error) {
    console.error('❌ Error adding solution:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  addAwsSolutionFinder()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { addAwsSolutionFinder };
