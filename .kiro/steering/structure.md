# Project Structure

## Monorepo Organization

```
marketplace-platform/
├── packages/                   # Workspace packages
│   ├── frontend/              # React application
│   └── infrastructure/        # AWS CDK infrastructure
├── .kiro/                     # Kiro AI assistant configuration
│   ├── settings/              # MCP and other settings
│   ├── specs/                 # Feature specifications
│   └── steering/              # AI guidance documents
├── logs/                      # Application logs
└── [config files]            # Root-level configuration
```

## Frontend Package (`packages/frontend/`)

```
frontend/
├── src/
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Page-level components
│   │   ├── SolutionsPage.tsx
│   │   ├── SubscriptionsPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── CartPage.tsx
│   │   └── SolutionDetailPage.tsx
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── package.json              # Frontend dependencies
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
```

## Infrastructure Package (`packages/infrastructure/`)

```
infrastructure/
├── lib/                      # CDK stacks and constructs
│   ├── marketplace-api-stack.ts        # API Gateway and Lambda
│   ├── marketplace-database-stack.ts   # DynamoDB tables
│   └── marketplace-infrastructure-stack.ts  # Main infrastructure
├── bin/                      # CDK app entry point
├── lambda/                   # Lambda function code
├── package.json              # Infrastructure dependencies
├── cdk.json                  # CDK configuration
└── tsconfig.json             # TypeScript configuration
```

## Configuration Files

### Root Level
- `package.json` - Workspace configuration and shared scripts
- `.eslintrc.json` - ESLint rules for all packages
- `.prettierrc` - Code formatting configuration
- `.gitignore` - Git ignore patterns
- `README.md` - Project documentation

### Environment Configuration
- `.env.example` - Environment variable template
- `.env.local` - Local development environment variables

### Development Scripts
- `setup-dev-env.ps1` - Development environment setup
- `verify-installation.ps1` - Installation verification
- Various AWS and GitHub setup scripts

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (e.g., `Header.tsx`, `SolutionDetailPage.tsx`)
- **Directories**: lowercase with hyphens for multi-word (e.g., `components/`, `solution-detail/`)
- **Configuration files**: lowercase with dots (e.g., `.eslintrc.json`, `vite.config.ts`)

### Code Structure
- **React Components**: PascalCase function components
- **Hooks**: camelCase starting with `use` prefix
- **Utilities**: camelCase functions
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase with descriptive names

## Package Scoping

All packages use the `@marketplace` scope:
- `@marketplace/frontend` - React application
- `@marketplace/infrastructure` - CDK infrastructure

## Development Workflow

1. **Root level**: Install dependencies and run workspace commands
2. **Package level**: Navigate to specific package for focused development
3. **Cross-package**: Use workspace commands from root for coordinated operations

## Key Architectural Patterns

- **Monorepo**: Shared tooling and coordinated development
- **Infrastructure as Code**: CDK for reproducible AWS deployments
- **Component-based UI**: Reusable React components with TypeScript
- **API-first**: Lambda functions with API Gateway for backend services