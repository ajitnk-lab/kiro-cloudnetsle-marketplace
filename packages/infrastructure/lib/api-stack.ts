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
  transactionTable: dynamodb.Table
  userSolutionsTable: dynamodb.Table
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
    props.transactionTable.grantReadWriteData(lambdaRole)
    props.userSolutionsTable.grantReadWriteData(lambdaRole)
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

    // Grant SES permissions for email notifications
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ses:SendEmail',
        'ses:SendRawEmail',
      ],
      resources: ['*'], // You might want to restrict this to specific email addresses
    }))

    // Auth Lambda Functions
    const registerFunction = new lambda.Function(this, 'RegisterFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'register.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE_NAME: props.userTable.tableName,
        USER_POOL_ID: props.userPool.userPoolId,
      },
      role: lambdaRole,
    })

    const profileFunction = new lambda.Function(this, 'ProfileFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'profile.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE_NAME: props.userTable.tableName,
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

    // Catalog Lambda Functions
    const catalogFunction = new lambda.Function(this, 'CatalogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'catalog.handler',
      code: lambda.Code.fromAsset('lambda/catalog'),
      environment: {
        SOLUTION_TABLE_NAME: props.solutionTable.tableName,
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
        ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Payment Lambda Functions
    const paymentFunction = new lambda.Function(this, 'PaymentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'payment-handler.createPaymentRequest',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USERS_TABLE: props.userTable.tableName,
        SOLUTIONS_TABLE: props.solutionTable.tableName,
        TRANSACTIONS_TABLE: props.transactionTable.tableName,
        USER_SOLUTIONS_TABLE: props.userSolutionsTable.tableName,
        INSTAMOJO_API_KEY: 'test_api_key', // Replace with actual key in production
        INSTAMOJO_AUTH_TOKEN: 'test_auth_token', // Replace with actual token in production
        INSTAMOJO_ENDPOINT: 'https://test.instamojo.com/api/1.1/',
        FRONTEND_URL: 'https://dddzq9ul1ygr3.cloudfront.net',
        API_GATEWAY_URL: `https://${this.api.restApiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com/prod`,
        FROM_EMAIL: 'noreply@marketplace.com',
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    const paymentWebhookFunction = new lambda.Function(this, 'PaymentWebhookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'payment-handler.handleWebhook',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USERS_TABLE: props.userTable.tableName,
        SOLUTIONS_TABLE: props.solutionTable.tableName,
        TRANSACTIONS_TABLE: props.transactionTable.tableName,
        USER_SOLUTIONS_TABLE: props.userSolutionsTable.tableName,
        FRONTEND_URL: 'https://dddzq9ul1ygr3.cloudfront.net',
        FROM_EMAIL: 'noreply@marketplace.com',
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    const transactionStatusFunction = new lambda.Function(this, 'TransactionStatusFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'payment-handler.getTransactionStatus',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        TRANSACTIONS_TABLE: props.transactionTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    const userTransactionsFunction = new lambda.Function(this, 'UserTransactionsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'payment-handler.getUserTransactions',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        TRANSACTIONS_TABLE: props.transactionTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // API Routes
    const authApi = this.api.root.addResource('auth')
    const catalogApi = this.api.root.addResource('catalog')
    const userApi = this.api.root.addResource('user')
    const adminApi = this.api.root.addResource('admin')
    const partnerApi = this.api.root.addResource('partner')
    const paymentsApi = this.api.root.addResource('payments')

    // Auth routes
    authApi.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(registerFunction))
    
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
    const applicationIdResource = applicationsResource.addResource('{applicationId}')
    applicationIdResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    applicationIdResource.addMethod('PUT', new apigateway.LambdaIntegration(partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Admin partner application routes
    const adminApplicationsResource = adminApi.addResource('applications')
    adminApplicationsResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    adminApplicationsResource.addResource('{applicationId}').addMethod('PUT', new apigateway.LambdaIntegration(partnerApplicationFunction), {
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
    const partnerSolutionIdResource = partnerSolutionsResource.addResource('{solutionId}')
    partnerSolutionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(solutionManagementFunction), {
      authorizer: cognitoAuthorizer,
    })
    partnerSolutionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(solutionManagementFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Admin solution management routes (protected)
    const adminSolutionsResource = adminApi.addResource('solutions')
    adminSolutionsResource.addMethod('GET', new apigateway.LambdaIntegration(solutionManagementFunction), {
      authorizer: cognitoAuthorizer,
    })
    const adminSolutionIdResource = adminSolutionsResource.addResource('{solutionId}')
    adminSolutionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(solutionManagementFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Payment routes
    paymentsApi.addResource('create').addMethod('POST', new apigateway.LambdaIntegration(paymentFunction), {
      authorizer: cognitoAuthorizer,
    })
    paymentsApi.addResource('webhook').addMethod('POST', new apigateway.LambdaIntegration(paymentWebhookFunction))
    paymentsApi.addResource('transaction').addResource('{transactionId}').addMethod('GET', new apigateway.LambdaIntegration(transactionStatusFunction), {
      authorizer: cognitoAuthorizer,
    })
    paymentsApi.addResource('user').addResource('{userId}').addResource('transactions').addMethod('GET', new apigateway.LambdaIntegration(userTransactionsFunction), {
      authorizer: cognitoAuthorizer,
    })
  }
}