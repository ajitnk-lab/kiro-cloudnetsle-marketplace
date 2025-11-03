# Marketplace Authentication & Data Architecture Analysis

## 🔐 Authentication Flow Overview

### 1. Cognito User Pool Configuration

```typescript
// packages/infrastructure/lib/auth-stack.ts
const userPool = new cognito.UserPool(this, 'MarketplaceUserPool', {
  userPoolName: 'marketplace-users',
  selfSignUpEnabled: true,
  signInAliases: { email: true },
  autoVerify: { email: true },
  lambdaTriggers: {
    postConfirmation: this.postConfirmationFunction, // Creates DDB profile
  },
  customAttributes: {
    role: new cognito.StringAttribute({ minLen: 1, maxLen: 20 }),
    company: new cognito.StringAttribute({ minLen: 0, maxLen: 100 }),
    partnerStatus: new cognito.StringAttribute({ minLen: 0, maxLen: 20 }),
  }
})
```

### 2. User Roles & Permissions

**Role Hierarchy:**
- `customer` - Basic marketplace access, can browse/purchase
- `partner` - Can create/manage solutions, access partner dashboard  
- `admin` - Full platform management, user/solution moderation

**Role Storage:**
- **Cognito**: `custom:role` attribute in JWT token
- **DynamoDB**: `role` field in user profile for persistence

### 3. JWT Token Structure & Usage

**Token Types:**
- **ID Token**: Contains user claims (role, email, name) - used for authorization
- **Access Token**: For API access - used for authentication

**JWT Claims Structure:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com", 
  "given_name": "John",
  "family_name": "Doe",
  "custom:role": "partner",
  "custom:company": "Tech Corp",
  "aud": "client-id",
  "exp": 1699123456
}
```

**Frontend Token Handling:**
```typescript
// packages/frontend/src/services/auth.ts
const session = await fetchAuthSession()
const idToken = session.tokens?.idToken?.toString()
const accessToken = session.tokens?.accessToken?.toString()

// Use ID token for user info, access token for API calls
const response = await fetch(`${API_URL}/user/profile`, {
  headers: { 'Authorization': `Bearer ${idToken}` }
})
```

**Backend Token Validation:**
```javascript
// API Gateway Cognito Authorizer automatically validates JWT
const userId = event.requestContext?.authorizer?.claims?.sub
const userRole = event.requestContext?.authorizer?.claims?.['custom:role']

