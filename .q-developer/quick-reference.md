# Quick Reference - Kiro CloudNetsle Marketplace

## 🚀 LIVE SYSTEM STATUS
- **Frontend**: http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com
- **API**: https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/
- **Stack**: MP-1759859484941

## Project Status
- **Current Phase**: Phase 1 - Foundation & Customer Experience
- **Current Task**: Task 6 - React Frontend for Marketplace Browsing
- **Completion**: 5/24 tasks completed (21%)

## Essential Commands

### Development
```bash
npm run dev                    # Start all development servers
cd packages/frontend && npm run dev  # Frontend only (http://localhost:5173)
cd packages/infrastructure && npm run watch  # CDK watch mode
```

### Deployment
```bash
npm run deploy                 # Deploy infrastructure to AWS
cd packages/frontend && npm run build && aws s3 sync dist/ s3://marketplace.cloudnestle.com/ --delete  # Deploy frontend to live site
```

### Session Recovery (Critical)
```bash
# Find current infrastructure
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE | grep MP-
aws s3 ls | grep marketplace-frontend

# Test live systems
curl https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/catalog
```
```

### Testing
```bash
npm test                       # Run all tests
npm run lint                   # Lint all packages
npm run format                 # Format code with Prettier
```

## Key Files & Directories

### Specifications
- `.kiro/specs/marketplace-platform/requirements.md` - Detailed requirements
- `.kiro/specs/marketplace-platform/design.md` - Architecture & design
- `.kiro/specs/marketplace-platform/tasks.md` - Implementation plan

### Current Development
- `.q-developer/current-task.md` - Current task details
- `.q-developer/development-guide.md` - Development workflow

### Frontend (React)
- `packages/frontend/src/App.tsx` - Main application
- `packages/frontend/src/pages/` - Page components
- `packages/frontend/src/components/` - Reusable components
- `packages/frontend/src/services/` - API service layer

### Infrastructure (AWS CDK)
- `packages/infrastructure/lib/` - CDK stacks
- `packages/infrastructure/lambda/` - Lambda functions
- `packages/infrastructure/bin/marketplace-app.ts` - CDK app entry

## Architecture Overview

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios

### Backend Stack
- **Infrastructure**: AWS CDK
- **Compute**: Lambda Functions
- **API**: API Gateway
- **Database**: DynamoDB
- **Storage**: S3
- **Auth**: Cognito + Social Login

## Current Implementation Status

### ✅ Completed Features
1. **Project Setup**: Monorepo with npm workspaces
2. **Infrastructure**: DynamoDB, S3, CloudWatch, API Gateway
3. **Authentication**: Cognito with Google/GitHub social login
4. **User Management**: Registration, profiles, partner applications
5. **Solution Catalog Backend**: CRUD operations, search, filtering

### 🚧 In Progress (Task 6)
- Solution catalog page with grid layout
- Solution detail page with images and pricing
- Search and filtering components
- Loading states and error handling

### 📋 Next Tasks
- **Task 7**: Razorpay payment processing
- **Task 8**: Sample data seeding system
- **Task 9**: User dashboard and purchase history
- **Task 10**: Comprehensive error handling

## API Endpoints (Available)

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile

### Solution Catalog
- `GET /catalog` - List solutions (with search/filter)
- `GET /catalog/{id}` - Get solution details
- `GET /catalog/categories` - Get categories

### User Management
- `GET /users/profile` - User profile
- `PUT /users/profile` - Update profile
- `POST /users/partner-application` - Apply for partner status

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-api-gateway-url
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=your-cognito-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-cognito-client-id
```

## Testing URLs (After Deployment)
- **Frontend**: Check CloudFormation output `WebsiteUrl`
- **API**: Check CloudFormation output `ApiGatewayUrl`

## Common Issues & Solutions

### Development
- **Port conflicts**: Frontend runs on :5173, ensure port is free
- **AWS credentials**: Run `aws sts get-caller-identity` to verify
- **CDK bootstrap**: Run `cdk bootstrap` if first time deploying

### Deployment
- **CDK errors**: Check AWS permissions and region settings
- **Frontend deployment**: Ensure infrastructure is deployed first
- **CORS issues**: Check API Gateway CORS configuration

## Phase Roadmap

### Phase 1 (Current): Foundation & Customer Experience
- Basic auth, catalog browsing, payment processing
- **Target**: Functional marketplace for customers

### Phase 2: Partner Experience  
- Partner registration, solution management, commission system
- **Target**: Partners can sell solutions

### Phase 3: Administrative Controls
- Admin dashboard, analytics, commission management
- **Target**: Complete platform management

### Phase 4: Advanced Features
- Subscriptions, mobile app, advanced analytics
- **Target**: Enterprise-ready marketplace

## Support Resources
- **AWS CDK Docs**: https://docs.aws.amazon.com/cdk/
- **React Docs**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vite Docs**: https://vitejs.dev/guide/
