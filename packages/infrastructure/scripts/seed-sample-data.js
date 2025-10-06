const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb')

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)

// Sample solutions data
const sampleSolutions = [
  {
    solutionId: 'sol-001',
    name: 'CRM Pro Suite',
    description: 'Advanced Customer Relationship Management system with AI-powered insights, lead tracking, and automated workflows. Perfect for growing businesses.',
    category: 'Business Software',
    pricing: {
      model: 'subscription',
      amount: 2999,
      billingCycle: 'month',
      currency: 'INR'
    },
    tags: ['CRM', 'Sales', 'AI', 'Analytics', 'Lead Management'],
    assets: {
      images: [
        'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop'
      ],
      documents: []
    },
    partnerId: 'partner-001',
    partnerName: 'TechSolutions Inc',
    status: 'active',
    features: [
      'Lead Management & Tracking',
      'AI-Powered Sales Insights',
      'Automated Email Campaigns',
      'Custom Reporting Dashboard',
      'Mobile App Access',
      '24/7 Customer Support'
    ],
    requirements: {
      system: 'Web-based, works on all modern browsers',
      storage: 'Cloud-based storage included',
      users: 'Up to 50 users included'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'sol-002',
    name: 'Inventory Master',
    description: 'Complete inventory management solution for small to medium businesses. Track stock, manage suppliers, and automate reordering.',
    category: 'Business Software',
    pricing: {
      model: 'upfront',
      amount: 15999,
      currency: 'INR'
    },
    tags: ['Inventory', 'Management', 'SMB', 'Stock Control', 'Suppliers'],
    assets: {
      images: [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=300&fit=crop'
      ],
      documents: []
    },
    partnerId: 'partner-002',
    partnerName: 'BusinessFlow Solutions',
    status: 'active',
    features: [
      'Real-time Stock Tracking',
      'Supplier Management',
      'Automated Reorder Points',
      'Barcode Scanning Support',
      'Multi-location Support',
      'Detailed Analytics'
    ],
    requirements: {
      system: 'Windows 10+, macOS 10.15+, or web browser',
      storage: '500MB local storage',
      users: 'Single user license'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'sol-003',
    name: 'DevOps Toolkit Pro',
    description: 'Comprehensive DevOps automation and monitoring platform. Streamline your CI/CD pipelines and monitor application performance.',
    category: 'Developer Tools',
    pricing: {
      model: 'subscription',
      amount: 4999,
      billingCycle: 'month',
      currency: 'INR'
    },
    tags: ['DevOps', 'Automation', 'Monitoring', 'CI/CD', 'Performance'],
    assets: {
      images: [
        'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=300&fit=crop'
      ],
      documents: []
    },
    partnerId: 'partner-003',
    partnerName: 'CloudOps Technologies',
    status: 'active',
    features: [
      'Automated CI/CD Pipelines',
      'Real-time Monitoring',
      'Container Orchestration',
      'Performance Analytics',
      'Security Scanning',
      'Multi-cloud Support'
    ],
    requirements: {
      system: 'Docker, Kubernetes cluster recommended',
      storage: 'Cloud-based with local caching',
      users: 'Team collaboration features'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'sol-004',
    name: 'Analytics Dashboard Suite',
    description: 'Real-time business analytics and reporting dashboard. Transform your data into actionable insights with beautiful visualizations.',
    category: 'Analytics',
    pricing: {
      model: 'subscription',
      amount: 1999,
      billingCycle: 'month',
      currency: 'INR'
    },
    tags: ['Analytics', 'Dashboard', 'Reporting', 'Real-time', 'Visualization'],
    assets: {
      images: [
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop'
      ],
      documents: []
    },
    partnerId: 'partner-004',
    partnerName: 'DataViz Pro',
    status: 'active',
    features: [
      'Real-time Data Processing',
      'Custom Dashboard Builder',
      'Advanced Visualizations',
      'Automated Reports',
      'Data Export Options',
      'API Integration'
    ],
    requirements: {
      system: 'Web-based, responsive design',
      storage: 'Cloud storage with data backup',
      users: 'Multi-user access with permissions'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'sol-005',
    name: 'E-commerce Builder',
    description: 'Complete e-commerce platform builder with payment integration, inventory management, and marketing tools.',
    category: 'E-commerce',
    pricing: {
      model: 'subscription',
      amount: 3499,
      billingCycle: 'month',
      currency: 'INR'
    },
    tags: ['E-commerce', 'Online Store', 'Payments', 'Marketing', 'SEO'],
    assets: {
      images: [
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop'
      ],
      documents: []
    },
    partnerId: 'partner-005',
    partnerName: 'ShopTech Solutions',
    status: 'active',
    features: [
      'Drag & Drop Store Builder',
      'Payment Gateway Integration',
      'Inventory Management',
      'SEO Optimization',
      'Marketing Automation',
      'Mobile Responsive'
    ],
    requirements: {
      system: 'Web-based platform',
      storage: 'Unlimited product storage',
      users: 'Multi-admin support'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    solutionId: 'sol-006',
    name: 'Project Management Pro',
    description: 'Advanced project management tool with team collaboration, time tracking, and resource planning capabilities.',
    category: 'Productivity',
    pricing: {
      model: 'subscription',
      amount: 1499,
      billingCycle: 'month',
      currency: 'INR'
    },
    tags: ['Project Management', 'Team Collaboration', 'Time Tracking', 'Planning'],
    assets: {
      images: [
        'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop'
      ],
      documents: []
    },
    partnerId: 'partner-006',
    partnerName: 'ProductivityHub',
    status: 'active',
    features: [
      'Gantt Chart Planning',
      'Team Collaboration Tools',
      'Time Tracking & Reporting',
      'Resource Management',
      'File Sharing',
      'Mobile Apps'
    ],
    requirements: {
      system: 'Cross-platform web application',
      storage: 'Cloud-based with offline sync',
      users: 'Unlimited team members'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Sample partner users
const samplePartners = [
  {
    userId: 'partner-001',
    email: 'partner1@techsolutions.com',
    role: 'partner',
    profile: {
      name: 'TechSolutions Inc',
      company: 'TechSolutions Inc',
      givenName: 'Tech',
      familyName: 'Solutions'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    cognitoStatus: 'confirmed'
  },
  {
    userId: 'partner-002',
    email: 'partner2@businessflow.com',
    role: 'partner',
    profile: {
      name: 'BusinessFlow Solutions',
      company: 'BusinessFlow Solutions',
      givenName: 'Business',
      familyName: 'Flow'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    cognitoStatus: 'confirmed'
  },
  {
    userId: 'partner-003',
    email: 'partner3@cloudops.com',
    role: 'partner',
    profile: {
      name: 'CloudOps Technologies',
      company: 'CloudOps Technologies',
      givenName: 'CloudOps',
      familyName: 'Tech'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    cognitoStatus: 'confirmed'
  }
]

async function seedSampleData() {
  try {
    console.log('Starting sample data seeding...')
    
    const SOLUTIONS_TABLE = process.env.SOLUTIONS_TABLE || 'marketplace-solutions-039920874011'
    const USERS_TABLE = process.env.USERS_TABLE || 'marketplace-users-039920874011'
    
    console.log(`Seeding solutions to table: ${SOLUTIONS_TABLE}`)
    console.log(`Seeding partners to table: ${USERS_TABLE}`)
    
    // Seed solutions
    for (const solution of sampleSolutions) {
      try {
        await docClient.send(new PutCommand({
          TableName: SOLUTIONS_TABLE,
          Item: solution,
          ConditionExpression: 'attribute_not_exists(solutionId)'
        }))
        console.log(`✅ Added solution: ${solution.name}`)
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          console.log(`⚠️  Solution already exists: ${solution.name}`)
        } else {
          console.error(`❌ Failed to add solution ${solution.name}:`, error.message)
        }
      }
    }
    
    // Seed partner users
    for (const partner of samplePartners) {
      try {
        await docClient.send(new PutCommand({
          TableName: USERS_TABLE,
          Item: partner,
          ConditionExpression: 'attribute_not_exists(userId)'
        }))
        console.log(`✅ Added partner: ${partner.profile.name}`)
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          console.log(`⚠️  Partner already exists: ${partner.profile.name}`)
        } else {
          console.error(`❌ Failed to add partner ${partner.profile.name}:`, error.message)
        }
      }
    }
    
    console.log('🎉 Sample data seeding completed!')
    console.log(`📊 Added ${sampleSolutions.length} solutions and ${samplePartners.length} partners`)
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  seedSampleData()
}

module.exports = { seedSampleData, sampleSolutions, samplePartners }