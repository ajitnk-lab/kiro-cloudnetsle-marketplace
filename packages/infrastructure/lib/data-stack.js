"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const constructs_1 = require("constructs");
class DataStack extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
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
        });
        // DynamoDB Tables with static names to retain data across deployments
        const baseTimestamp = '1764183053'; // Fixed timestamp to prevent data loss
        // User table
        this.userTable = new dynamodb.Table(this, 'UserTable', {
            tableName: `marketplace-users-${baseTimestamp}`,
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for email lookup
        this.userTable.addGlobalSecondaryIndex({
            indexName: 'EmailIndex',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for role-based queries
        this.userTable.addGlobalSecondaryIndex({
            indexName: 'RoleIndex',
            partitionKey: { name: 'role', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });
        this.solutionTable = new dynamodb.Table(this, 'SolutionTable', {
            tableName: `marketplace-solutions-${baseTimestamp}`,
            partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            pointInTimeRecovery: true,
        });
        // Add GSI for partner solutions
        this.solutionTable.addGlobalSecondaryIndex({
            indexName: 'PartnerIndex',
            partitionKey: { name: 'partnerId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for category-based search
        this.solutionTable.addGlobalSecondaryIndex({
            indexName: 'CategoryIndex',
            partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'name', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for status-based queries
        this.solutionTable.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
        });
        this.sessionTable = new dynamodb.Table(this, 'SessionTable', {
            tableName: `marketplace-sessions-${baseTimestamp}`,
            partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            timeToLiveAttribute: 'expiresAt',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Partner Application Table
        this.partnerApplicationTable = new dynamodb.Table(this, 'PartnerApplicationTable', {
            tableName: `marketplace-partner-applications-${baseTimestamp}`,
            partitionKey: { name: 'applicationId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for user applications
        this.partnerApplicationTable.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for status-based queries
        this.partnerApplicationTable.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
        });
        // Marketplace Token Table for solution access
        this.tokenTable = new dynamodb.Table(this, 'TokenTable', {
            tableName: 'marketplace-tokens-1764183053',
            partitionKey: { name: 'tokenId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            timeToLiveAttribute: 'expiresAt',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for user token lookup
        this.tokenTable.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
        });
        // Add GSI for solution token lookup
        this.tokenTable.addGlobalSecondaryIndex({
            indexName: 'SolutionIndex',
            partitionKey: { name: 'solutionId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
        });
        // User-Solution Entitlements Table for Control Plane
        this.userSolutionEntitlementsTable = new dynamodb.Table(this, 'UserSolutionEntitlementsTable', {
            tableName: 'marketplace-user-solution-entitlements-1764183053',
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, // user#email@example.com
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING }, // solution#faiss
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for token lookup
        this.userSolutionEntitlementsTable.addGlobalSecondaryIndex({
            indexName: 'TokenIndex',
            partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for solution-based queries
        this.userSolutionEntitlementsTable.addGlobalSecondaryIndex({
            indexName: 'SolutionIndex',
            partitionKey: { name: 'solution_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for user-based queries
        this.userSolutionEntitlementsTable.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: { name: 'user_email', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
        });
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
        });
        // Payment Transactions Table
        this.paymentTransactionsTable = new dynamodb.Table(this, 'PaymentTransactionsTable', {
            tableName: 'marketplace-payment-transactions-1764183053',
            partitionKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for user payment lookup
        this.paymentTransactionsTable.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for merchant order lookup
        this.paymentTransactionsTable.addGlobalSecondaryIndex({
            indexName: 'MerchantOrderIndex',
            partitionKey: { name: 'merchantOrderId', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for PhonePe order lookup
        this.paymentTransactionsTable.addGlobalSecondaryIndex({
            indexName: 'PhonePeOrderIndex',
            partitionKey: { name: 'phonepeOrderId', type: dynamodb.AttributeType.STRING },
        });
        // User Sessions Table for Location Tracking and Analytics
        this.userSessionsTable = new dynamodb.Table(this, 'UserSessionsTable', {
            tableName: 'marketplace-user-sessions-1764183053',
            partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for user-based session queries
        this.userSessionsTable.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for country-based analytics
        this.userSessionsTable.addGlobalSecondaryIndex({
            indexName: 'CountryIndex',
            partitionKey: { name: 'countryCode', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for solution-based analytics
        this.userSessionsTable.addGlobalSecondaryIndex({
            indexName: 'SolutionIndex',
            partitionKey: { name: 'solution_id', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for device-based analytics
        this.userSessionsTable.addGlobalSecondaryIndex({
            indexName: 'DeviceIndex',
            partitionKey: { name: 'device', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });
        // API Metrics Table for Performance Tracking
        this.apiMetricsTable = new dynamodb.Table(this, 'ApiMetricsTable', {
            tableName: 'marketplace-api-metrics-1764183053',
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, // endpoint#/api/validate-solution-token
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING }, // timestamp#2025-11-13T07:00:00Z
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for endpoint-based metrics
        this.apiMetricsTable.addGlobalSecondaryIndex({
            indexName: 'EndpointIndex',
            partitionKey: { name: 'endpoint', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for user-based metrics
        this.apiMetricsTable.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for country-based performance metrics
        this.apiMetricsTable.addGlobalSecondaryIndex({
            indexName: 'CountryIndex',
            partitionKey: { name: 'countryCode', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
        });
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
        });
        // RDS PostgreSQL for transactions and financial data
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for RDS database',
            allowAllOutbound: false,
        });
        // Allow inbound connections from Lambda functions (will be added later)
        dbSecurityGroup.addIngressRule(ec2.Peer.ipv4(this.vpc.vpcCidrBlock), ec2.Port.tcp(5432), 'Allow PostgreSQL access from VPC');
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
exports.DataStack = DataStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQWtDO0FBQ2xDLG1FQUFvRDtBQUNwRCx1REFBd0M7QUFFeEMseURBQTBDO0FBQzFDLCtFQUFnRTtBQUNoRSwyQ0FBc0M7QUFFdEMsTUFBYSxTQUFVLFNBQVEsc0JBQVM7SUFldEMsWUFBWSxLQUFnQixFQUFFLEVBQVU7UUFDdEMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVoQixxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzdDLE1BQU0sRUFBRSxDQUFDO1lBQ1QsV0FBVyxFQUFFLENBQUM7WUFDZCxtQkFBbUIsRUFBRTtnQkFDbkI7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtpQkFDbEM7Z0JBQ0Q7b0JBQ0UsUUFBUSxFQUFFLEVBQUU7b0JBQ1osSUFBSSxFQUFFLFNBQVM7b0JBQ2YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsbUJBQW1CO2lCQUMvQztnQkFDRDtvQkFDRSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsVUFBVTtvQkFDaEIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO2lCQUM1QzthQUNGO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsc0VBQXNFO1FBQ3RFLE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQSxDQUFDLHVDQUF1QztRQUUxRSxhQUFhO1FBQ2IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFdBQVcs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QTdWRCw4QkE2VkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXG5pbXBvcnQgKiBhcyByZHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJkcydcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJ1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJ1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuZXhwb3J0IGNsYXNzIERhdGFTdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHB1YmxpYyByZWFkb25seSBzb2x1dGlvblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICBwdWJsaWMgcmVhZG9ubHkgcGFydG5lckFwcGxpY2F0aW9uVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHB1YmxpYyByZWFkb25seSB0b2tlblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHB1YmxpYyByZWFkb25seSBwYXltZW50VHJhbnNhY3Rpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHB1YmxpYyByZWFkb25seSB1c2VyU2Vzc2lvbnNUYWJsZTogZHluYW1vZGIuVGFibGUgLy8gTkVXOiBGb3IgbG9jYXRpb24gdHJhY2tpbmdcbiAgcHVibGljIHJlYWRvbmx5IGFwaU1ldHJpY3NUYWJsZTogZHluYW1vZGIuVGFibGUgLy8gTkVXOiBGb3IgQVBJIHBlcmZvcm1hbmNlIHRyYWNraW5nXG4gIHB1YmxpYyByZWFkb25seSBhc3NldHNCdWNrZXQ6IHMzLkJ1Y2tldFxuICBwdWJsaWMgcmVhZG9ubHkgdnBjOiBlYzIuVnBjXG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZTogcmRzLkRhdGFiYXNlSW5zdGFuY2VcbiAgcHVibGljIHJlYWRvbmx5IHBob25lcGVTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldFxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpXG5cbiAgICAvLyBDcmVhdGUgVlBDIGZvciBSRFNcbiAgICB0aGlzLnZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdNYXJrZXRwbGFjZVZwYycsIHtcbiAgICAgIG1heEF6czogMixcbiAgICAgIG5hdEdhdGV3YXlzOiAxLFxuICAgICAgc3VibmV0Q29uZmlndXJhdGlvbjogW1xuICAgICAgICB7XG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgIG5hbWU6ICdQdWJsaWMnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgICBuYW1lOiAnUHJpdmF0ZScsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyOCxcbiAgICAgICAgICBuYW1lOiAnRGF0YWJhc2UnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pXG5cbiAgICAvLyBEeW5hbW9EQiBUYWJsZXMgd2l0aCBzdGF0aWMgbmFtZXMgdG8gcmV0YWluIGRhdGEgYWNyb3NzIGRlcGxveW1lbnRzXG4gICAgY29uc3QgYmFzZVRpbWVzdGFtcCA9ICcxNzY0MTgzMDUzJyAvLyBGaXhlZCB0aW1lc3RhbXAgdG8gcHJldmVudCBkYXRhIGxvc3NcbiAgICBcbiAgICAvLyBVc2VyIHRhYmxlXG4gICAgdGhpcy51c2VyVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1VzZXJUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYG1hcmtldHBsYWNlLXVzZXJzLSR7YmFzZVRpbWVzdGFtcH1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciBlbWFpbCBsb29rdXBcbiAgICB0aGlzLnVzZXJUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdFbWFpbEluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciByb2xlLWJhc2VkIHF1ZXJpZXNcbiAgICB0aGlzLnVzZXJUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdSb2xlSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdyb2xlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIHRoaXMuc29sdXRpb25UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnU29sdXRpb25UYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYG1hcmtldHBsYWNlLXNvbHV0aW9ucy0ke2Jhc2VUaW1lc3RhbXB9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc29sdXRpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHBhcnRuZXIgc29sdXRpb25zXG4gICAgdGhpcy5zb2x1dGlvblRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1BhcnRuZXJJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3BhcnRuZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciBjYXRlZ29yeS1iYXNlZCBzZWFyY2hcbiAgICB0aGlzLnNvbHV0aW9uVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnQ2F0ZWdvcnlJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2NhdGVnb3J5JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ25hbWUnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciBzdGF0dXMtYmFzZWQgcXVlcmllc1xuICAgIHRoaXMuc29sdXRpb25UYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdTdGF0dXNJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3N0YXR1cycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd1cGRhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICB0aGlzLnNlc3Npb25UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnU2Vzc2lvblRhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgbWFya2V0cGxhY2Utc2Vzc2lvbnMtJHtiYXNlVGltZXN0YW1wfWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Nlc3Npb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCcsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pXG5cbiAgICAvLyBQYXJ0bmVyIEFwcGxpY2F0aW9uIFRhYmxlXG4gICAgdGhpcy5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUGFydG5lckFwcGxpY2F0aW9uVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGBtYXJrZXRwbGFjZS1wYXJ0bmVyLWFwcGxpY2F0aW9ucy0ke2Jhc2VUaW1lc3RhbXB9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnYXBwbGljYXRpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXIgYXBwbGljYXRpb25zXG4gICAgdGhpcy5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdVc2VySW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnc3VibWl0dGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciBzdGF0dXMtYmFzZWQgcXVlcmllc1xuICAgIHRoaXMucGFydG5lckFwcGxpY2F0aW9uVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnU3RhdHVzSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzdGF0dXMnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnc3VibWl0dGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICAvLyBNYXJrZXRwbGFjZSBUb2tlbiBUYWJsZSBmb3Igc29sdXRpb24gYWNjZXNzXG4gICAgdGhpcy50b2tlblRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdUb2tlblRhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnbWFya2V0cGxhY2UtdG9rZW5zLTE3NjQxODMwNTMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd0b2tlbklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAnZXhwaXJlc0F0JyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXIgdG9rZW4gbG9va3VwXG4gICAgdGhpcy50b2tlblRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1VzZXJJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciBzb2x1dGlvbiB0b2tlbiBsb29rdXBcbiAgICB0aGlzLnRva2VuVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnU29sdXRpb25JbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3NvbHV0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcbiAgICB9KVxuXG4gICAgLy8gVXNlci1Tb2x1dGlvbiBFbnRpdGxlbWVudHMgVGFibGUgZm9yIENvbnRyb2wgUGxhbmVcbiAgICB0aGlzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdVc2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ21hcmtldHBsYWNlLXVzZXItc29sdXRpb24tZW50aXRsZW1lbnRzLTE3NjQxODMwNTMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdwaycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sIC8vIHVzZXIjZW1haWxAZXhhbXBsZS5jb21cbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3NrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSwgLy8gc29sdXRpb24jZmFpc3NcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KVxuXG4gICAgLy8gQWRkIEdTSSBmb3IgdG9rZW4gbG9va3VwXG4gICAgdGhpcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdUb2tlbkluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndG9rZW4nLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciBzb2x1dGlvbi1iYXNlZCBxdWVyaWVzXG4gICAgdGhpcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdTb2x1dGlvbkluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc29sdXRpb25faWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZF9hdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXItYmFzZWQgcXVlcmllc1xuICAgIHRoaXMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnVXNlckluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcl9lbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkX2F0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KVxuXG4gICAgLy8gUGhvbmVQZSBQYXltZW50IENyZWRlbnRpYWxzIFNlY3JldFxuICAgIHRoaXMucGhvbmVwZVNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ1Bob25lUGVTZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiAnbWFya2V0cGxhY2UvcGhvbmVwZS9jcmVkZW50aWFscy12MycsXG4gICAgICBkZXNjcmlwdGlvbjogJ1Bob25lUGUgcGF5bWVudCBnYXRld2F5IGNyZWRlbnRpYWxzJyxcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgY2xpZW50SWQ6ICdTVTI1MTEwNjE4MTA1OTI1MTg3MzQzOTcnLFxuICAgICAgICAgIGNsaWVudFZlcnNpb246ICcxJyxcbiAgICAgICAgICBjbGllbnRTZWNyZXQ6ICdjYTkzNWEzZC0yNDA0LTRlMmEtYTVhMi1lYTJkNGE1YmYzZmQnLFxuICAgICAgICAgIHNhbmRib3hVcmw6ICdodHRwczovL2FwaS1wcmVwcm9kLnBob25lcGUuY29tL2FwaXMvcGctc2FuZGJveCcsXG4gICAgICAgICAgcHJvZHVjdGlvblVybDogJ2h0dHBzOi8vYXBpLnBob25lcGUuY29tL2FwaXMvcGcnXG4gICAgICAgIH0pLFxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3BsYWNlaG9sZGVyJyxcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXCdcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gUGF5bWVudCBUcmFuc2FjdGlvbnMgVGFibGVcbiAgICB0aGlzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnbWFya2V0cGxhY2UtcGF5bWVudC10cmFuc2FjdGlvbnMtMTc2NDE4MzA1MycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3RyYW5zYWN0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciB1c2VyIHBheW1lbnQgbG9va3VwXG4gICAgdGhpcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnVXNlckluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIG1lcmNoYW50IG9yZGVyIGxvb2t1cFxuICAgIHRoaXMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ01lcmNoYW50T3JkZXJJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ21lcmNoYW50T3JkZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIFBob25lUGUgb3JkZXIgbG9va3VwXG4gICAgdGhpcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnUGhvbmVQZU9yZGVySW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdwaG9uZXBlT3JkZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIC8vIFVzZXIgU2Vzc2lvbnMgVGFibGUgZm9yIExvY2F0aW9uIFRyYWNraW5nIGFuZCBBbmFseXRpY3NcbiAgICB0aGlzLnVzZXJTZXNzaW9uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdVc2VyU2Vzc2lvbnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ21hcmtldHBsYWNlLXVzZXItc2Vzc2lvbnMtMTc2NDE4MzA1MycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Nlc3Npb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXItYmFzZWQgc2Vzc2lvbiBxdWVyaWVzXG4gICAgdGhpcy51c2VyU2Vzc2lvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdVc2VySW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KVxuXG4gICAgLy8gQWRkIEdTSSBmb3IgY291bnRyeS1iYXNlZCBhbmFseXRpY3NcbiAgICB0aGlzLnVzZXJTZXNzaW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ0NvdW50cnlJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2NvdW50cnlDb2RlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHNvbHV0aW9uLWJhc2VkIGFuYWx5dGljc1xuICAgIHRoaXMudXNlclNlc3Npb25zVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnU29sdXRpb25JbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3NvbHV0aW9uX2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIGRldmljZS1iYXNlZCBhbmFseXRpY3NcbiAgICB0aGlzLnVzZXJTZXNzaW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ0RldmljZUluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZGV2aWNlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIC8vIEFQSSBNZXRyaWNzIFRhYmxlIGZvciBQZXJmb3JtYW5jZSBUcmFja2luZ1xuICAgIHRoaXMuYXBpTWV0cmljc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBcGlNZXRyaWNzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdtYXJrZXRwbGFjZS1hcGktbWV0cmljcy0xNzY0MTgzMDUzJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncGsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LCAvLyBlbmRwb2ludCMvYXBpL3ZhbGlkYXRlLXNvbHV0aW9uLXRva2VuXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdzaycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sIC8vIHRpbWVzdGFtcCMyMDI1LTExLTEzVDA3OjAwOjAwWlxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciBlbmRwb2ludC1iYXNlZCBtZXRyaWNzXG4gICAgdGhpcy5hcGlNZXRyaWNzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnRW5kcG9pbnRJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2VuZHBvaW50JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSlcblxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXItYmFzZWQgbWV0cmljc1xuICAgIHRoaXMuYXBpTWV0cmljc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ1VzZXJJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR1NJIGZvciBjb3VudHJ5LWJhc2VkIHBlcmZvcm1hbmNlIG1ldHJpY3NcbiAgICB0aGlzLmFwaU1ldHJpY3NUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdDb3VudHJ5SW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdjb3VudHJ5Q29kZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pXG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIGFzc2V0c1xuICAgIHRoaXMuYXNzZXRzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQXNzZXRzQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYG1hcmtldHBsYWNlLWFzc2V0cy0xNzY0MTgzMDUzJHtjZGsuQXdzLkFDQ09VTlRfSUR9LSR7Y2RrLkF3cy5SRUdJT059YCxcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdEZWxldGVPbGRWZXJzaW9ucycsXG4gICAgICAgICAgbm9uY3VycmVudFZlcnNpb25FeHBpcmF0aW9uOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KVxuXG4gICAgLy8gUkRTIFBvc3RncmVTUUwgZm9yIHRyYW5zYWN0aW9ucyBhbmQgZmluYW5jaWFsIGRhdGFcbiAgICBjb25zdCBkYlNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0RhdGFiYXNlU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgIHZwYzogdGhpcy52cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBSRFMgZGF0YWJhc2UnLFxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogZmFsc2UsXG4gICAgfSlcblxuICAgIC8vIEFsbG93IGluYm91bmQgY29ubmVjdGlvbnMgZnJvbSBMYW1iZGEgZnVuY3Rpb25zICh3aWxsIGJlIGFkZGVkIGxhdGVyKVxuICAgIGRiU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmlwdjQodGhpcy52cGMudnBjQ2lkckJsb2NrKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg1NDMyKSxcbiAgICAgICdBbGxvdyBQb3N0Z3JlU1FMIGFjY2VzcyBmcm9tIFZQQydcbiAgICApXG5cbiAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlZCBSRFMgZm9yIHF1aWNrIGRlcGxveW1lbnRcbiAgICAvLyB0aGlzLmRhdGFiYXNlID0gbmV3IHJkcy5EYXRhYmFzZUluc3RhbmNlKHRoaXMsICdNYXJrZXRwbGFjZURhdGFiYXNlJywge1xuICAgIC8vICAgZW5naW5lOiByZHMuRGF0YWJhc2VJbnN0YW5jZUVuZ2luZS5wb3N0Z3Jlcyh7XG4gICAgLy8gICAgIHZlcnNpb246IHJkcy5Qb3N0Z3Jlc0VuZ2luZVZlcnNpb24uVkVSXzE1XzQsXG4gICAgLy8gICB9KSxcbiAgICAvLyAgIGluc3RhbmNlVHlwZTogZWMyLkluc3RhbmNlVHlwZS5vZihlYzIuSW5zdGFuY2VDbGFzcy5UMywgZWMyLkluc3RhbmNlU2l6ZS5NSUNSTyksXG4gICAgLy8gICB2cGM6IHRoaXMudnBjLFxuICAgIC8vICAgdnBjU3VibmV0czoge1xuICAgIC8vICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgIC8vICAgfSxcbiAgICAvLyAgIHNlY3VyaXR5R3JvdXBzOiBbZGJTZWN1cml0eUdyb3VwXSxcbiAgICAvLyAgIGRhdGFiYXNlTmFtZTogJ21hcmtldHBsYWNlJyxcbiAgICAvLyAgIGNyZWRlbnRpYWxzOiByZHMuQ3JlZGVudGlhbHMuZnJvbUdlbmVyYXRlZFNlY3JldCgnbWFya2V0cGxhY2VfYWRtaW4nLCB7XG4gICAgLy8gICAgIHNlY3JldE5hbWU6ICdtYXJrZXRwbGFjZS9kYXRhYmFzZS9jcmVkZW50aWFscy12MycsXG4gICAgLy8gICB9KSxcbiAgICAvLyAgIGJhY2t1cFJldGVudGlvbjogY2RrLkR1cmF0aW9uLmRheXMoNyksXG4gICAgLy8gICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIC8vIH0pXG4gIH1cbn0iXX0=