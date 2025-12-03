import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

interface ApiStackProps {
  userPool: cognito.UserPool
  userTable: dynamodb.Table
  solutionTable: dynamodb.Table
  partnerApplicationTable: dynamodb.Table
  tokenTable: dynamodb.Table
  userSolutionEntitlementsTable: dynamodb.Table
  paymentTransactionsTable: dynamodb.Table
  userSessionsTable: dynamodb.Table // NEW: Analytics tables
  apiMetricsTable: dynamodb.Table // NEW: Analytics tables
  assetsBucket: s3.Bucket
}

export class ApiStack extends Construct {
  public readonly api: apigateway.RestApi

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id)

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'MarketplaceApi', {
      restApiName: 'Marketplace API',
      description: 'API for marketplace platform',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
      deployOptions: {
        stageName: 'prod',
      },
    })

    // Add CORS support for 401 responses
    this.api.addGatewayResponse('Unauthorized', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    })

    // Create Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      identitySource: 'method.request.header.Authorization',
    })

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    })

    // Grant DynamoDB permissions
    props.userTable.grantReadWriteData(lambdaRole)
    props.solutionTable.grantReadWriteData(lambdaRole)
    props.partnerApplicationTable.grantReadWriteData(lambdaRole)
    props.tokenTable.grantReadWriteData(lambdaRole)
    props.userSolutionEntitlementsTable.grantReadWriteData(lambdaRole)
    props.paymentTransactionsTable.grantReadWriteData(lambdaRole)
    props.userSessionsTable.grantReadWriteData(lambdaRole) // NEW: Analytics tables
    props.assetsBucket.grantReadWrite(lambdaRole)

    // Grant Cognito permissions for user management
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:AdminDisableUser',
        'cognito-idp:AdminEnableUser',
        'cognito-idp:AdminGetUser',
      ],
      resources: [props.userPool.userPoolArn],
    }))

    // Grant Secrets Manager permissions for PhonePe credentials
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
      ],
      resources: ['*'], // Can be restricted to specific secret ARN if needed
    }))

    // Grant SES permissions for email notifications
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ses:SendEmail',
        'ses:SendRawEmail',
      ],
      resources: ['*'], // You might want to restrict this to specific email addresses
    }))

    // Grant Bedrock permissions for AI insights
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
      ],
      resources: [
        'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0',
        'arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0'
      ],
    }))
    
    // Grant CloudWatch permissions for API metrics
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:ListMetrics'
      ],
      resources: ['*'],
    }))

    // Auth Lambda Functions
    const registerFunction = new lambda.Function(this, 'RegisterFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'register.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE_NAME: props.userTable.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        TOKEN_SECRET: 'marketplace-control-plane-secret-2025', // In production, use AWS Secrets Manager
      },
      role: lambdaRole,
    })

    const profileFunction = new lambda.Function(this, 'ProfileFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'profile.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE_NAME: props.userTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
    })

    // User Management Lambda Function
    const userManagementFunction = new lambda.Function(this, 'UserManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'user-management.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE_NAME: props.userTable.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Partner Application Lambda Function
    const partnerApplicationFunction = new lambda.Function(this, 'PartnerApplicationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'partner-application.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        PARTNER_APPLICATION_TABLE_NAME: props.partnerApplicationTable.tableName,
        USER_TABLE_NAME: props.userTable.tableName,
        FROM_EMAIL: 'noreply@marketplace.com', // Update with your verified SES email
        ADMIN_EMAIL: 'admin@marketplace.com', // Update with admin email
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Generate Solution Token Lambda Function
    const generateSolutionTokenFunction = new lambda.Function(this, 'GenerateSolutionTokenFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-token-generator.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        TOKEN_TABLE: props.tokenTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Solution Token Validator Lambda Function
    const validateTokenFunction = new lambda.Function(this, 'SolutionTokenValidatorFunction2', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-token-validator.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE: props.userTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Payment Lambda Function
    const paymentInitiateFunction = new lambda.Function(this, 'PaymentInitiateFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'initiate.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE_NAME: props.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        SOLUTION_TABLE_NAME: props.solutionTable.tableName,
        API_BASE_URL: `https://${this.api.restApiId}.execute-api.us-west-1.amazonaws.com/prod`,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Payment Status Lambda Function
    const paymentStatusFunction = new lambda.Function(this, 'PaymentStatusFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'status.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE_NAME: props.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Upgrade to Pro Lambda Function
    const upgradeToProFunction = new lambda.Function(this, 'UpgradeToProFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'upgrade-to-pro.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE: props.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        API_BASE_URL: `https://${this.api.restApiId}.execute-api.us-west-1.amazonaws.com/prod`,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Payment Callback Lambda Function
    const paymentCallbackFunction = new lambda.Function(this, 'PaymentCallbackFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'payment-callback.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE: props.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Check User Limits Lambda Function
    const checkUserLimitsFunction = new lambda.Function(this, 'CheckUserLimitsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'check-user-limits.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE: props.userTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Increment Usage Lambda Function
    const incrementUsageFunction = new lambda.Function(this, 'IncrementUsageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'increment-usage.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE: props.userTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Catalog Lambda Functions
    const catalogFunction = new lambda.Function(this, 'CatalogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'catalog.handler',
      code: lambda.Code.fromAsset('lambda/catalog'),
      environment: {
        SOLUTION_TABLE_NAME: props.solutionTable.tableName,
        USERS_TABLE_NAME: props.userTable.tableName,
        ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Solution Management Lambda Function
    const solutionManagementFunction = new lambda.Function(this, 'SolutionManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-management.handler',
      code: lambda.Code.fromAsset('lambda/catalog'),
      environment: {
        SOLUTION_TABLE_NAME: props.solutionTable.tableName,
        USER_TABLE_NAME: props.userTable.tableName,
        ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
        FROM_EMAIL: 'noreply@marketplace.com',
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Admin Lambda Function
    const adminFunction = new lambda.Function(this, 'AdminFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'admin.handler',
      code: lambda.Code.fromAsset('lambda/admin'),
      environment: {
        USERS_TABLE: props.userTable.tableName,
        SOLUTIONS_TABLE: props.solutionTable.tableName,
        PARTNER_APPLICATION_TABLE_NAME: props.partnerApplicationTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Token Management Lambda Function
    const tokenManagerFunction = new lambda.Function(this, 'TokenManagerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'token-manager.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        TOKEN_TABLE_NAME: props.tokenTable.tableName,
        USER_TABLE_NAME: props.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Control Plane Token Generation Lambda Function
    const solutionTokenGeneratorFunction = new lambda.Function(this, 'SolutionTokenGeneratorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-token-generator.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        TOKEN_SECRET: 'marketplace-control-plane-secret-2025', // In production, use AWS Secrets Manager
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Control Plane Token Validation Lambda Function
    const solutionTokenValidatorFunction = new lambda.Function(this, 'SolutionTokenValidatorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-token-validator.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        USER_SESSIONS_TABLE_NAME: props.userSessionsTable.tableName,
        ENABLE_LOCATION_TRACKING: 'true',
        IP_SALT: 'marketplace-location-salt-2025'
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // PhonePe Payment Functions
    const phonePeWebhookFunction = new lambda.Function(this, 'PhonePeWebhookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'phonepe-webhook.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        USER_TABLE: props.userTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        TOKEN_SECRET: 'marketplace-control-plane-secret-2025',
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Cashfree Webhook Function
    const cashfreeWebhookFunction = new lambda.Function(this, 'CashfreeWebhookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cashfree-webhook.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        USER_TABLE: props.userTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        SOLUTION_TABLE_NAME: props.solutionTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    const paymentReconciliationFunction = new lambda.Function(this, 'PaymentReconciliationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'payment-reconciliation.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        USER_TABLE: props.userTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(300), // 5 minutes for processing multiple payments
    })

    const phonePeReconciliationFunction = new lambda.Function(this, 'PhonePeReconciliationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'phonepe-reconciliation.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        USER_TABLE: props.userTable.tableName,
        PHONEPE_ENVIRONMENT: 'sandbox', // Change to 'production' for live
        PHONEPE_AUTH_TOKEN: 'your-phonepe-auth-token', // Use AWS Secrets Manager in production
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
    })

    // Analytics Lambda Functions
    const businessMetricsFunction = new lambda.Function(this, 'BusinessMetricsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'business-metrics.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        USER_TABLE: props.userTable.tableName,
        MARKETPLACE_USERS_TABLE: props.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        USER_SESSIONS_TABLE: props.userSessionsTable.tableName
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    const geographicAnalyticsFunction = new lambda.Function(this, 'GeographicAnalyticsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'geographic-analytics.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        USER_TABLE: props.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        USER_SESSIONS_TABLE: props.userSessionsTable.tableName
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    const usageAnalyticsFunction = new lambda.Function(this, 'UsageAnalyticsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'usage-analytics.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        USER_SESSIONS_TABLE: props.userSessionsTable.tableName
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    const msmeKpiFunction = new lambda.Function(this, 'MsmeKpiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'msme-kpis.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        USER_TABLE: props.userTable.tableName,
        MARKETPLACE_USERS_TABLE: props.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        USER_SESSIONS_TABLE: props.userSessionsTable.tableName
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // API Routes
    const authApi = this.api.root.addResource('auth')
    const catalogApi = this.api.root.addResource('catalog')
    const userApi = this.api.root.addResource('user', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date', 
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    })
    const adminApi = this.api.root.addResource('admin')
    const partnerApi = this.api.root.addResource('partner')
    const paymentsApi = this.api.root.addResource('payments', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent'
        ],
      },
    })
    const apiResource = this.api.root.addResource('api')

    // Payment routes
    paymentsApi.addResource('initiate').addMethod('POST', new apigateway.LambdaIntegration(paymentInitiateFunction), {
      authorizer: cognitoAuthorizer,
    })
    paymentsApi.addResource('status').addResource('{transactionId}').addMethod('GET', new apigateway.LambdaIntegration(paymentStatusFunction))
    paymentsApi.addResource('upgrade-to-pro').addMethod('POST', new apigateway.LambdaIntegration(upgradeToProFunction))
    
    // PhonePe webhook route (no auth required)
    const phonePeWebhookResource = paymentsApi.addResource('phonepe-webhook')
    phonePeWebhookResource.addMethod('POST', new apigateway.LambdaIntegration(phonePeWebhookFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })

    // Cashfree webhook route (no auth required)
    const cashfreeWebhookResource = paymentsApi.addResource('cashfree-webhook')
    cashfreeWebhookResource.addMethod('POST', new apigateway.LambdaIntegration(cashfreeWebhookFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })

    // PhonePe reconciliation route (protected)
    paymentsApi.addResource('reconciliation').addMethod('POST', new apigateway.LambdaIntegration(phonePeReconciliationFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Payment callback - no auth required for webhooks
    const callbackResource = paymentsApi.addResource('callback')
    callbackResource.addMethod('GET', new apigateway.LambdaIntegration(paymentCallbackFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    }) // For direct callbacks
    callbackResource.addMethod('POST', new apigateway.LambdaIntegration(paymentCallbackFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    }) // For PhonePe webhooks

    // User limits and usage tracking routes (for FAISS integration)
    apiResource.addResource('check-user-limits').addMethod('POST', new apigateway.LambdaIntegration(checkUserLimitsFunction))
    apiResource.addResource('increment-usage').addMethod('POST', new apigateway.LambdaIntegration(incrementUsageFunction))

    // Auth routes
    authApi.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(registerFunction))
    
    // Control Plane API routes
    apiResource.addResource('generate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(generateSolutionTokenFunction))
    apiResource.addResource('generate-token').addMethod('POST', new apigateway.LambdaIntegration(generateSolutionTokenFunction)) // Frontend compatibility
    apiResource.addResource('validate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(solutionTokenValidatorFunction))
    
    // User routes (protected)
    const profileResource = userApi.addResource('profile')
    profileResource.addMethod('GET', new apigateway.LambdaIntegration(profileFunction), {
      authorizer: cognitoAuthorizer,
    })
    profileResource.addMethod('PUT', new apigateway.LambdaIntegration(profileFunction), {
      authorizer: cognitoAuthorizer,
    })

    // User management routes
    const usersResource = userApi.addResource('{userId}')
    usersResource.addMethod('GET', new apigateway.LambdaIntegration(userManagementFunction))
    
    // Admin user management routes (protected)
    const adminUsersResource = adminApi.addResource('users')
    adminUsersResource.addMethod('GET', new apigateway.LambdaIntegration(userManagementFunction), {
      authorizer: cognitoAuthorizer,
    })
    adminUsersResource.addResource('{userId}').addMethod('PUT', new apigateway.LambdaIntegration(userManagementFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Partner application routes
    const applicationsResource = partnerApi.addResource('applications')
    applicationsResource.addMethod('POST', new apigateway.LambdaIntegration(partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    applicationsResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    const applicationResource = applicationsResource.addResource('{applicationId}')
    applicationResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    applicationResource.addMethod('PUT', new apigateway.LambdaIntegration(partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Admin partner application routes
    const adminApplicationsResource = adminApi.addResource('applications')
    adminApplicationsResource.addMethod('GET', new apigateway.LambdaIntegration(adminFunction), {
      authorizer: cognitoAuthorizer,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
        {
          statusCode: '401',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        }
      ]
    })
    adminApplicationsResource.addResource('{applicationId}').addMethod('PUT', new apigateway.LambdaIntegration(adminFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Catalog routes (public)
    catalogApi.addMethod('GET', new apigateway.LambdaIntegration(catalogFunction))
    catalogApi.addResource('search').addMethod('GET', new apigateway.LambdaIntegration(catalogFunction))
    catalogApi.addResource('categories').addMethod('GET', new apigateway.LambdaIntegration(catalogFunction))
    catalogApi.addResource('{solutionId}').addMethod('GET', new apigateway.LambdaIntegration(catalogFunction))
    
    // Image upload route (protected)
    catalogApi.addResource('upload-image').addMethod('POST', new apigateway.LambdaIntegration(catalogFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Partner solution management routes (protected)
    const partnerSolutionsResource = partnerApi.addResource('solutions')
    partnerSolutionsResource.addMethod('POST', new apigateway.LambdaIntegration(catalogFunction), {
      authorizer: cognitoAuthorizer,
    })
    partnerSolutionsResource.addMethod('GET', new apigateway.LambdaIntegration(catalogFunction), {
      authorizer: cognitoAuthorizer,
    })
    const partnerSolutionResource = partnerSolutionsResource.addResource('{solutionId}')
    partnerSolutionResource.addMethod('PUT', new apigateway.LambdaIntegration(catalogFunction), {
      authorizer: cognitoAuthorizer,
    })
    partnerSolutionResource.addMethod('DELETE', new apigateway.LambdaIntegration(catalogFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Admin solution management routes (protected)
    const adminSolutionsResource = adminApi.addResource('solutions')
    adminSolutionsResource.addMethod('GET', new apigateway.LambdaIntegration(adminFunction), {
      authorizer: cognitoAuthorizer,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
        {
          statusCode: '401',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        }
      ]
    })
    const adminSolutionResource = adminSolutionsResource.addResource('{solutionId}')
    adminSolutionResource.addMethod('PUT', new apigateway.LambdaIntegration(adminFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    // Admin migration routes
    const adminMigrateResource = adminApi.addResource('migrate-user-countries')
    adminMigrateResource.addMethod('POST', new apigateway.LambdaIntegration(adminFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Token Management API Routes (for FAISS integration)
    const trackUsageResource = apiResource.addResource('track-usage')
    trackUsageResource.addMethod('POST', new apigateway.LambdaIntegration(tokenManagerFunction))

    // Admin token management routes
    const userTokensResource = apiResource.addResource('user-tokens').addResource('{userId}')
    userTokensResource.addMethod('GET', new apigateway.LambdaIntegration(tokenManagerFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Analytics API Routes (protected)
    const analyticsApi = apiResource.addResource('analytics')
    analyticsApi.addResource('business-metrics').addMethod('GET', new apigateway.LambdaIntegration(businessMetricsFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    // Public founder dashboard endpoint (no auth required)
    const founderApi = apiResource.addResource('founder')
    founderApi.addResource('metrics').addMethod('GET', new apigateway.LambdaIntegration(businessMetricsFunction))
    analyticsApi.addResource('geographic').addMethod('GET', new apigateway.LambdaIntegration(geographicAnalyticsFunction), {
      authorizer: cognitoAuthorizer,
    })
    analyticsApi.addResource('usage').addMethod('GET', new apigateway.LambdaIntegration(usageAnalyticsFunction), {
      authorizer: cognitoAuthorizer,
    })
    analyticsApi.addResource('msme-kpis').addMethod('GET', new apigateway.LambdaIntegration(msmeKpiFunction), {
      authorizer: cognitoAuthorizer,
    })

  }
}