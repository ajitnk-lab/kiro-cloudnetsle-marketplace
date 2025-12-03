import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export class DataStack extends Construct {
  public readonly userTable: dynamodb.Table
  public readonly solutionTable: dynamodb.Table
  public readonly sessionTable: dynamodb.Table
  public readonly partnerApplicationTable: dynamodb.Table
  public readonly tokenTable: dynamodb.Table
  public readonly userSolutionEntitlementsTable: dynamodb.Table
  public readonly paymentTransactionsTable: dynamodb.Table
  public readonly userSessionsTable: dynamodb.Table // NEW: For location tracking
  public readonly apiMetricsTable: dynamodb.Table // NEW: For API performance tracking
  public readonly assetsBucket: s3.Bucket
  public readonly vpc: ec2.Vpc
  public readonly database: rds.DatabaseInstance
  public readonly phonepeSecret: secretsmanager.Secret

  constructor(scope: Construct, id: string) {
    super(scope, id)

    // Create VPC for RDS
    this.vpc = new ec2.Vpc(this, 'MarketplaceVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    })

    // DynamoDB Tables with static names to retain data across deployments
    const baseTimestamp = '1764183053' // Fixed timestamp to prevent data loss
    
    // User table
    this.userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: `marketplace-users-${baseTimestamp}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for email lookup
    this.userTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for role-based queries
    this.userTable.addGlobalSecondaryIndex({
      indexName: 'RoleIndex',
      partitionKey: { name: 'role', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    this.solutionTable = new dynamodb.Table(this, 'SolutionTable', {
      tableName: `marketplace-solutions-${baseTimestamp}`,
      partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    })

    // Add GSI for partner solutions
    this.solutionTable.addGlobalSecondaryIndex({
      indexName: 'PartnerIndex',
      partitionKey: { name: 'partnerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for category-based search
    this.solutionTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for status-based queries
    this.solutionTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    })

    this.sessionTable = new dynamodb.Table(this, 'SessionTable', {
      tableName: `marketplace-sessions-${baseTimestamp}`,
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Partner Application Table
    this.partnerApplicationTable = new dynamodb.Table(this, 'PartnerApplicationTable', {
      tableName: `marketplace-partner-applications-${baseTimestamp}`,
      partitionKey: { name: 'applicationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for user applications
    this.partnerApplicationTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for status-based queries
    this.partnerApplicationTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    })

    // Marketplace Token Table for solution access
    this.tokenTable = new dynamodb.Table(this, 'TokenTable', {
      tableName: 'marketplace-tokens-1764183053',
      partitionKey: { name: 'tokenId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for user token lookup
    this.tokenTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    })

    // Add GSI for solution token lookup
    this.tokenTable.addGlobalSecondaryIndex({
      indexName: 'SolutionIndex',
      partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    })

    // User-Solution Entitlements Table for Control Plane
    this.userSolutionEntitlementsTable = new dynamodb.Table(this, 'UserSolutionEntitlementsTable', {
      tableName: 'marketplace-user-solution-entitlements-1764183053',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, // user#email@example.com
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING }, // solution#faiss
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for token lookup
    this.userSolutionEntitlementsTable.addGlobalSecondaryIndex({
      indexName: 'TokenIndex',
      partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for solution-based queries
    this.userSolutionEntitlementsTable.addGlobalSecondaryIndex({
      indexName: 'SolutionIndex',
      partitionKey: { name: 'solution_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for user-based queries
    this.userSolutionEntitlementsTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'user_email', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
    })

    // PhonePe Payment Credentials Secret
    this.phonepeSecret = new secretsmanager.Secret(this, 'PhonePeSecret', {
      secretName: 'marketplace/phonepe/credentials-v3',
      description: 'PhonePe payment gateway credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          clientId: 'SU2511061810592518734397',
          clientVersion: '1',
          clientSecret: 'ca935a3d-2404-4e2a-a5a2-ea2d4a5bf3fd',
          sandboxUrl: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
          productionUrl: 'https://api.phonepe.com/apis/pg'
        }),
        generateStringKey: 'placeholder',
        excludeCharacters: '"@/\\'
      }
    })

    // Payment Transactions Table
    this.paymentTransactionsTable = new dynamodb.Table(this, 'PaymentTransactionsTable', {
      tableName: 'marketplace-payment-transactions-1764183053',
      partitionKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for user payment lookup
    this.paymentTransactionsTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for merchant order lookup
    this.paymentTransactionsTable.addGlobalSecondaryIndex({
      indexName: 'MerchantOrderIndex',
      partitionKey: { name: 'merchantOrderId', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for PhonePe order lookup
    this.paymentTransactionsTable.addGlobalSecondaryIndex({
      indexName: 'PhonePeOrderIndex',
      partitionKey: { name: 'phonepeOrderId', type: dynamodb.AttributeType.STRING },
    })

    // User Sessions Table for Location Tracking and Analytics
    this.userSessionsTable = new dynamodb.Table(this, 'UserSessionsTable', {
      tableName: 'marketplace-user-sessions-1764183053',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for user-based session queries
    this.userSessionsTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for country-based analytics
    this.userSessionsTable.addGlobalSecondaryIndex({
      indexName: 'CountryIndex',
      partitionKey: { name: 'countryCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for solution-based analytics
    this.userSessionsTable.addGlobalSecondaryIndex({
      indexName: 'SolutionIndex',
      partitionKey: { name: 'solution_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for device-based analytics
    this.userSessionsTable.addGlobalSecondaryIndex({
      indexName: 'DeviceIndex',
      partitionKey: { name: 'device', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // API Metrics Table for Performance Tracking
    this.apiMetricsTable = new dynamodb.Table(this, 'ApiMetricsTable', {
      tableName: 'marketplace-api-metrics-1764183053',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, // endpoint#/api/validate-solution-token
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING }, // timestamp#2025-11-13T07:00:00Z
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for endpoint-based metrics
    this.apiMetricsTable.addGlobalSecondaryIndex({
      indexName: 'EndpointIndex',
      partitionKey: { name: 'endpoint', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for user-based metrics
    this.apiMetricsTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for country-based performance metrics
    this.apiMetricsTable.addGlobalSecondaryIndex({
      indexName: 'CountryIndex',
      partitionKey: { name: 'countryCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    })

    // S3 Bucket for assets
    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `marketplace-assets-1764183053${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // RDS PostgreSQL for transactions and financial data
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS database',
      allowAllOutbound: false,
    })

    // Allow inbound connections from Lambda functions (will be added later)
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from VPC'
    )

    // Temporarily disabled RDS for quick deployment
    // this.database = new rds.DatabaseInstance(this, 'MarketplaceDatabase', {
    //   engine: rds.DatabaseInstanceEngine.postgres({
    //     version: rds.PostgresEngineVersion.VER_15_4,
    //   }),
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    //   vpc: this.vpc,
    //   vpcSubnets: {
    //     subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    //   },
    //   securityGroups: [dbSecurityGroup],
    //   databaseName: 'marketplace',
    //   credentials: rds.Credentials.fromGeneratedSecret('marketplace_admin', {
    //     secretName: 'marketplace/database/credentials-v3',
    //   }),
    //   backupRetention: cdk.Duration.days(7),
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    // })
  }
}