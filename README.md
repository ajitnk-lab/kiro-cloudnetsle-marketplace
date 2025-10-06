# Kiro CloudNetsle Marketplace

A comprehensive self-service online marketplace platform similar to AWS Marketplace, enabling registered customers and partners to buy and sell software solutions.

## Overview

The Marketplace Platform is built using modern cloud-native technologies with a focus on scalability, security, and user experience. The platform supports multiple user roles (customers, partners, administrators) with comprehensive workflows for each persona.

## Architecture

- **Backend**: AWS CDK (TypeScript) with serverless Lambda functions
- **Frontend**: React 18 with TypeScript, Vite, and Tailwind CSS
- **Database**: DynamoDB for user data, RDS PostgreSQL for transactions
- **Authentication**: Amazon Cognito with social login support
- **Payment Processing**: Razorpay integration for Indian market
- **Infrastructure**: AWS managed services for scalability and security

## Features

### Customer Features
- Multi-method registration (email/password, social login)
- Solution catalog browsing and search
- Secure payment processing (cards, UPI)
- Purchase history and account management
- Subscription management

### Partner Features
- Partner program application and approval
- Solution catalog management
- Custom pricing models (upfront/subscription)
- Sales analytics and reporting
- Earnings tracking and payout management

### Administrative Features
- Comprehensive admin dashboard
- User and partner management
- Solution moderation and approval
- Commission configuration
- Platform analytics and reporting

## Development Phases

### Phase 1: Foundation & Customer Experience
- Authentication system with social login
- Solution catalog browsing
- Basic payment processing
- Sample data for testing

### Phase 2: Partner Experience
- Partner registration and solution management
- Solution approval workflow
- Commission calculation system
- Partner analytics dashboard

### Phase 3: Administrative Controls
- Admin dashboard with comprehensive management
- Advanced analytics and reporting
- Commission and payout management
- Platform-wide configuration

### Phase 4: Advanced Features
- Subscription management system
- Advanced search and recommendations
- Mobile application development
- Performance optimization

## Technology Stack

### Backend
- **Infrastructure**: AWS CDK (TypeScript)
- **Compute**: AWS Lambda Functions
- **API**: Amazon API Gateway
- **Authentication**: Amazon Cognito User Pools
- **Database**: DynamoDB + RDS PostgreSQL
- **Storage**: Amazon S3
- **Payment**: Razorpay Gateway

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod

## Project Structure

