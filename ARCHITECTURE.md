# Marketplace App Architecture

## 🏗️ Stack Structure (4 Main Components)

```
MarketplaceInfrastructureStack
├── DataStack        - Storage & Database Layer
├── AuthStack        - Authentication & Authorization  
├── ApiStack         - Business Logic & API Endpoints
└── FrontendStack    - Web UI & Content Delivery
```

## 📊 Data Layer (DataStack)

### DynamoDB Tables
- **UserTable** - User profiles, roles (customer/partner/admin)
- **SolutionTable** - Marketplace catalog items
- **PartnerApplicationTable** - Partner onboarding requests
- **SessionTable** - User sessions (TTL enabled)

### Storage
- **S3 Assets Bucket** - Solution images, documents
- **PostgreSQL RDS** - Relational data (future use)

## 🔐 Authentication Layer (AuthStack)

### Cognito Setup
- **User Pool** - User management & authentication
- **User Pool Client** - Frontend integration
- **Google OAuth** - Social login provider
- **Hosted UI** - Pre-built login pages

### Lambda Functions
- **PostConfirmationFunction** - Auto-create user records in DynamoDB

## 🚀 API Layer (ApiStack)

### API Gateway REST API
- **CORS enabled** for frontend integration
- **JWT authorization** via Cognito

### Lambda Functions by Domain

#### Authentication (`/auth/*`)
- **ProfileFunction** - Get/update user profiles
- **RegisterFunction** - User registration
- **UserManagementFunction** - Admin user operations
- **PartnerApplicationFunction** - Partner application CRUD

#### Catalog (`/catalog/*`)  
- **CatalogFunction** - Browse solutions, search, filtering
- **SolutionManagementFunction** - Partner solution CRUD

#### Admin (`/admin/*`)
- **AdminFunction** - Admin dashboard, approvals

#### Payments (`/payments/*`)
- **InitiateFunction** - Payment processing
- **CompleteFunction** - Payment completion

## 🌐 Frontend Layer (FrontendStack)

### Static Website Hosting
- **S3 Bucket** - React app build files
- **CloudFront Distribution** - Global CDN
- **Custom Domain** - Professional URL (optional)

## 🔄 Data Flow Examples

### User Registration
```
User → CloudFront → S3 (React App) → API Gateway → RegisterFunction → Cognito → PostConfirmationFunction → UserTable
```

### Partner Application
```
Partner → API Gateway → PartnerApplicationFunction → PartnerApplicationTable → AdminFunction (approval) → UserTable (role update)
```

### Solution Browsing
```
Customer → API Gateway → CatalogFunction → SolutionTable → S3 Assets (images)
```

## 🔑 Key Design Patterns

### Multi-Tenant Architecture
- **Role-based access** (customer/partner/admin)
- **Data isolation** via userId/partnerId
- **Feature flags** per user tier

### Event-Driven Updates
- **Cognito triggers** → Auto user creation
- **DynamoDB streams** → Audit logging (future)
- **S3 events** → Asset processing (future)

### Security Best Practices
- **JWT tokens** for API authentication
- **IAM roles** with least privilege
- **Encryption at rest** (DynamoDB, S3)
- **HTTPS only** via CloudFront

## 📁 Code Organization

```
packages/
├── infrastructure/          # CDK Infrastructure
│   ├── lib/                # Stack definitions
│   └── lambda/             # Lambda function code
│       ├── auth/           # Authentication functions
│       ├── catalog/        # Catalog functions  
│       ├── admin/          # Admin functions
│       └── payments/       # Payment functions
└── frontend/               # React application
    ├── src/
    │   ├── components/     # Reusable UI components
    │   ├── pages/          # Route components
    │   ├── services/       # API clients
    │   └── types/          # TypeScript definitions
    └── dist/               # Build output
```

## 🚀 Deployment Flow

1. **CDK Deploy** → Creates all AWS resources
2. **Frontend Build** → Compiles React app  
3. **S3 Upload** → Deploys static files
4. **CloudFront Invalidation** → Clears CDN cache

## 💡 Key Features

- **Multi-role system** (Customer, Partner, Admin)
- **Partner onboarding** with approval workflow
- **Solution marketplace** with search/filtering
- **Asset management** for solution media
- **Payment integration** ready
- **Admin dashboard** for management
- **Responsive design** via React
