# Development Guide - Q Developer CLI

## Project Context
This is a **spec-driven development** project following a phased approach. All features are defined in `.kiro/specs/marketplace-platform/requirements.md` with detailed acceptance criteria.

## Current Development Status

### Phase 1: Foundation & Customer Experience (In Progress)
- ✅ **Tasks 1-5**: Infrastructure, authentication, user management, solution catalog backend
- 🚧 **Task 6**: React frontend for marketplace browsing (CURRENT)
- 📋 **Tasks 7-10**: Payment processing, sample data, user dashboard, error handling

## Development Workflow

### 1. Understanding Requirements
Before implementing any feature:
```bash
# Read the current task specification
cat .q-developer/current-task.md

# Review detailed requirements
cat .kiro/specs/marketplace-platform/requirements.md

# Check design specifications
cat .kiro/specs/marketplace-platform/design.md
```

### 2. Development Environment
```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Frontend only (for UI development)
cd packages/frontend && npm run dev
```

### 3. Code Structure
```
packages/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page-level components
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript definitions
│   │   └── contexts/       # React contexts
└── infrastructure/          # AWS CDK infrastructure
    ├── lib/                # CDK stacks
    └── lambda/             # Lambda function code
```

### 4. Implementation Guidelines

#### Frontend Development
- **Components**: Use TypeScript functional components with proper typing
- **Styling**: Tailwind CSS with responsive design principles
- **State**: React hooks for local state, Zustand for global state
- **API**: Axios with proper error handling and loading states
- **Forms**: React Hook Form with Zod validation

#### Backend Development
- **Lambda Functions**: Node.js with proper error handling
- **Database**: DynamoDB with GSI for efficient queries
- **API**: RESTful endpoints with proper HTTP status codes
- **Authentication**: JWT token validation with Cognito

### 5. Testing Strategy
```bash
# Run all tests
npm test

# Frontend tests only
cd packages/frontend && npm test

# Infrastructure tests
cd packages/infrastructure && npm test
```

### 6. Deployment
```bash
# Deploy infrastructure
npm run deploy

# Deploy frontend (after infrastructure)
cd packages/frontend && npm run deploy
```

## Key Development Principles

### 1. Spec-Driven Development
- Every feature must have acceptance criteria in requirements.md
- Implementation should directly address the acceptance criteria
- Test against the specified user stories

### 2. Phased Development
- Focus on current phase requirements only
- Don't implement future phase features prematurely
- Ensure each phase is fully functional before moving to next

### 3. Sample Data First
- Include realistic sample data for immediate testing
- Enable demonstration of functionality without complex setup
- Use sample data to validate user workflows

### 4. Minimal Viable Implementation
- Implement the simplest solution that meets acceptance criteria
- Avoid over-engineering or premature optimization
- Focus on core functionality first, then enhance

## Current Task Focus (Task 6)

### What to Implement
1. **Solution Catalog Page**: Grid layout with search and filtering
2. **Solution Detail Page**: Comprehensive solution information
3. **Search Components**: Real-time search with debouncing
4. **Filter Components**: Category and price filtering
5. **Loading States**: Proper UX for async operations

### What NOT to Implement Yet
- Payment processing (Task 7)
- User dashboard (Task 9)
- Subscription management (Phase 4)
- Advanced analytics (Phase 3)

## API Integration

### Available Endpoints (from completed tasks)
```
GET /catalog                 # List solutions with search/filter
GET /catalog/{id}           # Get solution details
GET /catalog/categories     # Get available categories
POST /auth/register         # User registration
POST /auth/login           # User authentication
GET /users/profile         # User profile
```

### Frontend Service Layer
Use the existing service files:
- `src/services/catalog.ts` - Solution catalog API calls
- `src/services/auth.ts` - Authentication API calls

## Quality Standards

### Code Quality
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Proper error handling and logging
- Responsive design for all screen sizes

### Testing Requirements
- Unit tests for components and services
- Integration tests for API calls
- Error boundary testing
- Responsive design validation

### Documentation
- Update README.md with new features
- Document API changes
- Update task status in tasks.md

## Getting Help

### Project Documentation
- `.kiro/specs/` - Complete specifications
- `.kiro/steering/` - Architecture and technology guides
- `README.md` - Project overview and setup

### Development Resources
- React 18 documentation
- Tailwind CSS documentation
- AWS CDK documentation
- TypeScript handbook

## Next Steps After Task 6
1. **Task 7**: Implement Razorpay payment processing
2. **Task 8**: Create comprehensive sample data seeding
3. **Task 9**: Build user dashboard and purchase history
4. **Task 10**: Add comprehensive error handling and validation