// Role-based access control
if (userRole !== 'admin') {
  return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
}
```

## 🗄️ DynamoDB Tables Architecture

### 1. Users Table (`UserTable`)

**Primary Key:** `userId` (String)

**Attributes:**
```json
{
  "userId": "cognito-user-uuid",
  "email": "user@example.com",
  "role": "customer|partner|admin", 
  "profile": {
    "name": "John Doe",
    "company": "Tech Corp"
  },
  "status": "active|suspended|pending",
  "marketplaceStatus": "pending|approved|rejected|active|none",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Global Secondary Indexes:**
- `EmailIndex`: Partition key `email` - for email lookups
- `RoleIndex`: Partition key `role`, Sort key `createdAt` - for role-based queries

### 2. Solutions Table (`SolutionTable`)

**Primary Key:** `solutionId` (String)

**Attributes:**
```json
{
  "solutionId": "solution-uuid",
  "partnerId": "partner-user-uuid",
  "name": "Solution Name",
  "description": "Solution description",
  "category": "AI/ML|DevOps|Security|Analytics",
  "pricing": {
    "model": "subscription|one-time",
    "amount": 99.99,
    "currency": "USD",
    "billingPeriod": "monthly|yearly"
  },
  "status": "draft|pending|approved|rejected|active|inactive",
  "images": ["s3-url-1", "s3-url-2"],
  "tags": ["ai", "machine-learning"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Global Secondary Indexes:**
- `PartnerIndex`: Partition key `partnerId`, Sort key `createdAt` - partner solutions
- `CategoryIndex`: Partition key `category`, Sort key `name` - category browsing
- `StatusIndex`: Partition key `status`, Sort key `updatedAt` - admin moderation

### 3. Partner Applications Table (`PartnerApplicationTable`)

**Primary Key:** `applicationId` (String)

**Attributes:**
```json
{
  "applicationId": "application-uuid",
  "userId": "user-uuid",
  "companyName": "Tech Corp",
  "businessType": "Software Development",
  "website": "https://techcorp.com",
  "description": "We build AI solutions",
  "status": "pending|approved|rejected",
  "submittedAt": "2024-01-01T00:00:00.000Z",
  "reviewedAt": "2024-01-01T00:00:00.000Z",
  "reviewedBy": "admin-user-uuid",
  "reviewNotes": "Application approved"
}
```

**Global Secondary Indexes:**
- `UserIndex`: Partition key `userId`, Sort key `submittedAt` - user applications
- `StatusIndex`: Partition key `status`, Sort key `submittedAt` - admin review queue

### 4. Session Table (`SessionTable`)

**Primary Key:** `sessionId` (String)

**Attributes:**
```json
{
  "sessionId": "session-uuid",
  "userId": "user-uuid", 
  "data": { "cartItems": [], "preferences": {} },
  "expiresAt": 1699123456,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**TTL:** `expiresAt` attribute for automatic cleanup

## 🔄 Authentication Flow Sequence

### Registration Flow
1. **Frontend**: User submits registration form
2. **Cognito**: Creates user with `custom:role` attribute
3. **Post-Confirmation Trigger**: Lambda creates DynamoDB profile
4. **Email Verification**: User confirms email
5. **Login**: User can now authenticate

### Login Flow  
1. **Frontend**: User submits credentials
2. **Cognito**: Validates and returns JWT tokens
3. **Frontend**: Stores tokens, extracts user info
4. **API Calls**: Include JWT in Authorization header
5. **API Gateway**: Cognito authorizer validates JWT
6. **Lambda**: Accesses user claims for authorization

### Role-Based Access Control
```javascript
// Lambda function authorization check
const requesterRole = event.requestContext?.authorizer?.claims?.['custom:role']

// Admin-only endpoints
if (resource.includes('/admin/') && requesterRole !== 'admin') {
  return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
}

// Partner-only endpoints  
if (resource.includes('/partner/') && !['partner', 'admin'].includes(requesterRole)) {
  return { statusCode: 403, body: JSON.stringify({ error: 'Partner access required' }) }
}
```

## 🛡️ Security Implementation

### Token Security
- **Short-lived tokens**: Access tokens expire in 1 hour
- **Refresh tokens**: Valid for 30 days
- **HTTPS only**: All API communication encrypted
- **CORS configured**: Restricted origins in production

### Data Protection
- **DynamoDB encryption**: AWS managed keys
- **S3 encryption**: Server-side encryption enabled
- **VPC isolation**: RDS in private subnets
- **IAM roles**: Least privilege access

### Input Validation
```javascript
const validateUserProfile = (profile) => {
  const errors = []
  if (!profile.name || profile.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long')
  }
  if (profile.company && profile.company.length > 100) {
    errors.push('Company name must be less than 100 characters')
  }
  return errors
}
```

## 🔧 Key Integration Points

### Frontend-Backend Communication
- **Authentication**: JWT tokens in Authorization header
- **Error handling**: Standardized error responses
- **CORS**: Configured for cross-origin requests
- **State management**: React Context + localStorage

### Cognito-DynamoDB Sync
- **Post-confirmation trigger**: Creates user profile
- **Role updates**: Sync between Cognito attributes and DDB
- **Status management**: Enable/disable users in both systems

### API Gateway Integration
- **Cognito authorizer**: Automatic JWT validation
- **Request context**: User claims available in Lambda
- **CORS preflight**: OPTIONS method handling
- **Error responses**: Consistent error format

This architecture provides a secure, scalable authentication system with proper role-based access control and efficient data storage patterns.
