# Technology Stack

## Build System & Package Management

- **Monorepo**: npm workspaces for multi-package management
- **Node.js**: 18+ required
- **Package Manager**: npm 9.0.0+
- **TypeScript**: Primary language for both frontend and infrastructure

## Frontend Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with PostCSS and Autoprefixer
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation and Hookform Resolvers
- **HTTP Client**: Axios for API communication
- **State Management**: React Query for server state
- **Icons**: Lucide React
- **Utilities**: clsx and tailwind-merge for conditional styling
- **Testing**: Vitest with UI support

## Infrastructure Stack

- **IaC**: AWS CDK (TypeScript)
- **Database**: DynamoDB
- **API**: Lambda functions with API Gateway
- **Storage**: S3 for static assets
- **CDN**: CloudFront
- **Testing**: Jest with ts-jest

## Payment Integration

- **Payment Gateway**: Instamojo (card and UPI support)

## Common Commands

### Root Level
```bash
npm install                    # Install all dependencies
npm run dev                   # Start all development servers
npm run build                 # Build all packages
npm run test                  # Run tests for all packages
npm run lint                  # Lint all packages
npm run format                # Format code with Prettier
npm run deploy                # Deploy infrastructure
npm run destroy               # Destroy AWS resources
```

### Frontend Development
```bash
cd packages/frontend
npm run dev                   # Start Vite dev server
npm run build                 # Build for production (tsc + vite build)
npm run preview               # Preview production build
npm run test                  # Run Vitest tests
npm run test:ui               # Run tests with UI
npm run lint                  # ESLint with TypeScript rules
```

### Infrastructure Development
```bash
cd packages/infrastructure
npm run build                 # Compile TypeScript
npm run watch                 # Watch mode compilation
npm run synth                 # Synthesize CloudFormation templates
npm run bootstrap             # Bootstrap CDK (first time only)
npm run deploy                # Deploy to AWS
npm run destroy               # Destroy AWS resources
npm run diff                  # Show deployment diff
npm run test                  # Run Jest tests
```

## Code Quality Tools

- **ESLint**: TypeScript, React, and React Hooks rules
- **Prettier**: Code formatting with consistent style
- **TypeScript**: Strict type checking enabled