```
marketplace-platform/
├── packages/                          # Workspace packages
│   ├── frontend/                      # React application
│   │   ├── src/
│   │   │   ├── components/           # Reusable UI components
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── SocialLoginButtons.tsx
│   │   │   │   ├── ProtectedRoute.tsx
│   │   │   │   └── AuthCallback.tsx
│   │   │   ├── pages/               # Page-level components
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── CatalogPage.tsx
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   └── SolutionDetailPage.tsx
│   │   │   ├── contexts/            # React contexts
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── services/            # API service layer
│   │   │   │   └── auth.ts
│   │   │   ├── types/               # TypeScript type definitions
│   │   │   │   └── auth.ts
│   │   │   ├── App.tsx              # Main application component
│   │   │   ├── main.tsx             # Application entry point
│   │   │   └── index.css            # Global styles with Tailwind
│   │   ├── public/                  # Static assets
│   │   ├── index.html               # HTML template
│   │   ├── package.json             # Frontend dependencies
│   │   ├── vite.config.ts           # Vite configuration
│   │   ├── tailwind.config.js       # Tailwind CSS configuration
│   │   ├── postcss.config.js        # PostCSS configuration
│   │   └── tsconfig.json            # TypeScript configuration
│   └── infrastructure/               # AWS CDK infrastructure
│       ├── lib/                     # CDK stacks and constructs
│       │   ├── auth-stack.ts        # Cognito User Pool, Identity Providers
│       │   ├── api-stack.ts         # API Gateway, Lambda Functions
│       │   ├── data-stack.ts        # DynamoDB, RDS, S3
│       │   └── marketplace-infrastructure-stack.ts  # Main infrastructure
│       ├── lambda/                  # Lambda function code
│       │   ├── auth/               # Authentication services
│       │   │   ├── register.js
│       │   │   ├── profile.js
│       │   │   ├── user-management.js
│       │   │   ├── partner-application.js
│       │   │   └── package.json
│       │   └── catalog/            # Solution catalog services
│       │       ├── catalog.js
│       │       └── package.json
│       ├── test/                   # Unit tests
│       │   └── user-management.test.js
│       ├── bin/                    # CDK app entry point
│       │   └── marketplace-app.ts
│       ├── package.json            # Infrastructure dependencies
│       ├── cdk.json                # CDK configuration
│       └── tsconfig.json           # TypeScript configuration
├── .kiro/                          # Kiro AI assistant configuration
│   ├── settings/                   # MCP and other settings
│   │   ├── mcp.json               # Local MCP configuration (gitignored)
│   │   └── mcp.json.template      # MCP configuration template
│   ├── specs/                     # Feature specifications
│   │   └── marketplace-platform/
│   │       ├── requirements.md    # Detailed requirements
│   │       ├── design.md         # Architecture and design
│   │       └── tasks.md          # Implementation tasks
│   └── steering/                  # AI guidance documents
│       ├── product.md            # Product overview
│       ├── structure.md          # Project structure guide
│       └── tech.md               # Technology stack guide
├── package.json                   # Root workspace configuration
├── .eslintrc.json                # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── .gitignore                    # Git ignore patterns
└── README.md                     # Project documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured
- AWS CDK CLI installed
- Razorpay account for payment processing

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure AWS credentials
4. Set up environment variables
5. Deploy infrastructure: `npm run deploy`
6. Start development server: `npm run dev`

## Testing Timeline

### ✅ **Available Now (After Task 4)**
**Frontend Testing:**
```bash
# Start frontend development server
cd packages/frontend
npm run dev
# Visit http://localhost:5173
```

**What you can test:**
- ✅ Homepage with responsive design
- ✅ Registration page with form validation
- ✅ Login page with social login buttons
- ✅ Profile page (mock data)
- ✅ Navigation and routing
- ✅ UI components and styling

**Backend Testing:**
```bash
# Deploy infrastructure to AWS
cd packages/infrastructure
npm run deploy
```

**What you can test:**
- ✅ User registration and authentication
- ✅ User profile management
- ✅ Partner application system
- ✅ Admin user management
- ✅ Email notifications
- ✅ API endpoints with Postman/curl

### 🚧 **After Task 5 (Solution Catalog Backend)**
**Additional Backend Testing:**
- ✅ Solution CRUD operations
- ✅ Solution search and filtering
- ✅ Image upload to S3
- ✅ Category management

### 🚧 **After Task 6 (Frontend Catalog)**
**Full Frontend Testing:**
- ✅ Solution catalog browsing
- ✅ Solution search and filters
- ✅ Solution detail pages
- ✅ End-to-end user workflows

### 🚧 **After Task 8 (Sample Data)**
**Complete System Testing:**
- ✅ Full marketplace experience
- ✅ Sample solutions and users
- ✅ Realistic data for testing

## Current Testing Instructions

### Frontend Development Testing
```bash
# Install dependencies
npm install

# Start frontend development server
cd packages/frontend
npm run dev

# Visit http://localhost:5173 in your browser
```

### Backend Infrastructure Testing
```bash
# Configure AWS credentials
aws configure

# Deploy infrastructure
cd packages/infrastructure
npm run bootstrap  # First time only
npm run deploy

# Test API endpoints
curl -X GET https://your-api-gateway-url/catalog
```

### Unit Testing
```bash
# Run infrastructure tests
cd packages/infrastructure
npm test

# Run frontend tests (when available)
cd packages/frontend
npm test
```

## Specifications

The project includes comprehensive specifications in the `.kiro/specs/marketplace-platform/` directory:

- **Requirements**: Detailed user stories and acceptance criteria
- **Design**: Architecture, components, and data models
- **Tasks**: Implementation plan with phased development approach

## Contributing

This project follows a spec-driven development approach with clear requirements, design documents, and implementation tasks. All development should adhere to the specifications and update task status accordingly.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact the development team.