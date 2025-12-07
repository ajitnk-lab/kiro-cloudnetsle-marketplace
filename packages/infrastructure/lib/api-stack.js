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
exports.ApiStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
class ApiStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
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
            deploy: false, // Disable automatic deployment to avoid circular dependencies
        });
        // Add CORS support for 401 responses
        this.api.addGatewayResponse('Unauthorized', {
            type: apigateway.ResponseType.UNAUTHORIZED,
            responseHeaders: {
                'Access-Control-Allow-Origin': "'*'",
                'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
            },
        });
        // Create Cognito Authorizer
        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [props.userPool],
            identitySource: 'method.request.header.Authorization',
        });
        // Lambda execution role
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
            ],
        });
        // Grant DynamoDB permissions
        props.userTable.grantReadWriteData(lambdaRole);
        props.solutionTable.grantReadWriteData(lambdaRole);
        props.partnerApplicationTable.grantReadWriteData(lambdaRole);
        props.tokenTable.grantReadWriteData(lambdaRole);
        props.userSolutionEntitlementsTable.grantReadWriteData(lambdaRole);
        props.paymentTransactionsTable.grantReadWriteData(lambdaRole);
        props.userSessionsTable.grantReadWriteData(lambdaRole); // NEW: Analytics tables
        props.subscriptionHistoryTable.grantReadWriteData(lambdaRole); // NEW: Subscription history
        props.companySettingsTable.grantReadData(lambdaRole); // NEW: GST company settings (read-only)
        props.assetsBucket.grantReadWrite(lambdaRole);
        props.invoiceBucket.grantReadWrite(lambdaRole); // NEW: Invoice storage
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
        }));
        // Grant Secrets Manager permissions for PhonePe credentials
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'secretsmanager:GetSecretValue',
            ],
            resources: ['*'], // Can be restricted to specific secret ARN if needed
        }));
        // Grant SES permissions for email notifications
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
            ],
            resources: ['*'], // You might want to restrict this to specific email addresses
        }));
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
        }));
        // Grant CloudWatch permissions for API metrics
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cloudwatch:GetMetricStatistics',
                'cloudwatch:ListMetrics'
            ],
            resources: ['*'],
        }));
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
        });
        const profileFunction = new lambda.Function(this, 'ProfileFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'profile.handler',
            code: lambda.Code.fromAsset('lambda/auth'),
            environment: {
                USER_TABLE_NAME: props.userTable.tableName,
                USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
            },
            role: lambdaRole,
        });
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
        });
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
        });
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
        });
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
        });
        // Payment Lambda Function
        const paymentInitiateFunction = new lambda.Function(this, 'PaymentInitiateFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'initiate.handler',
            code: lambda.Code.fromAsset('lambda/payments'),
            environment: {
                USER_TABLE_NAME: props.userTable.tableName,
                PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
                SOLUTION_TABLE_NAME: props.solutionTable.tableName,
                AWS_REGION_NAME: 'us-west-1',
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });
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
        });
        // Upgrade to Pro Lambda Function
        const upgradeToProFunction = new lambda.Function(this, 'UpgradeToProFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'upgrade-to-pro.handler',
            code: lambda.Code.fromAsset('lambda/payments'),
            environment: {
                USER_TABLE: props.userTable.tableName,
                PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
                AWS_REGION_NAME: 'us-west-1',
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });
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
        });
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
        });
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
        });
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
        });
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
        });
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
        });
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
        });
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
        });
        // Control Plane Token Validation Lambda Function
        const solutionTokenValidatorFunction = new lambda.Function(this, 'SolutionTokenValidatorFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'solution-token-validator.handler',
            code: lambda.Code.fromAsset('lambda/tokens'),
            environment: {
                USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
                SUBSCRIPTION_HISTORY_TABLE: props.subscriptionHistoryTable.tableName,
                USER_SESSIONS_TABLE_NAME: props.userSessionsTable.tableName,
                ENABLE_LOCATION_TRACKING: 'true',
                IP_SALT: 'marketplace-location-salt-2025'
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });
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
        });
        // Cashfree Webhook Function
        const cashfreeWebhookFunction = new lambda.Function(this, 'CashfreeWebhookFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'cashfree-webhook.handler',
            code: lambda.Code.fromAsset('lambda/payments'),
            environment: {
                PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
                USER_TABLE: props.userTable.tableName,
                USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
                SUBSCRIPTION_HISTORY_TABLE: props.subscriptionHistoryTable.tableName,
                SOLUTION_TABLE_NAME: props.solutionTable.tableName,
                INVOICE_LAMBDA_NAME: 'MarketplaceStack-Clean-InvoiceGenerationFunction', // Will be updated after deploy
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });
        // Invoice Generation Lambda Function (NEW: For GST invoices)
        const invoiceGenerationFunction = new lambda.Function(this, 'InvoiceGenerationFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'generate-invoice.handler',
            code: lambda.Code.fromAsset('lambda/payments'),
            environment: {
                COMPANY_SETTINGS_TABLE: props.companySettingsTable.tableName,
                PAYMENT_TRANSACTIONS_TABLE: props.paymentTransactionsTable.tableName,
                INVOICE_BUCKET: props.invoiceBucket.bucketName,
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });
        // Grant Lambda invoke permission to webhook
        invoiceGenerationFunction.grantInvoke(cashfreeWebhookFunction);
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
        });
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
        });
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
        });
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
        });
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
        });
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
        });
        // API Routes
        const authApi = this.api.root.addResource('auth');
        const catalogApi = this.api.root.addResource('catalog');
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
        });
        const adminApi = this.api.root.addResource('admin');
        const partnerApi = this.api.root.addResource('partner');
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
        });
        const apiResource = this.api.root.addResource('api');
        // Payment routes
        paymentsApi.addResource('initiate').addMethod('POST', new apigateway.LambdaIntegration(paymentInitiateFunction), {
            authorizer: cognitoAuthorizer,
        });
        paymentsApi.addResource('status').addResource('{transactionId}').addMethod('GET', new apigateway.LambdaIntegration(paymentStatusFunction));
        paymentsApi.addResource('upgrade-to-pro').addMethod('POST', new apigateway.LambdaIntegration(upgradeToProFunction));
        // PhonePe webhook route (no auth required)
        const phonePeWebhookResource = paymentsApi.addResource('phonepe-webhook');
        phonePeWebhookResource.addMethod('POST', new apigateway.LambdaIntegration(phonePeWebhookFunction), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // Cashfree webhook route (no auth required)
        const cashfreeWebhookResource = paymentsApi.addResource('cashfree-webhook');
        cashfreeWebhookResource.addMethod('POST', new apigateway.LambdaIntegration(cashfreeWebhookFunction), {
            authorizationType: apigateway.AuthorizationType.NONE
        });
        // PhonePe reconciliation route (protected)
        paymentsApi.addResource('reconciliation').addMethod('POST', new apigateway.LambdaIntegration(phonePeReconciliationFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Payment callback - no auth required for webhooks
        const callbackResource = paymentsApi.addResource('callback');
        callbackResource.addMethod('GET', new apigateway.LambdaIntegration(paymentCallbackFunction), {
            authorizationType: apigateway.AuthorizationType.NONE
        }); // For direct callbacks
        callbackResource.addMethod('POST', new apigateway.LambdaIntegration(paymentCallbackFunction), {
            authorizationType: apigateway.AuthorizationType.NONE
        }); // For PhonePe webhooks
        // User limits and usage tracking routes (for FAISS integration)
        apiResource.addResource('check-user-limits').addMethod('POST', new apigateway.LambdaIntegration(checkUserLimitsFunction));
        apiResource.addResource('increment-usage').addMethod('POST', new apigateway.LambdaIntegration(incrementUsageFunction));
        // Auth routes
        authApi.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(registerFunction));
        // Control Plane API routes
        apiResource.addResource('generate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(generateSolutionTokenFunction));
        apiResource.addResource('generate-token').addMethod('POST', new apigateway.LambdaIntegration(generateSolutionTokenFunction)); // Frontend compatibility
        apiResource.addResource('validate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(solutionTokenValidatorFunction));
        // User routes (protected)
        const profileResource = userApi.addResource('profile');
        profileResource.addMethod('GET', new apigateway.LambdaIntegration(profileFunction), {
            authorizer: cognitoAuthorizer,
        });
        profileResource.addMethod('PUT', new apigateway.LambdaIntegration(profileFunction), {
            authorizer: cognitoAuthorizer,
        });
        // User management routes
        const usersResource = userApi.addResource('{userId}');
        usersResource.addMethod('GET', new apigateway.LambdaIntegration(userManagementFunction));
        // Admin user management routes (protected)
        const adminUsersResource = adminApi.addResource('users');
        adminUsersResource.addMethod('GET', new apigateway.LambdaIntegration(userManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        adminUsersResource.addResource('{userId}').addMethod('PUT', new apigateway.LambdaIntegration(userManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Partner application routes
        const applicationsResource = partnerApi.addResource('applications');
        applicationsResource.addMethod('POST', new apigateway.LambdaIntegration(partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        applicationsResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        const applicationResource = applicationsResource.addResource('{applicationId}');
        applicationResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        applicationResource.addMethod('PUT', new apigateway.LambdaIntegration(partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Admin partner application routes
        const adminApplicationsResource = adminApi.addResource('applications');
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
        });
        adminApplicationsResource.addResource('{applicationId}').addMethod('PUT', new apigateway.LambdaIntegration(adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Catalog routes (public)
        catalogApi.addMethod('GET', new apigateway.LambdaIntegration(catalogFunction));
        catalogApi.addResource('search').addMethod('GET', new apigateway.LambdaIntegration(catalogFunction));
        catalogApi.addResource('categories').addMethod('GET', new apigateway.LambdaIntegration(catalogFunction));
        catalogApi.addResource('{solutionId}').addMethod('GET', new apigateway.LambdaIntegration(catalogFunction));
        // Image upload route (protected)
        catalogApi.addResource('upload-image').addMethod('POST', new apigateway.LambdaIntegration(catalogFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Partner solution management routes (protected)
        const partnerSolutionsResource = partnerApi.addResource('solutions');
        partnerSolutionsResource.addMethod('POST', new apigateway.LambdaIntegration(catalogFunction), {
            authorizer: cognitoAuthorizer,
        });
        partnerSolutionsResource.addMethod('GET', new apigateway.LambdaIntegration(catalogFunction), {
            authorizer: cognitoAuthorizer,
        });
        const partnerSolutionResource = partnerSolutionsResource.addResource('{solutionId}');
        partnerSolutionResource.addMethod('PUT', new apigateway.LambdaIntegration(catalogFunction), {
            authorizer: cognitoAuthorizer,
        });
        partnerSolutionResource.addMethod('DELETE', new apigateway.LambdaIntegration(catalogFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Admin solution management routes (protected)
        const adminSolutionsResource = adminApi.addResource('solutions');
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
        });
        const adminSolutionResource = adminSolutionsResource.addResource('{solutionId}');
        adminSolutionResource.addMethod('PUT', new apigateway.LambdaIntegration(adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Admin migration routes
        const adminMigrateResource = adminApi.addResource('migrate-user-countries');
        adminMigrateResource.addMethod('POST', new apigateway.LambdaIntegration(adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Token Management API Routes (for FAISS integration)
        const trackUsageResource = apiResource.addResource('track-usage');
        trackUsageResource.addMethod('POST', new apigateway.LambdaIntegration(tokenManagerFunction));
        // Admin token management routes
        const userTokensResource = apiResource.addResource('user-tokens').addResource('{userId}');
        userTokensResource.addMethod('GET', new apigateway.LambdaIntegration(tokenManagerFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Analytics API Routes (protected)
        const analyticsApi = apiResource.addResource('analytics');
        analyticsApi.addResource('business-metrics').addMethod('GET', new apigateway.LambdaIntegration(businessMetricsFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Public founder dashboard endpoint (no auth required)
        const founderApi = apiResource.addResource('founder');
        founderApi.addResource('metrics').addMethod('GET', new apigateway.LambdaIntegration(businessMetricsFunction));
        analyticsApi.addResource('geographic').addMethod('GET', new apigateway.LambdaIntegration(geographicAnalyticsFunction), {
            authorizer: cognitoAuthorizer,
        });
        analyticsApi.addResource('usage').addMethod('GET', new apigateway.LambdaIntegration(usageAnalyticsFunction), {
            authorizer: cognitoAuthorizer,
        });
        analyticsApi.addResource('msme-kpis').addMethod('GET', new apigateway.LambdaIntegration(msmeKpiFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Manual deployment to avoid circular dependencies
        const deployment = new apigateway.Deployment(this, 'ApiDeployment', {
            api: this.api,
            description: `Deployment ${Date.now()}`,
        });
        const stage = new apigateway.Stage(this, 'ApiStage', {
            deployment,
            stageName: 'prod',
        });
        // Set the deployment stage on the API
        this.api.deploymentStage = stage;
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFrQztBQUNsQyx1RUFBd0Q7QUFDeEQsK0RBQWdEO0FBSWhELHlEQUEwQztBQUMxQywyQ0FBc0M7QUFrQnRDLE1BQWEsUUFBUyxTQUFRLHNCQUFTO0lBR3JDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBb0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVoQixxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hELFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsV0FBVyxFQUFFLDhCQUE4QjtZQUMzQywyQkFBMkIsRUFBRTtnQkFDM0IsWUFBWSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVztnQkFDekMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVztnQkFDekMsWUFBWSxFQUFFO29CQUNaLGNBQWM7b0JBQ2QsWUFBWTtvQkFDWixlQUFlO29CQUNmLFdBQVc7b0JBQ1gsc0JBQXNCO2lCQUN2QjthQUNGO1lBQ0QsTUFBTSxFQUFFLEtBQUssRUFBRSw4REFBOEQ7U0FDOUUsQ0FBQyxDQUFBO1FBRUYscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFO1lBQzFDLElBQUksRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLFlBQVk7WUFDMUMsZUFBZSxFQUFFO2dCQUNmLDZCQUE2QixFQUFFLEtBQUs7Z0JBQ3BDLDhCQUE4QixFQUFFLHdFQUF3RTtnQkFDeEcsOEJBQThCLEVBQUUsK0JBQStCO2FBQ2hFO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsNEJBQTRC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RUFBRTtZQUNuRCxVQUFVO1lBQ1YsU0FBUyxFQUFFLE1BQU07U0FDbEIsQ0FBQyxDQUFBO1FBRUYsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQTtJQUVsQyxDQUFDO0NBQ0Y7QUE5dEJELDRCQTh0QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5J1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJ1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5pbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyB7XG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sXG4gIHVzZXJUYWJsZTogZHluYW1vZGIuVGFibGVcbiAgc29sdXRpb25UYWJsZTogZHluYW1vZGIuVGFibGVcbiAgcGFydG5lckFwcGxpY2F0aW9uVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHRva2VuVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICBwYXltZW50VHJhbnNhY3Rpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHVzZXJTZXNzaW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSAvLyBORVc6IEFuYWx5dGljcyB0YWJsZXNcbiAgYXBpTWV0cmljc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSAvLyBORVc6IEFuYWx5dGljcyB0YWJsZXNcbiAgc3Vic2NyaXB0aW9uSGlzdG9yeVRhYmxlOiBkeW5hbW9kYi5UYWJsZSAvLyBORVc6IFN1YnNjcmlwdGlvbiBoaXN0b3J5XG4gIGNvbXBhbnlTZXR0aW5nc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSAvLyBORVc6IEZvciBHU1QgaW52b2ljZXNcbiAgYXNzZXRzQnVja2V0OiBzMy5CdWNrZXRcbiAgaW52b2ljZUJ1Y2tldDogczMuQnVja2V0IC8vIE5FVzogRm9yIFBERiBpbnZvaWNlc1xufVxuXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGlcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBpU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZClcblxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheVxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnTWFya2V0cGxhY2VBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ01hcmtldHBsYWNlIEFQSScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBmb3IgbWFya2V0cGxhY2UgcGxhdGZvcm0nLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgJ1gtQW16LURhdGUnLFxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcbiAgICAgICAgICAnWC1BcGktS2V5JyxcbiAgICAgICAgICAnWC1BbXotU2VjdXJpdHktVG9rZW4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGRlcGxveTogZmFsc2UsIC8vIERpc2FibGUgYXV0b21hdGljIGRlcGxveW1lbnQgdG8gYXZvaWQgY2lyY3VsYXIgZGVwZW5kZW5jaWVzXG4gICAgfSlcblxuICAgIC8vIEFkZCBDT1JTIHN1cHBvcnQgZm9yIDQwMSByZXNwb25zZXNcbiAgICB0aGlzLmFwaS5hZGRHYXRld2F5UmVzcG9uc2UoJ1VuYXV0aG9yaXplZCcsIHtcbiAgICAgIHR5cGU6IGFwaWdhdGV3YXkuUmVzcG9uc2VUeXBlLlVOQVVUSE9SSVpFRCxcbiAgICAgIHJlc3BvbnNlSGVhZGVyczoge1xuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbidcIixcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMnXCIsXG4gICAgICB9LFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgQ29nbml0byBBdXRob3JpemVyXG4gICAgY29uc3QgY29nbml0b0F1dGhvcml6ZXIgPSBuZXcgYXBpZ2F0ZXdheS5Db2duaXRvVXNlclBvb2xzQXV0aG9yaXplcih0aGlzLCAnQ29nbml0b0F1dGhvcml6ZXInLCB7XG4gICAgICBjb2duaXRvVXNlclBvb2xzOiBbcHJvcHMudXNlclBvb2xdLFxuICAgICAgaWRlbnRpdHlTb3VyY2U6ICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbicsXG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBleGVjdXRpb24gcm9sZVxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0xhbWJkYUV4ZWN1dGlvblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhVlBDQWNjZXNzRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgRHluYW1vREIgcGVybWlzc2lvbnNcbiAgICBwcm9wcy51c2VyVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMuc29sdXRpb25UYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSlcbiAgICBwcm9wcy5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSlcbiAgICBwcm9wcy50b2tlblRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSlcbiAgICBwcm9wcy51c2VyU2Vzc2lvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSkgLy8gTkVXOiBBbmFseXRpY3MgdGFibGVzXG4gICAgcHJvcHMuc3Vic2NyaXB0aW9uSGlzdG9yeVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKSAvLyBORVc6IFN1YnNjcmlwdGlvbiBoaXN0b3J5XG4gICAgcHJvcHMuY29tcGFueVNldHRpbmdzVGFibGUuZ3JhbnRSZWFkRGF0YShsYW1iZGFSb2xlKSAvLyBORVc6IEdTVCBjb21wYW55IHNldHRpbmdzIChyZWFkLW9ubHkpXG4gICAgcHJvcHMuYXNzZXRzQnVja2V0LmdyYW50UmVhZFdyaXRlKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMuaW52b2ljZUJ1Y2tldC5ncmFudFJlYWRXcml0ZShsYW1iZGFSb2xlKSAvLyBORVc6IEludm9pY2Ugc3RvcmFnZVxuXG4gICAgLy8gR3JhbnQgQ29nbml0byBwZXJtaXNzaW9ucyBmb3IgdXNlciBtYW5hZ2VtZW50XG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGlzYWJsZVVzZXInLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5FbmFibGVVc2VyJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMudXNlclBvb2wudXNlclBvb2xBcm5dLFxuICAgIH0pKVxuXG4gICAgLy8gR3JhbnQgU2VjcmV0cyBNYW5hZ2VyIHBlcm1pc3Npb25zIGZvciBQaG9uZVBlIGNyZWRlbnRpYWxzXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gQ2FuIGJlIHJlc3RyaWN0ZWQgdG8gc3BlY2lmaWMgc2VjcmV0IEFSTiBpZiBuZWVkZWRcbiAgICB9KSlcblxuICAgIC8vIEdyYW50IFNFUyBwZXJtaXNzaW9ucyBmb3IgZW1haWwgbm90aWZpY2F0aW9uc1xuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnc2VzOlNlbmRFbWFpbCcsXG4gICAgICAgICdzZXM6U2VuZFJhd0VtYWlsJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBZb3UgbWlnaHQgd2FudCB0byByZXN0cmljdCB0aGlzIHRvIHNwZWNpZmljIGVtYWlsIGFkZHJlc3Nlc1xuICAgIH0pKVxuXG4gICAgLy8gR3JhbnQgQmVkcm9jayBwZXJtaXNzaW9ucyBmb3IgQUkgaW5zaWdodHNcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMTo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MCcsXG4gICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0xOjpmb3VuZGF0aW9uLW1vZGVsL2FtYXpvbi5ub3ZhLXByby12MTowJ1xuICAgICAgXSxcbiAgICB9KSlcbiAgICBcbiAgICAvLyBHcmFudCBDbG91ZFdhdGNoIHBlcm1pc3Npb25zIGZvciBBUEkgbWV0cmljc1xuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnY2xvdWR3YXRjaDpHZXRNZXRyaWNTdGF0aXN0aWNzJyxcbiAgICAgICAgJ2Nsb3Vkd2F0Y2g6TGlzdE1ldHJpY3MnXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICB9KSlcblxuICAgIC8vIEF1dGggTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IHJlZ2lzdGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdSZWdpc3RlckZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncmVnaXN0ZXIuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfUE9PTF9JRDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVE9LRU5fU0VDUkVUOiAnbWFya2V0cGxhY2UtY29udHJvbC1wbGFuZS1zZWNyZXQtMjAyNScsIC8vIEluIHByb2R1Y3Rpb24sIHVzZSBBV1MgU2VjcmV0cyBNYW5hZ2VyXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICB9KVxuXG4gICAgY29uc3QgcHJvZmlsZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUHJvZmlsZUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncHJvZmlsZS5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgIH0pXG5cbiAgICAvLyBVc2VyIE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgdXNlck1hbmFnZW1lbnRGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VzZXJNYW5hZ2VtZW50RnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICd1c2VyLW1hbmFnZW1lbnQuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfUE9PTF9JRDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBQYXJ0bmVyIEFwcGxpY2F0aW9uIExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwYXJ0bmVyLWFwcGxpY2F0aW9uLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEFSVE5FUl9BUFBMSUNBVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgRlJPTV9FTUFJTDogJ25vcmVwbHlAbWFya2V0cGxhY2UuY29tJywgLy8gVXBkYXRlIHdpdGggeW91ciB2ZXJpZmllZCBTRVMgZW1haWxcbiAgICAgICAgQURNSU5fRU1BSUw6ICdhZG1pbkBtYXJrZXRwbGFjZS5jb20nLCAvLyBVcGRhdGUgd2l0aCBhZG1pbiBlbWFpbFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIEdlbmVyYXRlIFNvbHV0aW9uIFRva2VuIExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IGdlbmVyYXRlU29sdXRpb25Ub2tlbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2VuZXJhdGVTb2x1dGlvblRva2VuRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi10b2tlbi1nZW5lcmF0b3IuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS90b2tlbnMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRPS0VOX1RBQkxFOiBwcm9wcy50b2tlblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBTb2x1dGlvbiBUb2tlbiBWYWxpZGF0b3IgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgdmFsaWRhdGVUb2tlbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnU29sdXRpb25Ub2tlblZhbGlkYXRvckZ1bmN0aW9uMicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3NvbHV0aW9uLXRva2VuLXZhbGlkYXRvci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gUGF5bWVudCBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBwYXltZW50SW5pdGlhdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BheW1lbnRJbml0aWF0ZUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnaW5pdGlhdGUuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgU09MVVRJT05fVEFCTEVfTkFNRTogcHJvcHMuc29sdXRpb25UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEFXU19SRUdJT05fTkFNRTogJ3VzLXdlc3QtMScsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gUGF5bWVudCBTdGF0dXMgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgcGF5bWVudFN0YXR1c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGF5bWVudFN0YXR1c0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnc3RhdHVzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcGF5bWVudHMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gVXBncmFkZSB0byBQcm8gTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgdXBncmFkZVRvUHJvRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGdyYWRlVG9Qcm9GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3VwZ3JhZGUtdG8tcHJvLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcGF5bWVudHMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBV1NfUkVHSU9OX05BTUU6ICd1cy13ZXN0LTEnLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFBheW1lbnQgQ2FsbGJhY2sgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgcGF5bWVudENhbGxiYWNrRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50Q2FsbGJhY2tGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3BheW1lbnQtY2FsbGJhY2suaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gQ2hlY2sgVXNlciBMaW1pdHMgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgY2hlY2tVc2VyTGltaXRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDaGVja1VzZXJMaW1pdHNGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2NoZWNrLXVzZXItbGltaXRzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBJbmNyZW1lbnQgVXNhZ2UgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgaW5jcmVtZW50VXNhZ2VGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0luY3JlbWVudFVzYWdlRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmNyZW1lbnQtdXNhZ2UuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENhdGFsb2cgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGNhdGFsb2dGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NhdGFsb2dGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2NhdGFsb2cuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9jYXRhbG9nJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVNTRVRTX0JVQ0tFVF9OQU1FOiBwcm9wcy5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBTb2x1dGlvbiBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnU29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi1tYW5hZ2VtZW50LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvY2F0YWxvZycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU09MVVRJT05fVEFCTEVfTkFNRTogcHJvcHMuc29sdXRpb25UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVNTRVRTX0JVQ0tFVF9OQU1FOiBwcm9wcy5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgRlJPTV9FTUFJTDogJ25vcmVwbHlAbWFya2V0cGxhY2UuY29tJyxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBBZG1pbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBhZG1pbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQWRtaW5GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2FkbWluLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYWRtaW4nKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJTX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTT0xVVElPTlNfVEFCTEU6IHByb3BzLnNvbHV0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVJUTkVSX0FQUExJQ0FUSU9OX1RBQkxFX05BTUU6IHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBUb2tlbiBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHRva2VuTWFuYWdlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVG9rZW5NYW5hZ2VyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICd0b2tlbi1tYW5hZ2VyLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvdG9rZW5zJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUT0tFTl9UQUJMRV9OQU1FOiBwcm9wcy50b2tlblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENvbnRyb2wgUGxhbmUgVG9rZW4gR2VuZXJhdGlvbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBzb2x1dGlvblRva2VuR2VuZXJhdG9yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvblRva2VuR2VuZXJhdG9yRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi10b2tlbi1nZW5lcmF0b3IuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS90b2tlbnMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRPS0VOX1NFQ1JFVDogJ21hcmtldHBsYWNlLWNvbnRyb2wtcGxhbmUtc2VjcmV0LTIwMjUnLCAvLyBJbiBwcm9kdWN0aW9uLCB1c2UgQVdTIFNlY3JldHMgTWFuYWdlclxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENvbnRyb2wgUGxhbmUgVG9rZW4gVmFsaWRhdGlvbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBzb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi10b2tlbi12YWxpZGF0b3IuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS90b2tlbnMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNVQlNDUklQVElPTl9ISVNUT1JZX1RBQkxFOiBwcm9wcy5zdWJzY3JpcHRpb25IaXN0b3J5VGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NFU1NJT05TX1RBQkxFX05BTUU6IHByb3BzLnVzZXJTZXNzaW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgRU5BQkxFX0xPQ0FUSU9OX1RSQUNLSU5HOiAndHJ1ZScsXG4gICAgICAgIElQX1NBTFQ6ICdtYXJrZXRwbGFjZS1sb2NhdGlvbi1zYWx0LTIwMjUnXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gUGhvbmVQZSBQYXltZW50IEZ1bmN0aW9uc1xuICAgIGNvbnN0IHBob25lUGVXZWJob29rRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQaG9uZVBlV2ViaG9va0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncGhvbmVwZS13ZWJob29rLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcGF5bWVudHMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBUT0tFTl9TRUNSRVQ6ICdtYXJrZXRwbGFjZS1jb250cm9sLXBsYW5lLXNlY3JldC0yMDI1JyxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBDYXNoZnJlZSBXZWJob29rIEZ1bmN0aW9uXG4gICAgY29uc3QgY2FzaGZyZWVXZWJob29rRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDYXNoZnJlZVdlYmhvb2tGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2Nhc2hmcmVlLXdlYmhvb2suaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNVQlNDUklQVElPTl9ISVNUT1JZX1RBQkxFOiBwcm9wcy5zdWJzY3JpcHRpb25IaXN0b3J5VGFibGUudGFibGVOYW1lLFxuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgSU5WT0lDRV9MQU1CREFfTkFNRTogJ01hcmtldHBsYWNlU3RhY2stQ2xlYW4tSW52b2ljZUdlbmVyYXRpb25GdW5jdGlvbicsIC8vIFdpbGwgYmUgdXBkYXRlZCBhZnRlciBkZXBsb3lcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBJbnZvaWNlIEdlbmVyYXRpb24gTGFtYmRhIEZ1bmN0aW9uIChORVc6IEZvciBHU1QgaW52b2ljZXMpXG4gICAgY29uc3QgaW52b2ljZUdlbmVyYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0ludm9pY2VHZW5lcmF0aW9uRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdnZW5lcmF0ZS1pbnZvaWNlLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcGF5bWVudHMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIENPTVBBTllfU0VUVElOR1NfVEFCTEU6IHByb3BzLmNvbXBhbnlTZXR0aW5nc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIElOVk9JQ0VfQlVDS0VUOiBwcm9wcy5pbnZvaWNlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgTGFtYmRhIGludm9rZSBwZXJtaXNzaW9uIHRvIHdlYmhvb2tcbiAgICBpbnZvaWNlR2VuZXJhdGlvbkZ1bmN0aW9uLmdyYW50SW52b2tlKGNhc2hmcmVlV2ViaG9va0Z1bmN0aW9uKVxuXG4gICAgY29uc3QgcGF5bWVudFJlY29uY2lsaWF0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50UmVjb25jaWxpYXRpb25GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3BheW1lbnQtcmVjb25jaWxpYXRpb24uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksIC8vIDUgbWludXRlcyBmb3IgcHJvY2Vzc2luZyBtdWx0aXBsZSBwYXltZW50c1xuICAgIH0pXG5cbiAgICBjb25zdCBwaG9uZVBlUmVjb25jaWxpYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Bob25lUGVSZWNvbmNpbGlhdGlvbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncGhvbmVwZS1yZWNvbmNpbGlhdGlvbi5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEhPTkVQRV9FTlZJUk9OTUVOVDogJ3NhbmRib3gnLCAvLyBDaGFuZ2UgdG8gJ3Byb2R1Y3Rpb24nIGZvciBsaXZlXG4gICAgICAgIFBIT05FUEVfQVVUSF9UT0tFTjogJ3lvdXItcGhvbmVwZS1hdXRoLXRva2VuJywgLy8gVXNlIEFXUyBTZWNyZXRzIE1hbmFnZXIgaW4gcHJvZHVjdGlvblxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgfSlcblxuICAgIC8vIEFuYWx5dGljcyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYnVzaW5lc3NNZXRyaWNzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdCdXNpbmVzc01ldHJpY3NGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2J1c2luZXNzLW1ldHJpY3MuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hbmFseXRpY3MnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIE1BUktFVFBMQUNFX1VTRVJTX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TRVNTSU9OU19UQUJMRTogcHJvcHMudXNlclNlc3Npb25zVGFibGUudGFibGVOYW1lXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgY29uc3QgZ2VvZ3JhcGhpY0FuYWx5dGljc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2VvZ3JhcGhpY0FuYWx5dGljc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnZ2VvZ3JhcGhpYy1hbmFseXRpY3MuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hbmFseXRpY3MnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NFU1NJT05TX1RBQkxFOiBwcm9wcy51c2VyU2Vzc2lvbnNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICBjb25zdCB1c2FnZUFuYWx5dGljc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXNhZ2VBbmFseXRpY3NGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3VzYWdlLWFuYWx5dGljcy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2FuYWx5dGljcycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TRVNTSU9OU19UQUJMRTogcHJvcHMudXNlclNlc3Npb25zVGFibGUudGFibGVOYW1lXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgY29uc3QgbXNtZUtwaUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTXNtZUtwaUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnbXNtZS1rcGlzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYW5hbHl0aWNzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBNQVJLRVRQTEFDRV9VU0VSU19UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU0VTU0lPTlNfVEFCTEU6IHByb3BzLnVzZXJTZXNzaW9uc1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIEFQSSBSb3V0ZXNcbiAgICBjb25zdCBhdXRoQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpXG4gICAgY29uc3QgY2F0YWxvZ0FwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2NhdGFsb2cnKVxuICAgIGNvbnN0IHVzZXJBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd1c2VyJywge1xuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgJ1gtQW16LURhdGUnLCBcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtQXBpLUtleScsXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSlcbiAgICBjb25zdCBhZG1pbkFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FkbWluJylcbiAgICBjb25zdCBwYXJ0bmVyQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGFydG5lcicpXG4gICAgY29uc3QgcGF5bWVudHNBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdwYXltZW50cycsIHtcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxuICAgICAgICAgICdYLUFtei1EYXRlJyxcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtQXBpLUtleScsXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcbiAgICAgICAgICAnWC1BbXotVXNlci1BZ2VudCdcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSlcbiAgICBjb25zdCBhcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FwaScpXG5cbiAgICAvLyBQYXltZW50IHJvdXRlc1xuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdpbml0aWF0ZScpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRJbml0aWF0ZUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgnc3RhdHVzJykuYWRkUmVzb3VyY2UoJ3t0cmFuc2FjdGlvbklkfScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudFN0YXR1c0Z1bmN0aW9uKSlcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgndXBncmFkZS10by1wcm8nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGdyYWRlVG9Qcm9GdW5jdGlvbikpXG4gICAgXG4gICAgLy8gUGhvbmVQZSB3ZWJob29rIHJvdXRlIChubyBhdXRoIHJlcXVpcmVkKVxuICAgIGNvbnN0IHBob25lUGVXZWJob29rUmVzb3VyY2UgPSBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgncGhvbmVwZS13ZWJob29rJylcbiAgICBwaG9uZVBlV2ViaG9va1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBob25lUGVXZWJob29rRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSlcblxuICAgIC8vIENhc2hmcmVlIHdlYmhvb2sgcm91dGUgKG5vIGF1dGggcmVxdWlyZWQpXG4gICAgY29uc3QgY2FzaGZyZWVXZWJob29rUmVzb3VyY2UgPSBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgnY2FzaGZyZWUtd2ViaG9vaycpXG4gICAgY2FzaGZyZWVXZWJob29rUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2FzaGZyZWVXZWJob29rRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSlcblxuICAgIC8vIFBob25lUGUgcmVjb25jaWxpYXRpb24gcm91dGUgKHByb3RlY3RlZClcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgncmVjb25jaWxpYXRpb24nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwaG9uZVBlUmVjb25jaWxpYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBQYXltZW50IGNhbGxiYWNrIC0gbm8gYXV0aCByZXF1aXJlZCBmb3Igd2ViaG9va3NcbiAgICBjb25zdCBjYWxsYmFja1Jlc291cmNlID0gcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ2NhbGxiYWNrJylcbiAgICBjYWxsYmFja1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudENhbGxiYWNrRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSkgLy8gRm9yIGRpcmVjdCBjYWxsYmFja3NcbiAgICBjYWxsYmFja1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRDYWxsYmFja0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pIC8vIEZvciBQaG9uZVBlIHdlYmhvb2tzXG5cbiAgICAvLyBVc2VyIGxpbWl0cyBhbmQgdXNhZ2UgdHJhY2tpbmcgcm91dGVzIChmb3IgRkFJU1MgaW50ZWdyYXRpb24pXG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2NoZWNrLXVzZXItbGltaXRzJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2hlY2tVc2VyTGltaXRzRnVuY3Rpb24pKVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdpbmNyZW1lbnQtdXNhZ2UnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihpbmNyZW1lbnRVc2FnZUZ1bmN0aW9uKSlcblxuICAgIC8vIEF1dGggcm91dGVzXG4gICAgYXV0aEFwaS5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyZWdpc3RlckZ1bmN0aW9uKSlcbiAgICBcbiAgICAvLyBDb250cm9sIFBsYW5lIEFQSSByb3V0ZXNcbiAgICBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZ2VuZXJhdGUtc29sdXRpb24tdG9rZW4nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZW5lcmF0ZVNvbHV0aW9uVG9rZW5GdW5jdGlvbikpXG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2dlbmVyYXRlLXRva2VuJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2VuZXJhdGVTb2x1dGlvblRva2VuRnVuY3Rpb24pKSAvLyBGcm9udGVuZCBjb21wYXRpYmlsaXR5XG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3ZhbGlkYXRlLXNvbHV0aW9uLXRva2VuJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc29sdXRpb25Ub2tlblZhbGlkYXRvckZ1bmN0aW9uKSlcbiAgICBcbiAgICAvLyBVc2VyIHJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IHByb2ZpbGVSZXNvdXJjZSA9IHVzZXJBcGkuYWRkUmVzb3VyY2UoJ3Byb2ZpbGUnKVxuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb2ZpbGVGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvZmlsZUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIFVzZXIgbWFuYWdlbWVudCByb3V0ZXNcbiAgICBjb25zdCB1c2Vyc1Jlc291cmNlID0gdXNlckFwaS5hZGRSZXNvdXJjZSgne3VzZXJJZH0nKVxuICAgIHVzZXJzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1c2VyTWFuYWdlbWVudEZ1bmN0aW9uKSlcbiAgICBcbiAgICAvLyBBZG1pbiB1c2VyIG1hbmFnZW1lbnQgcm91dGVzIChwcm90ZWN0ZWQpXG4gICAgY29uc3QgYWRtaW5Vc2Vyc1Jlc291cmNlID0gYWRtaW5BcGkuYWRkUmVzb3VyY2UoJ3VzZXJzJylcbiAgICBhZG1pblVzZXJzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1c2VyTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhZG1pblVzZXJzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JykuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1c2VyTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIFBhcnRuZXIgYXBwbGljYXRpb24gcm91dGVzXG4gICAgY29uc3QgYXBwbGljYXRpb25zUmVzb3VyY2UgPSBwYXJ0bmVyQXBpLmFkZFJlc291cmNlKCdhcHBsaWNhdGlvbnMnKVxuICAgIGFwcGxpY2F0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBjb25zdCBhcHBsaWNhdGlvblJlc291cmNlID0gYXBwbGljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3thcHBsaWNhdGlvbklkfScpXG4gICAgYXBwbGljYXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhcHBsaWNhdGlvblJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gQWRtaW4gcGFydG5lciBhcHBsaWNhdGlvbiByb3V0ZXNcbiAgICBjb25zdCBhZG1pbkFwcGxpY2F0aW9uc1Jlc291cmNlID0gYWRtaW5BcGkuYWRkUmVzb3VyY2UoJ2FwcGxpY2F0aW9ucycpXG4gICAgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnNDAxJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pXG4gICAgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2FwcGxpY2F0aW9uSWR9JykuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIENhdGFsb2cgcm91dGVzIChwdWJsaWMpXG4gICAgY2F0YWxvZ0FwaS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbikpXG4gICAgY2F0YWxvZ0FwaS5hZGRSZXNvdXJjZSgnc2VhcmNoJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ2NhdGVnb3JpZXMnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbikpXG4gICAgY2F0YWxvZ0FwaS5hZGRSZXNvdXJjZSgne3NvbHV0aW9uSWR9JykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxuICAgIFxuICAgIC8vIEltYWdlIHVwbG9hZCByb3V0ZSAocHJvdGVjdGVkKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3VwbG9hZC1pbWFnZScpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBQYXJ0bmVyIHNvbHV0aW9uIG1hbmFnZW1lbnQgcm91dGVzIChwcm90ZWN0ZWQpXG4gICAgY29uc3QgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlID0gcGFydG5lckFwaS5hZGRSZXNvdXJjZSgnc29sdXRpb25zJylcbiAgICBwYXJ0bmVyU29sdXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBwYXJ0bmVyU29sdXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGNvbnN0IHBhcnRuZXJTb2x1dGlvblJlc291cmNlID0gcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7c29sdXRpb25JZH0nKVxuICAgIHBhcnRuZXJTb2x1dGlvblJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBwYXJ0bmVyU29sdXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBBZG1pbiBzb2x1dGlvbiBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IGFkbWluU29sdXRpb25zUmVzb3VyY2UgPSBhZG1pbkFwaS5hZGRSZXNvdXJjZSgnc29sdXRpb25zJylcbiAgICBhZG1pblNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICc0MDEnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSlcbiAgICBjb25zdCBhZG1pblNvbHV0aW9uUmVzb3VyY2UgPSBhZG1pblNvbHV0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7c29sdXRpb25JZH0nKVxuICAgIGFkbWluU29sdXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIFxuICAgIC8vIEFkbWluIG1pZ3JhdGlvbiByb3V0ZXNcbiAgICBjb25zdCBhZG1pbk1pZ3JhdGVSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCdtaWdyYXRlLXVzZXItY291bnRyaWVzJylcbiAgICBhZG1pbk1pZ3JhdGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIFRva2VuIE1hbmFnZW1lbnQgQVBJIFJvdXRlcyAoZm9yIEZBSVNTIGludGVncmF0aW9uKVxuICAgIGNvbnN0IHRyYWNrVXNhZ2VSZXNvdXJjZSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCd0cmFjay11c2FnZScpXG4gICAgdHJhY2tVc2FnZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRva2VuTWFuYWdlckZ1bmN0aW9uKSlcblxuICAgIC8vIEFkbWluIHRva2VuIG1hbmFnZW1lbnQgcm91dGVzXG4gICAgY29uc3QgdXNlclRva2Vuc1Jlc291cmNlID0gYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VzZXItdG9rZW5zJykuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JylcbiAgICB1c2VyVG9rZW5zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0b2tlbk1hbmFnZXJGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBBbmFseXRpY3MgQVBJIFJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IGFuYWx5dGljc0FwaSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdhbmFseXRpY3MnKVxuICAgIGFuYWx5dGljc0FwaS5hZGRSZXNvdXJjZSgnYnVzaW5lc3MtbWV0cmljcycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYnVzaW5lc3NNZXRyaWNzRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIFxuICAgIC8vIFB1YmxpYyBmb3VuZGVyIGRhc2hib2FyZCBlbmRwb2ludCAobm8gYXV0aCByZXF1aXJlZClcbiAgICBjb25zdCBmb3VuZGVyQXBpID0gYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2ZvdW5kZXInKVxuICAgIGZvdW5kZXJBcGkuYWRkUmVzb3VyY2UoJ21ldHJpY3MnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJ1c2luZXNzTWV0cmljc0Z1bmN0aW9uKSlcbiAgICBhbmFseXRpY3NBcGkuYWRkUmVzb3VyY2UoJ2dlb2dyYXBoaWMnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdlb2dyYXBoaWNBbmFseXRpY3NGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYW5hbHl0aWNzQXBpLmFkZFJlc291cmNlKCd1c2FnZScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNhZ2VBbmFseXRpY3NGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYW5hbHl0aWNzQXBpLmFkZFJlc291cmNlKCdtc21lLWtwaXMnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKG1zbWVLcGlGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBNYW51YWwgZGVwbG95bWVudCB0byBhdm9pZCBjaXJjdWxhciBkZXBlbmRlbmNpZXNcbiAgICBjb25zdCBkZXBsb3ltZW50ID0gbmV3IGFwaWdhdGV3YXkuRGVwbG95bWVudCh0aGlzLCAnQXBpRGVwbG95bWVudCcsIHtcbiAgICAgIGFwaTogdGhpcy5hcGksXG4gICAgICBkZXNjcmlwdGlvbjogYERlcGxveW1lbnQgJHtEYXRlLm5vdygpfWAsXG4gICAgfSlcblxuICAgIGNvbnN0IHN0YWdlID0gbmV3IGFwaWdhdGV3YXkuU3RhZ2UodGhpcywgJ0FwaVN0YWdlJywge1xuICAgICAgZGVwbG95bWVudCxcbiAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxuICAgIH0pXG5cbiAgICAvLyBTZXQgdGhlIGRlcGxveW1lbnQgc3RhZ2Ugb24gdGhlIEFQSVxuICAgIHRoaXMuYXBpLmRlcGxveW1lbnRTdGFnZSA9IHN0YWdlXG5cbiAgfVxufSJdfQ==