import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as ses from 'aws-cdk-lib/aws-ses'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export class DataConstruct extends Construct {
  // DynamoDB Tables
  public readonly userTable: dynamodb.Table
  public readonly solutionTable: dynamodb.Table
  public readonly sessionTable: dynamodb.Table
  public readonly partnerApplicationTable: dynamodb.Table
  public readonly tokenTable: dynamodb.Table
  public readonly userSolutionEntitlementsTable: dynamodb.Table
  public readonly paymentTransactionsTable: dynamodb.Table
  public readonly userSessionsTable: dynamodb.Table
  public readonly apiMetricsTable: dynamodb.Table
  public readonly subscriptionHistoryTable: dynamodb.Table
  public readonly companySettingsTable: dynamodb.Table

  // S3 Buckets
  public readonly assetsBucket: s3.Bucket
  public readonly invoiceBucket: s3.Bucket

  // Cognito
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient
  public readonly identityPool: cognito.CfnIdentityPool

  // Lambda Functions (all ~30 functions)
  public readonly paymentInitiateFunction: lambda.Function
  public readonly paymentStatusFunction: lambda.Function
  public readonly upgradeToProFunction: lambda.Function
  public readonly paymentCallbackFunction: lambda.Function
  public readonly cashfreeWebhookFunction: lambda.Function
  public readonly phonepeWebhookFunction: lambda.Function
  public readonly phonepeReconciliationFunction: lambda.Function
  public readonly invoiceGenerationFunction: lambda.Function
  public readonly catalogFunction: lambda.Function
  public readonly solutionManagementFunction: lambda.Function
  public readonly partnerApplicationFunction: lambda.Function
  public readonly adminFunction: lambda.Function
  public readonly userManagementFunction: lambda.Function
  public readonly profileFunction: lambda.Function
  public readonly registerFunction: lambda.Function
  public readonly tokenManagerFunction: lambda.Function
  public readonly solutionTokenGeneratorFunction: lambda.Function
  public readonly generateSolutionTokenFunction: lambda.Function
  public readonly solutionTokenValidatorFunction: lambda.Function
  public readonly checkUserLimitsFunction: lambda.Function
  public readonly incrementUsageFunctionCF29C1F7: lambda.Function
  public readonly usageAnalyticsFunction: lambda.Function
  public readonly businessMetricsFunction: lambda.Function
  public readonly geographicAnalyticsFunction: lambda.Function
  public readonly msmeKpiFunction: lambda.Function
  public readonly paymentReconciliationFunction: lambda.Function

  // Secrets
  public readonly phonepeSecret: secretsmanager.Secret

  constructor(scope: Construct, id: string, props?: {
    userPool?: cognito.UserPool
    userPoolClient?: cognito.UserPoolClient
  }) {
    super(scope, id)

    // DynamoDB Tables with environment-based names (no timestamps for data retention)
    const environment = 'prod' // Fixed environment to solve timestamp issue

    // DynamoDB Tables
    this.userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: `marketplace-users-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.userTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    })

    this.solutionTable = new dynamodb.Table(this, 'SolutionTable', {
      tableName: `marketplace-solutions-${environment}`,
      partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    })

    this.solutionTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    this.sessionTable = new dynamodb.Table(this, 'SessionTable', {
      tableName: `marketplace-sessions-${environment}`,
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.partnerApplicationTable = new dynamodb.Table(this, 'PartnerApplicationTable', {
      tableName: `marketplace-partner-applications-${environment}`,
      partitionKey: { name: 'applicationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.tokenTable = new dynamodb.Table(this, 'TokenTable', {
      tableName: `marketplace-tokens-${environment}`,
      partitionKey: { name: 'tokenId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.userSolutionEntitlementsTable = new dynamodb.Table(this, 'UserSolutionEntitlementsTable', {
      tableName: `marketplace-user-solution-entitlements-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.paymentTransactionsTable = new dynamodb.Table(this, 'PaymentTransactionsTable', {
      tableName: `marketplace-payment-transactions-${environment}`,
      partitionKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.userSessionsTable = new dynamodb.Table(this, 'UserSessionsTable', {
      tableName: `marketplace-user-sessions-${environment}`,
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.apiMetricsTable = new dynamodb.Table(this, 'ApiMetricsTable', {
      tableName: `marketplace-api-metrics-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.subscriptionHistoryTable = new dynamodb.Table(this, 'SubscriptionHistoryTable', {
      tableName: `marketplace-subscription-history-${environment}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.companySettingsTable = new dynamodb.Table(this, 'CompanySettingsTable', {
      tableName: `marketplace-company-settings-${environment}`,
      partitionKey: { name: 'settingKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // S3 Buckets
    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `marketplace-assets-${environment}-${cdk.Aws.REGION}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    })

    this.invoiceBucket = new s3.Bucket(this, 'InvoiceBucket', {
      bucketName: `marketplace-invoices-${environment}-${cdk.Aws.REGION}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Use UserPool from props (created in AuthStack) or create a fallback
    if (props?.userPool && props?.userPoolClient) {
      this.userPool = props.userPool
      this.userPoolClient = props.userPoolClient
    } else {
      // Fallback: Create UserPool if not provided (for backward compatibility)
      this.userPool = new cognito.UserPool(this, 'UserPool', {
        userPoolName: 'marketplace-users',
        selfSignUpEnabled: true,
        signInAliases: { email: true },
        autoVerify: { email: true },
        standardAttributes: {
          email: { required: true, mutable: true },
          givenName: { required: true, mutable: true },
          familyName: { required: true, mutable: true },
        },
        passwordPolicy: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: false,
        },
        accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      })

      this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
        userPool: this.userPool,
        generateSecret: false,
        authFlows: {
          adminUserPassword: true,
          userPassword: true,
          userSrp: true,
        },
      })
    }

    // Secrets
    this.phonepeSecret = new secretsmanager.Secret(this, 'PhonePeSecret', {
      secretName: 'marketplace/phonepe/credentials-v3',
      description: 'PhonePe payment gateway credentials',
    })

    // Lambda Execution Role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
              resources: [
                this.userTable.tableArn,
                this.solutionTable.tableArn,
                this.sessionTable.tableArn,
                this.partnerApplicationTable.tableArn,
                this.tokenTable.tableArn,
                this.userSolutionEntitlementsTable.tableArn,
                this.paymentTransactionsTable.tableArn,
                this.userSessionsTable.tableArn,
                this.apiMetricsTable.tableArn,
                this.subscriptionHistoryTable.tableArn,
                this.companySettingsTable.tableArn,
                `${this.userTable.tableArn}/index/*`,
                `${this.solutionTable.tableArn}/index/*`,
                `${this.partnerApplicationTable.tableArn}/index/*`,
                `${this.tokenTable.tableArn}/index/*`,
                `${this.userSolutionEntitlementsTable.tableArn}/index/*`,
                `${this.paymentTransactionsTable.tableArn}/index/*`,
                `${this.userSessionsTable.tableArn}/index/*`,
                `${this.apiMetricsTable.tableArn}/index/*`,
                `${this.subscriptionHistoryTable.tableArn}/index/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
              ],
              resources: [
                `${this.assetsBucket.bucketArn}/*`,
                `${this.invoiceBucket.bucketArn}/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'secretsmanager:GetSecretValue',
              ],
              resources: [
                'arn:aws:secretsmanager:us-east-1:637423202175:secret:marketplace/cashfree/credentials-yGol1I',
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeFunction',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    })

    // Lambda Functions
    this.paymentInitiateFunction = new lambda.Function(this, 'PaymentInitiateFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'initiate.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
        SOLUTION_TABLE_NAME: this.solutionTable.tableName,
        COMPANY_SETTINGS_TABLE: this.companySettingsTable.tableName,
        AWS_REGION_NAME: 'us-east-1',
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.invoiceGenerationFunction = new lambda.Function(this, 'InvoiceGenerationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'generate-invoice.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        COMPANY_SETTINGS_TABLE: this.companySettingsTable.tableName,
        INVOICE_BUCKET: this.invoiceBucket.bucketName,
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
    })

    this.cashfreeWebhookFunction = new lambda.Function(this, 'CashfreeWebhookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cashfree-webhook.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE: this.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: this.userSolutionEntitlementsTable.tableName,
        SUBSCRIPTION_HISTORY_TABLE: this.subscriptionHistoryTable.tableName,
        INVOICE_LAMBDA_NAME: this.invoiceGenerationFunction.functionName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    // Create remaining Lambda functions with correct paths

    // Create remaining Lambda functions with correct paths
    this.paymentStatusFunction = new lambda.Function(this, 'PaymentStatusFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'status.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.upgradeToProFunction = new lambda.Function(this, 'UpgradeToProFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'upgrade-to-pro.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE: this.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
        AWS_REGION_NAME: 'us-east-1',
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.paymentCallbackFunction = new lambda.Function(this, 'PaymentCallbackFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'payment-callback.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: this.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.phonepeWebhookFunction = new lambda.Function(this, 'PhonePeWebhookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'phonepe-webhook.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_TABLE: this.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: this.userSolutionEntitlementsTable.tableName,
        INVOICE_LAMBDA_NAME: this.invoiceGenerationFunction.functionName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.phonepeReconciliationFunction = new lambda.Function(this, 'PhonePeReconciliationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'phonepe-reconciliation.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.catalogFunction = new lambda.Function(this, 'CatalogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'catalog.handler',
      code: lambda.Code.fromAsset('lambda/catalog'),
      environment: {
        SOLUTION_TABLE_NAME: this.solutionTable.tableName,
        ASSETS_BUCKET: this.assetsBucket.bucketName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.solutionManagementFunction = new lambda.Function(this, 'SolutionManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-management.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        SOLUTION_TABLE_NAME: this.solutionTable.tableName,
        USER_TABLE_NAME: this.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.partnerApplicationFunction = new lambda.Function(this, 'PartnerApplicationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'partner-application.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        PARTNER_APPLICATION_TABLE: this.partnerApplicationTable.tableName,
        USER_TABLE_NAME: this.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.adminFunction = new lambda.Function(this, 'AdminFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'admin.handler',
      code: lambda.Code.fromAsset('lambda/admin'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        SOLUTION_TABLE_NAME: this.solutionTable.tableName,
        PARTNER_APPLICATION_TABLE: this.partnerApplicationTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.userManagementFunction = new lambda.Function(this, 'UserManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'user-management.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.profileFunction = new lambda.Function(this, 'ProfileFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'profile.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.registerFunction = new lambda.Function(this, 'RegisterFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'register.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.tokenManagerFunction = new lambda.Function(this, 'TokenManagerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'token-manager.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        TOKEN_TABLE: this.tokenTable.tableName,
        USER_TABLE_NAME: this.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.solutionTokenGeneratorFunction = new lambda.Function(this, 'SolutionTokenGeneratorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-token-generator.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        TOKEN_TABLE: this.tokenTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: this.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.generateSolutionTokenFunction = new lambda.Function(this, 'GenerateSolutionTokenFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-token-generator.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        TOKEN_TABLE: this.tokenTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: this.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.solutionTokenValidatorFunction = new lambda.Function(this, 'SolutionTokenValidatorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'solution-token-validator.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        TOKEN_TABLE: this.tokenTable.tableName,
        USER_SOLUTION_ENTITLEMENTS_TABLE: this.userSolutionEntitlementsTable.tableName,
        API_METRICS_TABLE: this.apiMetricsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.checkUserLimitsFunction = new lambda.Function(this, 'CheckUserLimitsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'check-user-limits.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        USER_SOLUTION_ENTITLEMENTS_TABLE: this.userSolutionEntitlementsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.incrementUsageFunctionCF29C1F7 = new lambda.Function(this, 'IncrementUsageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'increment-usage.handler',
      code: lambda.Code.fromAsset('lambda/tokens'),
      environment: {
        USER_SOLUTION_ENTITLEMENTS_TABLE: this.userSolutionEntitlementsTable.tableName,
        API_METRICS_TABLE: this.apiMetricsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.usageAnalyticsFunction = new lambda.Function(this, 'UsageAnalyticsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'usage-analytics.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        API_METRICS_TABLE: this.apiMetricsTable.tableName,
        USER_SESSIONS_TABLE: this.userSessionsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.businessMetricsFunction = new lambda.Function(this, 'BusinessMetricsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'business-metrics.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
        SUBSCRIPTION_HISTORY_TABLE: this.subscriptionHistoryTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.geographicAnalyticsFunction = new lambda.Function(this, 'GeographicAnalyticsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'geographic-analytics.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        USER_SESSIONS_TABLE: this.userSessionsTable.tableName,
        USER_TABLE_NAME: this.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.msmeKpiFunction = new lambda.Function(this, 'MsmeKpiFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'msme-kpi.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      environment: {
        USER_TABLE_NAME: this.userTable.tableName,
        SOLUTION_TABLE_NAME: this.solutionTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

    this.paymentReconciliationFunction = new lambda.Function(this, 'PaymentReconciliationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'payment-reconciliation.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        PAYMENT_TRANSACTIONS_TABLE: this.paymentTransactionsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })
  }
}
