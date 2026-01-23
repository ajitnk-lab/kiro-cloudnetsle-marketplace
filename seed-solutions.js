const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const SOLUTION_TABLE_NAME = 'marketplace-solutions-prod';

const solutions = [
  {
    solutionId: 'aws-solution-finder-001',
    name: 'AWS Solution Finder',
    description: 'AI-powered tool to find the best AWS services for your use case',
    category: 'AI & Machine Learning',
    pricing: {
      free: { price: 0, features: ['Basic search', '10 queries/day'] },
      pro: { price: 150, features: ['Advanced search', 'Unlimited queries', 'Priority support'] }
    },
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'serverless-api-builder-002',
    name: 'Serverless API Builder',
    description: 'Quickly build and deploy serverless APIs using AWS Lambda and API Gateway',
    category: 'Development Tools',
    pricing: {
      free: { price: 0, features: ['Basic templates', '5 APIs/month'] },
      pro: { price: 499.99, features: ['Advanced templates', 'Unlimited APIs', 'Custom domains'] }
    },
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'cost-optimizer-003',
    name: 'AWS Cost Optimizer',
    description: 'Analyze and optimize your AWS costs with intelligent recommendations',
    category: 'Cost Management',
    pricing: {
      free: { price: 0, features: ['Basic analysis', 'Monthly reports'] },
      pro: { price: 299.99, features: ['Real-time monitoring', 'Custom alerts', 'Detailed insights'] }
    },
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'security-scanner-004',
    name: 'Security Configuration Scanner',
    description: 'Scan your AWS infrastructure for security vulnerabilities and compliance issues',
    category: 'Security',
    pricing: {
      free: { price: 0, features: ['Basic scans', 'Weekly reports'] },
      pro: { price: 599.99, features: ['Continuous monitoring', 'Compliance frameworks', 'Remediation guides'] }
    },
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'data-pipeline-builder-005',
    name: 'Data Pipeline Builder',
    description: 'Visual tool to build and manage data pipelines using AWS services',
    category: 'Data & Analytics',
    pricing: {
      free: { price: 0, features: ['Basic pipelines', '3 data sources'] },
      pro: { price: 799.99, features: ['Advanced transformations', 'Unlimited sources', 'Real-time processing'] }
    },
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function seedSolutions() {
  console.log('Seeding solutions to table:', SOLUTION_TABLE_NAME);
  
  for (const solution of solutions) {
    try {
      await docClient.send(new PutCommand({
        TableName: SOLUTION_TABLE_NAME,
        Item: solution
      }));
      console.log(`✅ Added solution: ${solution.name}`);
    } catch (error) {
      console.error(`❌ Failed to add solution ${solution.name}:`, error);
    }
  }
  
  console.log('✅ Solution seeding completed!');
}

seedSolutions().catch(console.error);
