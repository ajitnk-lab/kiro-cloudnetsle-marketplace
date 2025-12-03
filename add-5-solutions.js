const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-west-1' });

const solutions = [
  {
    name: 'AWS Solution Finder',
    description: 'AI-powered search across 10,000+ AWS repositories with semantic search capabilities.',
    category: 'Developer Tools',
    externalUrl: 'https://awssolutionfinder.solutions.cloudnestle.com/search'
  },
  {
    name: 'Migration Planner',
    description: 'Comprehensive AWS migration planning and assessment tool.',
    category: 'Migration & Transfer'
  },
  {
    name: 'Cost Optimizer',
    description: 'Automated AWS cost optimization and resource rightsizing.',
    category: 'Cost Management'
  },
  {
    name: 'Performance Monitor',
    description: 'Real-time AWS infrastructure performance monitoring and alerting.',
    category: 'Monitoring & Observability'
  },
  {
    name: 'Security Scanner',
    description: 'Automated security assessment and compliance checking for AWS resources.',
    category: 'Security & Compliance'
  }
];

async function addSolutions() {
  for (const sol of solutions) {
    const solution = {
      solutionId: uuidv4(),
      partnerId: 'system',
      name: sol.name,
      description: sol.description,
      category: sol.category,
      status: 'approved',
      pricing: {
        model: 'freemium',
        tiers: [
          { name: 'Free', amount: 0, currency: 'USD', billingPeriod: 'monthly' },
          { name: 'Pro', amount: 29, currency: 'USD', billingPeriod: 'monthly' }
        ]
      },
      images: [],
      tags: ['aws', 'tools'],
      externalUrl: sol.externalUrl || 'https://marketplace.cloudnestle.com',
      accessType: 'external_link',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamodb.put({
      TableName: 'marketplace-solutions-1764183053',
      Item: solution
    }).promise();

    console.log(`✅ Added: ${solution.name}`);
  }
}

addSolutions();
