# Marketplace Code Walkthrough: Authentication & Data Flow

## 🏗️ Infrastructure Setup (CDK)

### 1. Cognito User Pool Configuration
```typescript
// packages/infrastructure/lib/auth-stack.ts
export class AuthStack extends Construct {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient

  constructor(scope: Construct, id: string, props: { userTableName: string }) {
    // User Pool with custom attributes for roles
    this.userPool = new cognito.UserPool(this, 'MarketplaceUserPool', {
      userPoolName: 'marketplace-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      
      // Post-confirmation trigger creates DDB profile
      lambdaTriggers: {
        postConfirmation: this.postConfirmationFunction,
      },
      
      // Custom attributes stored in JWT
      customAttributes: {
        role: new cognito.StringAttribute({ minLen: 1, maxLen: 20 }),
        company: new cognito.StringAttribute({ minLen: 0, maxLen: 100 }),
        partnerStatus: new cognito.StringAttribute({ minLen: 0, maxLen: 20 }),
      },
      
      // Security settings
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    })

    // Client configuration for web app
    this.userPoolClient = new cognito.UserPoolClient(this, 'MarketplaceUserPoolClient', {
      userPool: this.userPool,
      generateSecret: false, // Public client for SPA
      authFlows: {
        userSrp: true,
        userPassword: true,
        adminUserPassword: true,
      },
      // Token validity periods
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    })
  }
}
```

### 2. DynamoDB Tables with GSIs
```typescript
// packages/infrastructure/lib/data-stack.ts
export class DataStack extends Construct {
  constructor(scope: Construct, id: string) {
    // Users table with multiple access patterns
    this.userTable = new dynamodb.Table(this, 'UserTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    })

    // GSI for email lookups (login, uniqueness)
    this.userTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    })

    // GSI for role-based queries (admin dashboard)
    this.userTable.addGlobalSecondaryIndex({
      indexName: 'RoleIndex',
      partitionKey: { name: 'role', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // Solutions table with partner and category access
    this.solutionTable = new dynamodb.Table(this, 'SolutionTable', {
      partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
    })

    // GSI for partner's solutions
    this.solutionTable.addGlobalSecondaryIndex({
      indexName: 'PartnerIndex',
      partitionKey: { name: 'partnerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // GSI for category browsing
    this.solutionTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    })
  }
}
```

### 3. API Gateway with Cognito Authorizer
```typescript
// packages/infrastructure/lib/api-stack.ts
export class ApiStack extends Construct {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    // API Gateway with CORS
    this.api = new apigateway.RestApi(this, 'MarketplaceApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    })

    // Cognito authorizer for JWT validation
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this, 'CognitoAuthorizer', {
        cognitoUserPools: [props.userPool],
        identitySource: 'method.request.header.Authorization',
      }
    )

    // Protected routes use the authorizer
    profileResource.addMethod('GET', 
      new apigateway.LambdaIntegration(profileFunction), {
        authorizer: cognitoAuthorizer, // JWT validation here
      }
    )
  }
}
```

## 🔐 Backend Lambda Functions

### 1. Post-Confirmation Trigger
```javascript
// packages/infrastructure/lambda/auth/post-confirmation.js
exports.handler = async (event) => {
  const { userAttributes } = event.request
  const userName = event.userName // Cognito user ID
  
  // Create DDB profile from Cognito attributes
  const userProfile = {
    userId: userName,
    email: userAttributes.email,
    emailVerified: true,
    role: userAttributes['custom:role'] || 'customer',
    profile: {
      name: `${userAttributes.given_name || ''} ${userAttributes.family_name || ''}`.trim(),
      email: userAttributes.email,
      company: userAttributes['custom:company'] || ''
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // Store in DynamoDB
  await docClient.send(new PutCommand({
    TableName: process.env.USER_TABLE_NAME,
    Item: userProfile
  }))

  return event // Must return event for Cognito
}
```

### 2. Profile Management with JWT Claims
```javascript
// packages/infrastructure/lambda/auth/profile.js
exports.handler = async (event) => {
  // Extract user ID from JWT claims (validated by API Gateway)
  const userId = event.requestContext?.authorizer?.claims?.sub
  
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  if (event.httpMethod === 'GET') {
    // Get user profile from DynamoDB
    const result = await docClient.send(new GetCommand({
      TableName: process.env.USER_TABLE_NAME,
      Key: { userId },
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({ user: result.Item }),
    }
  }

  if (event.httpMethod === 'PUT') {
    // Update profile with validation
    const body = JSON.parse(event.body || '{}')
    const { profile } = body

    const validationErrors = validateUserProfile(profile)
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Validation failed', details: validationErrors }),
      }
    }

    // Update in DynamoDB
    const result = await docClient.send(new UpdateCommand({
      TableName: process.env.USER_TABLE_NAME,
      Key: { userId },
      UpdateExpression: 'SET profile = :profile, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':profile': profile,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({ user: result.Attributes }),
    }
  }
}
```

