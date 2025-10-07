import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export interface DataStackProps {
  uniqueSuffix?: string
}

export class DataStack extends Construct {
  public readonly userTable: dynamodb.Table
  public readonly solutionTable: dynamodb.Table
  public readonly sessionTable: dynamodb.Table
  public readonly partnerApplicationTable: dynamodb.Table
  public readonly transactionTable: dynamodb.Table
  public readonly userSolutionsTable: dynamodb.Table
  public readonly commissionSettingsTable: dynamodb.Table
  public readonly partnerEarningsTable: dynamodb.Table
  public readonly assetsBucket: s3.Bucket
  // VPC and RDS removed to reduce costs and deployment time
  // Can be added later when needed for production

  constructor(scope: Construct, id: string, props?: DataStackProps) {
    super(scope, id)
    
    const uniqueSuffix = props?.uniqueSuffix || Date.now().toString()

    // DynamoDB Tables
    this.userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: `marketplace-users-${uniqueSuffix}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false, // Disabled for dev to reduce costs
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
      tableName: `marketplace-solutions-${uniqueSuffix}`,
      partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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
      tableName: `marketplace-sessions-${uniqueSuffix}`,
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Partner Application Table
    this.partnerApplicationTable = new dynamodb.Table(this, 'PartnerApplicationTable', {
      tableName: `marketplace-partner-applications-${uniqueSuffix}`,
      partitionKey: { name: 'applicationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
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

    // Transaction Table for payment processing
    this.transactionTable = new dynamodb.Table(this, 'TransactionTable', {
      tableName: `marketplace-transactions-${uniqueSuffix}`,
      partitionKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for user transactions
    this.transactionTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for payment request lookup
    this.transactionTable.addGlobalSecondaryIndex({
      indexName: 'PaymentRequestIndex',
      partitionKey: { name: 'paymentRequestId', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for solution transactions
    this.transactionTable.addGlobalSecondaryIndex({
      indexName: 'SolutionIndex',
      partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // User Solutions Table for access management
    this.userSolutionsTable = new dynamodb.Table(this, 'UserSolutionsTable', {
      tableName: `marketplace-user-solutions-${uniqueSuffix}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for solution access lookup
    this.userSolutionsTable.addGlobalSecondaryIndex({
      indexName: 'SolutionIndex',
      partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'accessGrantedAt', type: dynamodb.AttributeType.STRING },
    })

    // Commission Settings Table
    this.commissionSettingsTable = new dynamodb.Table(this, 'CommissionSettingsTable', {
      tableName: `marketplace-commission-settings-${uniqueSuffix}`,
      partitionKey: { name: 'settingId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for category-based commission rates
    this.commissionSettingsTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'effectiveDate', type: dynamodb.AttributeType.STRING },
    })

    // Partner Earnings Table
    this.partnerEarningsTable = new dynamodb.Table(this, 'PartnerEarningsTable', {
      tableName: `marketplace-partner-earnings-${uniqueSuffix}`,
      partitionKey: { name: 'partnerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'month', type: dynamodb.AttributeType.STRING }, // Format: YYYY-MM
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Add GSI for monthly earnings reports
    this.partnerEarningsTable.addGlobalSecondaryIndex({
      indexName: 'MonthIndex',
      partitionKey: { name: 'month', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'totalEarnings', type: dynamodb.AttributeType.NUMBER },
    })

    // S3 Bucket for assets
    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `marketplace-assets-${uniqueSuffix}`,
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
      autoDeleteObjects: true,
    })

    // RDS PostgreSQL removed for now - DynamoDB handles all data
    // Can be added later for complex transactional requirements
  }
}