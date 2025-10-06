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
├── infrastructure/          # AWS CDK Infrastructure
│   ├── lib/                # CDK stacks and constructs
│   ├── bin/                # CDK app entry point
│   └── lambda/             # Lambda function code
├── frontend/               # React Web Application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── dist/              # Build output
├── .kiro/                 # Kiro AI assistant configuration
│   ├── specs/             # Feature specifications
│   └── steering/          # AI guidance documents
└── docs/                  # Documentation
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