### 3. Role-Based Authorization
```javascript
// packages/infrastructure/lambda/auth/user-management.js
exports.handler = async (event) => {
  // Extract user claims from JWT
  const requesterId = event.requestContext?.authorizer?.claims?.sub
  const requesterRole = event.requestContext?.authorizer?.claims?.['custom:role']

  // Admin-only operations
  if (event.resource.includes('/admin/users')) {
    if (requesterRole !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required' }),
      }
    }

    if (event.httpMethod === 'GET') {
      // List users with role filtering
      const { role, status } = event.queryStringParameters || {}
      
      let params = {
        TableName: process.env.USER_TABLE_NAME,
      }

      if (role) {
        // Use RoleIndex GSI for efficient role queries
        params.IndexName = 'RoleIndex'
        params.KeyConditionExpression = '#role = :role'
        params.ExpressionAttributeNames = { '#role': 'role' }
        params.ExpressionAttributeValues = { ':role': role }
        
        const result = await docClient.send(new QueryCommand(params))
        return {
          statusCode: 200,
          body: JSON.stringify({ users: result.Items }),
        }
      }
    }
  }

  // Partner-only operations
  if (event.resource.includes('/partner/')) {
    if (!['partner', 'admin'].includes(requesterRole)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Partner access required' }),
      }
    }
  }
}
```

## 🎯 Frontend Implementation

### 1. Amplify Configuration
```typescript
// packages/frontend/src/services/auth.ts
import { Amplify } from 'aws-amplify'
import { signIn, signUp, confirmSignUp, fetchAuthSession } from 'aws-amplify/auth'

// Configure Amplify with Cognito settings
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.VITE_USER_POOL_ID,
      userPoolClientId: process.env.VITE_USER_POOL_CLIENT_ID,
      loginWith: { email: true },
      signUpVerificationMethod: 'code',
      userAttributes: { email: { required: true } },
    }
  }
})
```

### 2. Authentication Service
```typescript
// packages/frontend/src/services/auth.ts
export const authService = {
  async login(credentials: LoginCredentials) {
    // Sign in with Cognito
    const result = await signIn({
      username: credentials.email,
      password: credentials.password,
    })

    if (result.isSignedIn) {
      // Get JWT tokens
      const session = await fetchAuthSession()
      const idToken = session.tokens?.idToken?.toString()
      const accessToken = session.tokens?.accessToken?.toString()
      
      if (idToken) {
        // Try to get full profile from API
        const userResponse = await fetch(`${API_URL}/user/profile`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          this.setToken(idToken)
          this.setStoredUser(userData.user)
          return { user: userData.user, token: idToken }
        } else {
          // Fallback to JWT claims if API fails
          const userInfo = session.tokens?.idToken?.payload
          const user: User = {
            userId: userInfo.sub as string,
            email: userInfo.email as string,
            role: (userInfo['custom:role'] as any) || 'customer',
            profile: {
              name: `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
              company: (userInfo['custom:company'] as string) || '',
            },
            // ... other fields
          }
          return { user, token: idToken }
        }
      }
    }
  },

  async register(data: RegisterData) {
    const { userId } = await signUp({
      username: data.email,
      password: data.password,
      options: {
        userAttributes: {
          email: data.email,
          given_name: data.name.split(' ')[0],
          family_name: data.name.split(' ').slice(1).join(' '),
          'custom:role': data.role || 'customer',
          'custom:company': data.company || '',
        },
      },
    })
    // Returns user ID for confirmation
    return { userId }
  },

  // Token management
  getToken(): string | null {
    return localStorage.getItem('authToken')
  },

  setToken(token: string): void {
    localStorage.setItem('authToken', token)
  },
}
```

### 3. React Context for State Management
```typescript
// packages/frontend/src/contexts/AuthContext.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authService.getToken()
        const storedUser = authService.getStoredUser()

        if (token && storedUser) {
          // Use cached user data for fast startup
          dispatch({ type: 'SET_USER', payload: storedUser })
        } else {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } catch (error) {
        // Clear invalid tokens
        authService.logout()
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const { user, token } = await authService.login(credentials)
      
      // Store token and user data
      authService.setToken(token)
      authService.setStoredUser(user)
      
      dispatch({ type: 'SET_USER', payload: user })
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### 4. Protected Route Component
```typescript
// packages/frontend/src/components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'customer' | 'partner' | 'admin'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Role-based access control
  if (requiredRole && user?.role !== requiredRole) {
    if (requiredRole === 'admin' && user?.role !== 'admin') {
      return <Navigate to="/unauthorized" replace />
    }
    if (requiredRole === 'partner' && !['partner', 'admin'].includes(user?.role)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <>{children}</>
}
```

## 🔄 Data Flow Examples

### 1. User Registration Flow
```typescript
// 1. Frontend form submission
const handleRegister = async (formData) => {
  try {
    await register({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: formData.role,
      company: formData.company
    })
    // Redirect to verification page
  } catch (error) {
    setError(error.message)
  }
}

// 2. Cognito creates user with custom attributes
// 3. Post-confirmation trigger creates DDB profile
// 4. User can now login and access protected routes
```

### 2. API Request with JWT
```typescript
// Frontend API call
const fetchUserProfile = async () => {
  const token = authService.getToken()
  const response = await fetch(`${API_URL}/user/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  return response.json()
}

// Backend receives validated JWT claims
// event.requestContext.authorizer.claims = {
//   sub: "user-uuid",
//   email: "user@example.com", 
//   "custom:role": "partner"
// }
```

This architecture provides a complete, secure authentication system with proper separation between authentication (Cognito) and application data (DynamoDB), enabling scalable role-based access control.
