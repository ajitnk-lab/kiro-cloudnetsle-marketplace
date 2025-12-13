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
            deployOptions: {
                stageName: 'prod',
            },
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
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFrQztBQUNsQyx1RUFBd0Q7QUFDeEQsK0RBQWdEO0FBSWhELHlEQUEwQztBQUMxQywyQ0FBc0M7QUFrQnRDLE1BQWEsUUFBUyxTQUFRLHNCQUFTO0lBR3JDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBb0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVoQixxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hELFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsV0FBVyxFQUFFLDhCQUE4QjtZQUMzQywyQkFBMkIsRUFBRTtnQkFDM0IsWUFBWSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVztnQkFDekMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVztnQkFDekMsWUFBWSxFQUFFO29CQUNaLGNBQWM7b0JBQ2QsWUFBWTtvQkFDWixlQUFlO29CQUNmLFdBQVc7b0JBQ1gsc0JBQXNCO2lCQUN2QjthQUNGO1lBQ0QsYUFBYSxFQUFFO2dCQUNiLFNBQVMsRUFBRSxNQUFNO2FBQ2xCO1NBQ0YsQ0FBQyxDQUFBO1FBRUYscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFO1lBQzFDLElBQUksRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLFlBQVk7WUFDMUMsZUFBZSxFQUFFO2dCQUNmLDZCQUE2QixFQUFFLEtBQUs7Z0JBQ3BDLDhCQUE4QixFQUFFLHdFQUF3RTtnQkFDeEcsOEJBQThCLEVBQUUsK0JBQStCO2FBQ2hFO1NBQ0YsQ0FBQyxDQUFBO1FB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Q0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFO1lBQ3ZILFVBQVUsRUFBRSxpQkFBaUI7U0FDOUIsQ0FBQyxDQUFBO1FBRUYsdURBQXVEO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDckQsVUFBVSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQTtRQUM3RyxZQUFZLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsRUFBRTtZQUNySCxVQUFVLEVBQUUsaUJBQWlCO1NBQzlCLENBQUMsQ0FBQTtRQUNGLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQzNHLFVBQVUsRUFBRSxpQkFBaUI7U0FDOUIsQ0FBQyxDQUFBO1FBQ0YsWUFBWSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ3hHLFVBQVUsRUFBRSxpQkFBaUI7U0FDOUIsQ0FBQyxDQUFBO0lBRUosQ0FBQztDQUNGO0FBbHRCRCw0QkFrdEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSdcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJ1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0bydcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJ1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuaW50ZXJmYWNlIEFwaVN0YWNrUHJvcHMge1xuICB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbFxuICB1c2VyVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHNvbHV0aW9uVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHBhcnRuZXJBcHBsaWNhdGlvblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICB0b2tlblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICB1c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZTogZHluYW1vZGIuVGFibGVcbiAgcGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICB1c2VyU2Vzc2lvbnNUYWJsZTogZHluYW1vZGIuVGFibGUgLy8gTkVXOiBBbmFseXRpY3MgdGFibGVzXG4gIGFwaU1ldHJpY3NUYWJsZTogZHluYW1vZGIuVGFibGUgLy8gTkVXOiBBbmFseXRpY3MgdGFibGVzXG4gIHN1YnNjcmlwdGlvbkhpc3RvcnlUYWJsZTogZHluYW1vZGIuVGFibGUgLy8gTkVXOiBTdWJzY3JpcHRpb24gaGlzdG9yeVxuICBjb21wYW55U2V0dGluZ3NUYWJsZTogZHluYW1vZGIuVGFibGUgLy8gTkVXOiBGb3IgR1NUIGludm9pY2VzXG4gIGFzc2V0c0J1Y2tldDogczMuQnVja2V0XG4gIGludm9pY2VCdWNrZXQ6IHMzLkJ1Y2tldCAvLyBORVc6IEZvciBQREYgaW52b2ljZXNcbn1cblxuZXhwb3J0IGNsYXNzIEFwaVN0YWNrIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpXG5cbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXlcbiAgICB0aGlzLmFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ01hcmtldHBsYWNlQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdNYXJrZXRwbGFjZSBBUEknLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIG1hcmtldHBsYWNlIHBsYXRmb3JtJyxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxuICAgICAgICAgICdYLUFtei1EYXRlJyxcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtQXBpLUtleScsXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxuICAgICAgfSxcbiAgICB9KVxuXG4gICAgLy8gQWRkIENPUlMgc3VwcG9ydCBmb3IgNDAxIHJlc3BvbnNlc1xuICAgIHRoaXMuYXBpLmFkZEdhdGV3YXlSZXNwb25zZSgnVW5hdXRob3JpemVkJywge1xuICAgICAgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUuVU5BVVRIT1JJWkVELFxuICAgICAgcmVzcG9uc2VIZWFkZXJzOiB7XG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuJ1wiLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJ0dFVCxQT1NULFBVVCxERUxFVEUsT1BUSU9OUydcIixcbiAgICAgIH0sXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBDb2duaXRvIEF1dGhvcml6ZXJcbiAgICBjb25zdCBjb2duaXRvQXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyKHRoaXMsICdDb2duaXRvQXV0aG9yaXplcicsIHtcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFtwcm9wcy51c2VyUG9vbF0sXG4gICAgICBpZGVudGl0eVNvdXJjZTogJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uJyxcbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGV4ZWN1dGlvbiByb2xlXG4gICAgY29uc3QgbGFtYmRhUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlJyksXG4gICAgICBdLFxuICAgIH0pXG5cbiAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9uc1xuICAgIHByb3BzLnVzZXJUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSlcbiAgICBwcm9wcy5zb2x1dGlvblRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnRva2VuVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnVzZXJTZXNzaW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKSAvLyBORVc6IEFuYWx5dGljcyB0YWJsZXNcbiAgICBwcm9wcy5zdWJzY3JpcHRpb25IaXN0b3J5VGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpIC8vIE5FVzogU3Vic2NyaXB0aW9uIGhpc3RvcnlcbiAgICBwcm9wcy5jb21wYW55U2V0dGluZ3NUYWJsZS5ncmFudFJlYWREYXRhKGxhbWJkYVJvbGUpIC8vIE5FVzogR1NUIGNvbXBhbnkgc2V0dGluZ3MgKHJlYWQtb25seSlcbiAgICBwcm9wcy5hc3NldHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUobGFtYmRhUm9sZSlcbiAgICBwcm9wcy5pbnZvaWNlQnVja2V0LmdyYW50UmVhZFdyaXRlKGxhbWJkYVJvbGUpIC8vIE5FVzogSW52b2ljZSBzdG9yYWdlXG5cbiAgICAvLyBHcmFudCBDb2duaXRvIHBlcm1pc3Npb25zIGZvciB1c2VyIG1hbmFnZW1lbnRcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5EaXNhYmxlVXNlcicsXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkVuYWJsZVVzZXInLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy51c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgfSkpXG5cbiAgICAvLyBHcmFudCBTZWNyZXRzIE1hbmFnZXIgcGVybWlzc2lvbnMgZm9yIFBob25lUGUgY3JlZGVudGlhbHNcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBDYW4gYmUgcmVzdHJpY3RlZCB0byBzcGVjaWZpYyBzZWNyZXQgQVJOIGlmIG5lZWRlZFxuICAgIH0pKVxuXG4gICAgLy8gR3JhbnQgU0VTIHBlcm1pc3Npb25zIGZvciBlbWFpbCBub3RpZmljYXRpb25zXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzZXM6U2VuZEVtYWlsJyxcbiAgICAgICAgJ3NlczpTZW5kUmF3RW1haWwnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIFlvdSBtaWdodCB3YW50IHRvIHJlc3RyaWN0IHRoaXMgdG8gc3BlY2lmaWMgZW1haWwgYWRkcmVzc2VzXG4gICAgfSkpXG5cbiAgICAvLyBHcmFudCBCZWRyb2NrIHBlcm1pc3Npb25zIGZvciBBSSBpbnNpZ2h0c1xuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0xOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowJyxcbiAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTE6OmZvdW5kYXRpb24tbW9kZWwvYW1hem9uLm5vdmEtcHJvLXYxOjAnXG4gICAgICBdLFxuICAgIH0pKVxuICAgIFxuICAgIC8vIEdyYW50IENsb3VkV2F0Y2ggcGVybWlzc2lvbnMgZm9yIEFQSSBtZXRyaWNzXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdjbG91ZHdhdGNoOkdldE1ldHJpY1N0YXRpc3RpY3MnLFxuICAgICAgICAnY2xvdWR3YXRjaDpMaXN0TWV0cmljcydcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKVxuXG4gICAgLy8gQXV0aCBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JlZ2lzdGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdyZWdpc3Rlci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBUT0tFTl9TRUNSRVQ6ICdtYXJrZXRwbGFjZS1jb250cm9sLXBsYW5lLXNlY3JldC0yMDI1JywgLy8gSW4gcHJvZHVjdGlvbiwgdXNlIEFXUyBTZWNyZXRzIE1hbmFnZXJcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgIH0pXG5cbiAgICBjb25zdCBwcm9maWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQcm9maWxlRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwcm9maWxlLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgfSlcblxuICAgIC8vIFVzZXIgTWFuYWdlbWVudCBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCB1c2VyTWFuYWdlbWVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXNlck1hbmFnZW1lbnRGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3VzZXItbWFuYWdlbWVudC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFBhcnRuZXIgQXBwbGljYXRpb24gTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgcGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3BhcnRuZXItYXBwbGljYXRpb24uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQQVJUTkVSX0FQUExJQ0FUSU9OX1RBQkxFX05BTUU6IHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBGUk9NX0VNQUlMOiAnbm9yZXBseUBtYXJrZXRwbGFjZS5jb20nLCAvLyBVcGRhdGUgd2l0aCB5b3VyIHZlcmlmaWVkIFNFUyBlbWFpbFxuICAgICAgICBBRE1JTl9FTUFJTDogJ2FkbWluQG1hcmtldHBsYWNlLmNvbScsIC8vIFVwZGF0ZSB3aXRoIGFkbWluIGVtYWlsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gR2VuZXJhdGUgU29sdXRpb24gVG9rZW4gTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgZ2VuZXJhdGVTb2x1dGlvblRva2VuRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZW5lcmF0ZVNvbHV0aW9uVG9rZW5GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3NvbHV0aW9uLXRva2VuLWdlbmVyYXRvci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3Rva2VucycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVE9LRU5fVEFCTEU6IHByb3BzLnRva2VuVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFNvbHV0aW9uIFRva2VuIFZhbGlkYXRvciBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCB2YWxpZGF0ZVRva2VuRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24yJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnc29sdXRpb24tdG9rZW4tdmFsaWRhdG9yLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBQYXltZW50IExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHBheW1lbnRJbml0aWF0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGF5bWVudEluaXRpYXRlRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbml0aWF0ZS5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVdTX1JFR0lPTl9OQU1FOiAndXMtd2VzdC0xJyxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBQYXltZW50IFN0YXR1cyBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBwYXltZW50U3RhdHVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50U3RhdHVzRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzdGF0dXMuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBVcGdyYWRlIHRvIFBybyBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCB1cGdyYWRlVG9Qcm9GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZ3JhZGVUb1Byb0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAndXBncmFkZS10by1wcm8uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEFXU19SRUdJT05fTkFNRTogJ3VzLXdlc3QtMScsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gUGF5bWVudCBDYWxsYmFjayBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBwYXltZW50Q2FsbGJhY2tGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BheW1lbnRDYWxsYmFja0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncGF5bWVudC1jYWxsYmFjay5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBDaGVjayBVc2VyIExpbWl0cyBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBjaGVja1VzZXJMaW1pdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NoZWNrVXNlckxpbWl0c0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnY2hlY2stdXNlci1saW1pdHMuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIEluY3JlbWVudCBVc2FnZSBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBpbmNyZW1lbnRVc2FnZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnSW5jcmVtZW50VXNhZ2VGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2luY3JlbWVudC11c2FnZS5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gQ2F0YWxvZyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgY2F0YWxvZ0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ2F0YWxvZ0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnY2F0YWxvZy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2NhdGFsb2cnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNPTFVUSU9OX1RBQkxFX05BTUU6IHByb3BzLnNvbHV0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBU1NFVFNfQlVDS0VUX05BTUU6IHByb3BzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFNvbHV0aW9uIE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3Qgc29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvbk1hbmFnZW1lbnRGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3NvbHV0aW9uLW1hbmFnZW1lbnQuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9jYXRhbG9nJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBU1NFVFNfQlVDS0VUX05BTUU6IHByb3BzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBGUk9NX0VNQUlMOiAnbm9yZXBseUBtYXJrZXRwbGFjZS5jb20nLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIEFkbWluIExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IGFkbWluRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBZG1pbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnYWRtaW4uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hZG1pbicpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUlNfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNPTFVUSU9OU19UQUJMRTogcHJvcHMuc29sdXRpb25UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBBUlRORVJfQVBQTElDQVRJT05fVEFCTEVfTkFNRTogcHJvcHMucGFydG5lckFwcGxpY2F0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFRva2VuIE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgdG9rZW5NYW5hZ2VyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUb2tlbk1hbmFnZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3Rva2VuLW1hbmFnZXIuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS90b2tlbnMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRPS0VOX1RBQkxFX05BTUU6IHByb3BzLnRva2VuVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gQ29udHJvbCBQbGFuZSBUb2tlbiBHZW5lcmF0aW9uIExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHNvbHV0aW9uVG9rZW5HZW5lcmF0b3JGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NvbHV0aW9uVG9rZW5HZW5lcmF0b3JGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3NvbHV0aW9uLXRva2VuLWdlbmVyYXRvci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3Rva2VucycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVE9LRU5fU0VDUkVUOiAnbWFya2V0cGxhY2UtY29udHJvbC1wbGFuZS1zZWNyZXQtMjAyNScsIC8vIEluIHByb2R1Y3Rpb24sIHVzZSBBV1MgU2VjcmV0cyBNYW5hZ2VyXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gQ29udHJvbCBQbGFuZSBUb2tlbiBWYWxpZGF0aW9uIExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHNvbHV0aW9uVG9rZW5WYWxpZGF0b3JGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NvbHV0aW9uVG9rZW5WYWxpZGF0b3JGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3NvbHV0aW9uLXRva2VuLXZhbGlkYXRvci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3Rva2VucycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgU1VCU0NSSVBUSU9OX0hJU1RPUllfVEFCTEU6IHByb3BzLnN1YnNjcmlwdGlvbkhpc3RvcnlUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU0VTU0lPTlNfVEFCTEVfTkFNRTogcHJvcHMudXNlclNlc3Npb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBFTkFCTEVfTE9DQVRJT05fVFJBQ0tJTkc6ICd0cnVlJyxcbiAgICAgICAgSVBfU0FMVDogJ21hcmtldHBsYWNlLWxvY2F0aW9uLXNhbHQtMjAyNSdcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBQaG9uZVBlIFBheW1lbnQgRnVuY3Rpb25zXG4gICAgY29uc3QgcGhvbmVQZVdlYmhvb2tGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Bob25lUGVXZWJob29rRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwaG9uZXBlLXdlYmhvb2suaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRPS0VOX1NFQ1JFVDogJ21hcmtldHBsYWNlLWNvbnRyb2wtcGxhbmUtc2VjcmV0LTIwMjUnLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENhc2hmcmVlIFdlYmhvb2sgRnVuY3Rpb25cbiAgICBjb25zdCBjYXNoZnJlZVdlYmhvb2tGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0Nhc2hmcmVlV2ViaG9va0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnY2FzaGZyZWUtd2ViaG9vay5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgU1VCU0NSSVBUSU9OX0hJU1RPUllfVEFCTEU6IHByb3BzLnN1YnNjcmlwdGlvbkhpc3RvcnlUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNPTFVUSU9OX1RBQkxFX05BTUU6IHByb3BzLnNvbHV0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICBJTlZPSUNFX0xBTUJEQV9OQU1FOiAnTWFya2V0cGxhY2VTdGFjay1DbGVhbi1JbnZvaWNlR2VuZXJhdGlvbkZ1bmN0aW9uJywgLy8gV2lsbCBiZSB1cGRhdGVkIGFmdGVyIGRlcGxveVxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIEludm9pY2UgR2VuZXJhdGlvbiBMYW1iZGEgRnVuY3Rpb24gKE5FVzogRm9yIEdTVCBpbnZvaWNlcylcbiAgICBjb25zdCBpbnZvaWNlR2VuZXJhdGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnSW52b2ljZUdlbmVyYXRpb25GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2dlbmVyYXRlLWludm9pY2UuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgQ09NUEFOWV9TRVRUSU5HU19UQUJMRTogcHJvcHMuY29tcGFueVNldHRpbmdzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgSU5WT0lDRV9CVUNLRVQ6IHByb3BzLmludm9pY2VCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBHcmFudCBMYW1iZGEgaW52b2tlIHBlcm1pc3Npb24gdG8gd2ViaG9va1xuICAgIGludm9pY2VHZW5lcmF0aW9uRnVuY3Rpb24uZ3JhbnRJbnZva2UoY2FzaGZyZWVXZWJob29rRnVuY3Rpb24pXG5cbiAgICBjb25zdCBwYXltZW50UmVjb25jaWxpYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BheW1lbnRSZWNvbmNpbGlhdGlvbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncGF5bWVudC1yZWNvbmNpbGlhdGlvbi5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwKSwgLy8gNSBtaW51dGVzIGZvciBwcm9jZXNzaW5nIG11bHRpcGxlIHBheW1lbnRzXG4gICAgfSlcblxuICAgIGNvbnN0IHBob25lUGVSZWNvbmNpbGlhdGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGhvbmVQZVJlY29uY2lsaWF0aW9uRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwaG9uZXBlLXJlY29uY2lsaWF0aW9uLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcGF5bWVudHMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQSE9ORVBFX0VOVklST05NRU5UOiAnc2FuZGJveCcsIC8vIENoYW5nZSB0byAncHJvZHVjdGlvbicgZm9yIGxpdmVcbiAgICAgICAgUEhPTkVQRV9BVVRIX1RPS0VOOiAneW91ci1waG9uZXBlLWF1dGgtdG9rZW4nLCAvLyBVc2UgQVdTIFNlY3JldHMgTWFuYWdlciBpbiBwcm9kdWN0aW9uXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICB9KVxuXG4gICAgLy8gQW5hbHl0aWNzIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBidXNpbmVzc01ldHJpY3NGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0J1c2luZXNzTWV0cmljc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnYnVzaW5lc3MtbWV0cmljcy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2FuYWx5dGljcycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgTUFSS0VUUExBQ0VfVVNFUlNfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NFU1NJT05TX1RBQkxFOiBwcm9wcy51c2VyU2Vzc2lvbnNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICBjb25zdCBnZW9ncmFwaGljQW5hbHl0aWNzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZW9ncmFwaGljQW5hbHl0aWNzRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdnZW9ncmFwaGljLWFuYWx5dGljcy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2FuYWx5dGljcycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU0VTU0lPTlNfVEFCTEU6IHByb3BzLnVzZXJTZXNzaW9uc1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIGNvbnN0IHVzYWdlQW5hbHl0aWNzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVc2FnZUFuYWx5dGljc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAndXNhZ2UtYW5hbHl0aWNzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYW5hbHl0aWNzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NFU1NJT05TX1RBQkxFOiBwcm9wcy51c2VyU2Vzc2lvbnNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICBjb25zdCBtc21lS3BpRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdNc21lS3BpRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdtc21lLWtwaXMuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hbmFseXRpY3MnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIE1BUktFVFBMQUNFX1VTRVJTX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TRVNTSU9OU19UQUJMRTogcHJvcHMudXNlclNlc3Npb25zVGFibGUudGFibGVOYW1lXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gQVBJIFJvdXRlc1xuICAgIGNvbnN0IGF1dGhBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhdXRoJylcbiAgICBjb25zdCBjYXRhbG9nQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnY2F0YWxvZycpXG4gICAgY29uc3QgdXNlckFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXInLCB7XG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnWC1BbXotRGF0ZScsIFxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcbiAgICAgICAgICAnWC1BcGktS2V5JyxcbiAgICAgICAgICAnWC1BbXotU2VjdXJpdHktVG9rZW4nLFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KVxuICAgIGNvbnN0IGFkbWluQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYWRtaW4nKVxuICAgIGNvbnN0IHBhcnRuZXJBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdwYXJ0bmVyJylcbiAgICBjb25zdCBwYXltZW50c0FwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BheW1lbnRzJywge1xuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgJ1gtQW16LURhdGUnLFxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcbiAgICAgICAgICAnWC1BcGktS2V5JyxcbiAgICAgICAgICAnWC1BbXotU2VjdXJpdHktVG9rZW4nLFxuICAgICAgICAgICdYLUFtei1Vc2VyLUFnZW50J1xuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KVxuICAgIGNvbnN0IGFwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXBpJylcblxuICAgIC8vIFBheW1lbnQgcm91dGVzXG4gICAgcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ2luaXRpYXRlJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudEluaXRpYXRlRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdzdGF0dXMnKS5hZGRSZXNvdXJjZSgne3RyYW5zYWN0aW9uSWR9JykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50U3RhdHVzRnVuY3Rpb24pKVxuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCd1cGdyYWRlLXRvLXBybycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVwZ3JhZGVUb1Byb0Z1bmN0aW9uKSlcbiAgICBcbiAgICAvLyBQaG9uZVBlIHdlYmhvb2sgcm91dGUgKG5vIGF1dGggcmVxdWlyZWQpXG4gICAgY29uc3QgcGhvbmVQZVdlYmhvb2tSZXNvdXJjZSA9IHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdwaG9uZXBlLXdlYmhvb2snKVxuICAgIHBob25lUGVXZWJob29rUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGhvbmVQZVdlYmhvb2tGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICB9KVxuXG4gICAgLy8gQ2FzaGZyZWUgd2ViaG9vayByb3V0ZSAobm8gYXV0aCByZXF1aXJlZClcbiAgICBjb25zdCBjYXNoZnJlZVdlYmhvb2tSZXNvdXJjZSA9IHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdjYXNoZnJlZS13ZWJob29rJylcbiAgICBjYXNoZnJlZVdlYmhvb2tSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXNoZnJlZVdlYmhvb2tGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICB9KVxuXG4gICAgLy8gUGhvbmVQZSByZWNvbmNpbGlhdGlvbiByb3V0ZSAocHJvdGVjdGVkKVxuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdyZWNvbmNpbGlhdGlvbicpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBob25lUGVSZWNvbmNpbGlhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIFBheW1lbnQgY2FsbGJhY2sgLSBubyBhdXRoIHJlcXVpcmVkIGZvciB3ZWJob29rc1xuICAgIGNvbnN0IGNhbGxiYWNrUmVzb3VyY2UgPSBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgnY2FsbGJhY2snKVxuICAgIGNhbGxiYWNrUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50Q2FsbGJhY2tGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICB9KSAvLyBGb3IgZGlyZWN0IGNhbGxiYWNrc1xuICAgIGNhbGxiYWNrUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudENhbGxiYWNrRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBpZ2F0ZXdheS5BdXRob3JpemF0aW9uVHlwZS5OT05FXG4gICAgfSkgLy8gRm9yIFBob25lUGUgd2ViaG9va3NcblxuICAgIC8vIFVzZXIgbGltaXRzIGFuZCB1c2FnZSB0cmFja2luZyByb3V0ZXMgKGZvciBGQUlTUyBpbnRlZ3JhdGlvbilcbiAgICBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnY2hlY2stdXNlci1saW1pdHMnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjaGVja1VzZXJMaW1pdHNGdW5jdGlvbikpXG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2luY3JlbWVudC11c2FnZScpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGluY3JlbWVudFVzYWdlRnVuY3Rpb24pKVxuXG4gICAgLy8gQXV0aCByb3V0ZXNcbiAgICBhdXRoQXBpLmFkZFJlc291cmNlKCdyZWdpc3RlcicpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlZ2lzdGVyRnVuY3Rpb24pKVxuICAgIFxuICAgIC8vIENvbnRyb2wgUGxhbmUgQVBJIHJvdXRlc1xuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdnZW5lcmF0ZS1zb2x1dGlvbi10b2tlbicpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdlbmVyYXRlU29sdXRpb25Ub2tlbkZ1bmN0aW9uKSlcbiAgICBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZ2VuZXJhdGUtdG9rZW4nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZW5lcmF0ZVNvbHV0aW9uVG9rZW5GdW5jdGlvbikpIC8vIEZyb250ZW5kIGNvbXBhdGliaWxpdHlcbiAgICBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgndmFsaWRhdGUtc29sdXRpb24tdG9rZW4nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24pKVxuICAgIFxuICAgIC8vIFVzZXIgcm91dGVzIChwcm90ZWN0ZWQpXG4gICAgY29uc3QgcHJvZmlsZVJlc291cmNlID0gdXNlckFwaS5hZGRSZXNvdXJjZSgncHJvZmlsZScpXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvZmlsZUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9maWxlRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gVXNlciBtYW5hZ2VtZW50IHJvdXRlc1xuICAgIGNvbnN0IHVzZXJzUmVzb3VyY2UgPSB1c2VyQXBpLmFkZFJlc291cmNlKCd7dXNlcklkfScpXG4gICAgdXNlcnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVzZXJNYW5hZ2VtZW50RnVuY3Rpb24pKVxuICAgIFxuICAgIC8vIEFkbWluIHVzZXIgbWFuYWdlbWVudCByb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBhZG1pblVzZXJzUmVzb3VyY2UgPSBhZG1pbkFwaS5hZGRSZXNvdXJjZSgndXNlcnMnKVxuICAgIGFkbWluVXNlcnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVzZXJNYW5hZ2VtZW50RnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGFkbWluVXNlcnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3VzZXJJZH0nKS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVzZXJNYW5hZ2VtZW50RnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gUGFydG5lciBhcHBsaWNhdGlvbiByb3V0ZXNcbiAgICBjb25zdCBhcHBsaWNhdGlvbnNSZXNvdXJjZSA9IHBhcnRuZXJBcGkuYWRkUmVzb3VyY2UoJ2FwcGxpY2F0aW9ucycpXG4gICAgYXBwbGljYXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGFwcGxpY2F0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGNvbnN0IGFwcGxpY2F0aW9uUmVzb3VyY2UgPSBhcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2FwcGxpY2F0aW9uSWR9JylcbiAgICBhcHBsaWNhdGlvblJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGFwcGxpY2F0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBBZG1pbiBwYXJ0bmVyIGFwcGxpY2F0aW9uIHJvdXRlc1xuICAgIGNvbnN0IGFkbWluQXBwbGljYXRpb25zUmVzb3VyY2UgPSBhZG1pbkFwaS5hZGRSZXNvdXJjZSgnYXBwbGljYXRpb25zJylcbiAgICBhZG1pbkFwcGxpY2F0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICc0MDEnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSlcbiAgICBhZG1pbkFwcGxpY2F0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7YXBwbGljYXRpb25JZH0nKS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gQ2F0YWxvZyByb3V0ZXMgKHB1YmxpYylcbiAgICBjYXRhbG9nQXBpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCdzZWFyY2gnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbikpXG4gICAgY2F0YWxvZ0FwaS5hZGRSZXNvdXJjZSgnY2F0ZWdvcmllcycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCd7c29sdXRpb25JZH0nKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbikpXG4gICAgXG4gICAgLy8gSW1hZ2UgdXBsb2FkIHJvdXRlIChwcm90ZWN0ZWQpXG4gICAgY2F0YWxvZ0FwaS5hZGRSZXNvdXJjZSgndXBsb2FkLWltYWdlJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIFBhcnRuZXIgc29sdXRpb24gbWFuYWdlbWVudCByb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBwYXJ0bmVyU29sdXRpb25zUmVzb3VyY2UgPSBwYXJ0bmVyQXBpLmFkZFJlc291cmNlKCdzb2x1dGlvbnMnKVxuICAgIHBhcnRuZXJTb2x1dGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIHBhcnRuZXJTb2x1dGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgY29uc3QgcGFydG5lclNvbHV0aW9uUmVzb3VyY2UgPSBwYXJ0bmVyU29sdXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tzb2x1dGlvbklkfScpXG4gICAgcGFydG5lclNvbHV0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIHBhcnRuZXJTb2x1dGlvblJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIEFkbWluIHNvbHV0aW9uIG1hbmFnZW1lbnQgcm91dGVzIChwcm90ZWN0ZWQpXG4gICAgY29uc3QgYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCdzb2x1dGlvbnMnKVxuICAgIGFkbWluU29sdXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzQwMScsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KVxuICAgIGNvbnN0IGFkbWluU29sdXRpb25SZXNvdXJjZSA9IGFkbWluU29sdXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tzb2x1dGlvbklkfScpXG4gICAgYWRtaW5Tb2x1dGlvblJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgXG4gICAgLy8gQWRtaW4gbWlncmF0aW9uIHJvdXRlc1xuICAgIGNvbnN0IGFkbWluTWlncmF0ZVJlc291cmNlID0gYWRtaW5BcGkuYWRkUmVzb3VyY2UoJ21pZ3JhdGUtdXNlci1jb3VudHJpZXMnKVxuICAgIGFkbWluTWlncmF0ZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gVG9rZW4gTWFuYWdlbWVudCBBUEkgUm91dGVzIChmb3IgRkFJU1MgaW50ZWdyYXRpb24pXG4gICAgY29uc3QgdHJhY2tVc2FnZVJlc291cmNlID0gYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3RyYWNrLXVzYWdlJylcbiAgICB0cmFja1VzYWdlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odG9rZW5NYW5hZ2VyRnVuY3Rpb24pKVxuXG4gICAgLy8gQWRtaW4gdG9rZW4gbWFuYWdlbWVudCByb3V0ZXNcbiAgICBjb25zdCB1c2VyVG9rZW5zUmVzb3VyY2UgPSBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgndXNlci10b2tlbnMnKS5hZGRSZXNvdXJjZSgne3VzZXJJZH0nKVxuICAgIHVzZXJUb2tlbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRva2VuTWFuYWdlckZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIEFuYWx5dGljcyBBUEkgUm91dGVzIChwcm90ZWN0ZWQpXG4gICAgY29uc3QgYW5hbHl0aWNzQXBpID0gYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2FuYWx5dGljcycpXG4gICAgYW5hbHl0aWNzQXBpLmFkZFJlc291cmNlKCdidXNpbmVzcy1tZXRyaWNzJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihidXNpbmVzc01ldHJpY3NGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgXG4gICAgLy8gUHVibGljIGZvdW5kZXIgZGFzaGJvYXJkIGVuZHBvaW50IChubyBhdXRoIHJlcXVpcmVkKVxuICAgIGNvbnN0IGZvdW5kZXJBcGkgPSBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZm91bmRlcicpXG4gICAgZm91bmRlckFwaS5hZGRSZXNvdXJjZSgnbWV0cmljcycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYnVzaW5lc3NNZXRyaWNzRnVuY3Rpb24pKVxuICAgIGFuYWx5dGljc0FwaS5hZGRSZXNvdXJjZSgnZ2VvZ3JhcGhpYycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2VvZ3JhcGhpY0FuYWx5dGljc0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhbmFseXRpY3NBcGkuYWRkUmVzb3VyY2UoJ3VzYWdlJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1c2FnZUFuYWx5dGljc0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhbmFseXRpY3NBcGkuYWRkUmVzb3VyY2UoJ21zbWUta3BpcycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24obXNtZUtwaUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICB9XG59Il19