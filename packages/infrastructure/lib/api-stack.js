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
        props.assetsBucket.grantReadWrite(lambdaRole);
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
                API_BASE_URL: `https://${this.api.restApiId}.execute-api.us-west-1.amazonaws.com/prod`,
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
                API_BASE_URL: `https://${this.api.restApiId}.execute-api.us-west-1.amazonaws.com/prod`,
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
                SOLUTION_TABLE_NAME: props.solutionTable.tableName,
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });
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
        paymentsApi.addResource('status').addResource('{transactionId}').addMethod('GET', new apigateway.LambdaIntegration(paymentStatusFunction), {
            authorizer: cognitoAuthorizer,
        });
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
        analyticsApi.addResource('geographic').addMethod('GET', new apigateway.LambdaIntegration(geographicAnalyticsFunction), {
            authorizer: cognitoAuthorizer,
        });
        analyticsApi.addResource('usage').addMethod('GET', new apigateway.LambdaIntegration(usageAnalyticsFunction), {
            authorizer: cognitoAuthorizer,
        });
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFrQztBQUNsQyx1RUFBd0Q7QUFDeEQsK0RBQWdEO0FBSWhELHlEQUEwQztBQUMxQywyQ0FBc0M7QUFldEMsTUFBYSxRQUFTLFNBQVEsc0JBQVM7SUFHckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEQsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixXQUFXLEVBQUUsOEJBQThCO1lBQzNDLDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUU7b0JBQ1osY0FBYztvQkFDZCxZQUFZO29CQUNaLGVBQWU7b0JBQ2YsV0FBVztvQkFDWCxzQkFBc0I7aUJBQ3ZCO2FBQ0Y7WUFDRCxhQUFhLEVBQUU7Z0JBQ2IsU0FBUyxFQUFFLE1BQU07YUFDbEI7U0FDRixDQUFDLENBQUE7UUFFRixxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUU7WUFDMUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsWUFBWTtZQUMxQyxlQUFlLEVBQUU7Z0JBQ2YsNkJBQTZCLEVBQUUsS0FBSztnQkFDcEMsOEJBQThCLEVBQUUsd0VBQXdFO2dCQUN4Ryw4QkFBOEIsRUFBRSwrQkFBK0I7YUFDaEU7U0FDRixDQUFDLENBQUE7UUFF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Q0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsRUFBRTtZQUMxRixVQUFVLEVBQUUsaUJBQWlCO1NBQzlCLENBQUMsQ0FBQTtRQUVGLG1DQUFtQztRQUNuQyxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3pELFlBQVksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLEVBQUU7WUFDdkgsVUFBVSxFQUFFLGlCQUFpQjtTQUM5QixDQUFDLENBQUE7UUFDRixZQUFZLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsRUFBRTtZQUNySCxVQUFVLEVBQUUsaUJBQWlCO1NBQzlCLENBQUMsQ0FBQTtRQUNGLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQzNHLFVBQVUsRUFBRSxpQkFBaUI7U0FDOUIsQ0FBQyxDQUFBO0lBRUosQ0FBQztDQUNGO0FBenBCRCw0QkF5cEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSdcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJ1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0bydcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJ1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuaW50ZXJmYWNlIEFwaVN0YWNrUHJvcHMge1xuICB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbFxuICB1c2VyVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHNvbHV0aW9uVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHBhcnRuZXJBcHBsaWNhdGlvblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICB0b2tlblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICB1c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZTogZHluYW1vZGIuVGFibGVcbiAgcGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICB1c2VyU2Vzc2lvbnNUYWJsZTogZHluYW1vZGIuVGFibGUgLy8gTkVXOiBBbmFseXRpY3MgdGFibGVzXG4gIGFwaU1ldHJpY3NUYWJsZTogZHluYW1vZGIuVGFibGUgLy8gTkVXOiBBbmFseXRpY3MgdGFibGVzXG4gIGFzc2V0c0J1Y2tldDogczMuQnVja2V0XG59XG5cbmV4cG9ydCBjbGFzcyBBcGlTdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaVxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKVxuXG4gICAgLy8gQ3JlYXRlIEFQSSBHYXRld2F5XG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdNYXJrZXRwbGFjZUFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnTWFya2V0cGxhY2UgQVBJJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBtYXJrZXRwbGFjZSBwbGF0Zm9ybScsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxuICAgICAgICAgICdYLUFwaS1LZXknLFxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6ICdwcm9kJyxcbiAgICAgIH0sXG4gICAgfSlcblxuICAgIC8vIEFkZCBDT1JTIHN1cHBvcnQgZm9yIDQwMSByZXNwb25zZXNcbiAgICB0aGlzLmFwaS5hZGRHYXRld2F5UmVzcG9uc2UoJ1VuYXV0aG9yaXplZCcsIHtcbiAgICAgIHR5cGU6IGFwaWdhdGV3YXkuUmVzcG9uc2VUeXBlLlVOQVVUSE9SSVpFRCxcbiAgICAgIHJlc3BvbnNlSGVhZGVyczoge1xuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbidcIixcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMnXCIsXG4gICAgICB9LFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgQ29nbml0byBBdXRob3JpemVyXG4gICAgY29uc3QgY29nbml0b0F1dGhvcml6ZXIgPSBuZXcgYXBpZ2F0ZXdheS5Db2duaXRvVXNlclBvb2xzQXV0aG9yaXplcih0aGlzLCAnQ29nbml0b0F1dGhvcml6ZXInLCB7XG4gICAgICBjb2duaXRvVXNlclBvb2xzOiBbcHJvcHMudXNlclBvb2xdLFxuICAgICAgaWRlbnRpdHlTb3VyY2U6ICdtZXRob2QucmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbicsXG4gICAgfSlcblxuICAgIC8vIExhbWJkYSBleGVjdXRpb24gcm9sZVxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0xhbWJkYUV4ZWN1dGlvblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhVlBDQWNjZXNzRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgRHluYW1vREIgcGVybWlzc2lvbnNcbiAgICBwcm9wcy51c2VyVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMuc29sdXRpb25UYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSlcbiAgICBwcm9wcy5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSlcbiAgICBwcm9wcy50b2tlblRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSlcbiAgICBwcm9wcy51c2VyU2Vzc2lvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSkgLy8gTkVXOiBBbmFseXRpY3MgdGFibGVzXG4gICAgcHJvcHMuYXNzZXRzQnVja2V0LmdyYW50UmVhZFdyaXRlKGxhbWJkYVJvbGUpXG5cbiAgICAvLyBHcmFudCBDb2duaXRvIHBlcm1pc3Npb25zIGZvciB1c2VyIG1hbmFnZW1lbnRcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5EaXNhYmxlVXNlcicsXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkVuYWJsZVVzZXInLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy51c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgfSkpXG5cbiAgICAvLyBHcmFudCBTZWNyZXRzIE1hbmFnZXIgcGVybWlzc2lvbnMgZm9yIFBob25lUGUgY3JlZGVudGlhbHNcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBDYW4gYmUgcmVzdHJpY3RlZCB0byBzcGVjaWZpYyBzZWNyZXQgQVJOIGlmIG5lZWRlZFxuICAgIH0pKVxuXG4gICAgLy8gR3JhbnQgU0VTIHBlcm1pc3Npb25zIGZvciBlbWFpbCBub3RpZmljYXRpb25zXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzZXM6U2VuZEVtYWlsJyxcbiAgICAgICAgJ3NlczpTZW5kUmF3RW1haWwnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIFlvdSBtaWdodCB3YW50IHRvIHJlc3RyaWN0IHRoaXMgdG8gc3BlY2lmaWMgZW1haWwgYWRkcmVzc2VzXG4gICAgfSkpXG4gICAgXG4gICAgLy8gR3JhbnQgQ2xvdWRXYXRjaCBwZXJtaXNzaW9ucyBmb3IgQVBJIG1ldHJpY3NcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2Nsb3Vkd2F0Y2g6R2V0TWV0cmljU3RhdGlzdGljcycsXG4gICAgICAgICdjbG91ZHdhdGNoOkxpc3RNZXRyaWNzJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSkpXG5cbiAgICAvLyBBdXRoIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCByZWdpc3RlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUmVnaXN0ZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3JlZ2lzdGVyLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRPS0VOX1NFQ1JFVDogJ21hcmtldHBsYWNlLWNvbnRyb2wtcGxhbmUtc2VjcmV0LTIwMjUnLCAvLyBJbiBwcm9kdWN0aW9uLCB1c2UgQVdTIFNlY3JldHMgTWFuYWdlclxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgfSlcblxuICAgIGNvbnN0IHByb2ZpbGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Byb2ZpbGVGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3Byb2ZpbGUuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICB9KVxuXG4gICAgLy8gVXNlciBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHVzZXJNYW5hZ2VtZW50RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVc2VyTWFuYWdlbWVudEZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAndXNlci1tYW5hZ2VtZW50LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gUGFydG5lciBBcHBsaWNhdGlvbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncGFydG5lci1hcHBsaWNhdGlvbi5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFBBUlRORVJfQVBQTElDQVRJT05fVEFCTEVfTkFNRTogcHJvcHMucGFydG5lckFwcGxpY2F0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEZST01fRU1BSUw6ICdub3JlcGx5QG1hcmtldHBsYWNlLmNvbScsIC8vIFVwZGF0ZSB3aXRoIHlvdXIgdmVyaWZpZWQgU0VTIGVtYWlsXG4gICAgICAgIEFETUlOX0VNQUlMOiAnYWRtaW5AbWFya2V0cGxhY2UuY29tJywgLy8gVXBkYXRlIHdpdGggYWRtaW4gZW1haWxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBHZW5lcmF0ZSBTb2x1dGlvbiBUb2tlbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBnZW5lcmF0ZVNvbHV0aW9uVG9rZW5GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dlbmVyYXRlU29sdXRpb25Ub2tlbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnc29sdXRpb24tdG9rZW4tZ2VuZXJhdG9yLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvdG9rZW5zJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUT0tFTl9UQUJMRTogcHJvcHMudG9rZW5UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gU29sdXRpb24gVG9rZW4gVmFsaWRhdG9yIExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHZhbGlkYXRlVG9rZW5GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NvbHV0aW9uVG9rZW5WYWxpZGF0b3JGdW5jdGlvbjInLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi10b2tlbi12YWxpZGF0b3IuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFBheW1lbnQgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgcGF5bWVudEluaXRpYXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50SW5pdGlhdGVGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2luaXRpYXRlLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcGF5bWVudHMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFNPTFVUSU9OX1RBQkxFX05BTUU6IHByb3BzLnNvbHV0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBUElfQkFTRV9VUkw6IGBodHRwczovLyR7dGhpcy5hcGkucmVzdEFwaUlkfS5leGVjdXRlLWFwaS51cy13ZXN0LTEuYW1hem9uYXdzLmNvbS9wcm9kYCxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBQYXltZW50IFN0YXR1cyBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBwYXltZW50U3RhdHVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50U3RhdHVzRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzdGF0dXMuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBVcGdyYWRlIHRvIFBybyBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCB1cGdyYWRlVG9Qcm9GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZ3JhZGVUb1Byb0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAndXBncmFkZS10by1wcm8uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEFQSV9CQVNFX1VSTDogYGh0dHBzOi8vJHt0aGlzLmFwaS5yZXN0QXBpSWR9LmV4ZWN1dGUtYXBpLnVzLXdlc3QtMS5hbWF6b25hd3MuY29tL3Byb2RgLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFBheW1lbnQgQ2FsbGJhY2sgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgcGF5bWVudENhbGxiYWNrRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50Q2FsbGJhY2tGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3BheW1lbnQtY2FsbGJhY2suaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gQ2hlY2sgVXNlciBMaW1pdHMgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgY2hlY2tVc2VyTGltaXRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDaGVja1VzZXJMaW1pdHNGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2NoZWNrLXVzZXItbGltaXRzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBJbmNyZW1lbnQgVXNhZ2UgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgaW5jcmVtZW50VXNhZ2VGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0luY3JlbWVudFVzYWdlRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmNyZW1lbnQtdXNhZ2UuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENhdGFsb2cgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGNhdGFsb2dGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NhdGFsb2dGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2NhdGFsb2cuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9jYXRhbG9nJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVNTRVRTX0JVQ0tFVF9OQU1FOiBwcm9wcy5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBTb2x1dGlvbiBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnU29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi1tYW5hZ2VtZW50LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvY2F0YWxvZycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU09MVVRJT05fVEFCTEVfTkFNRTogcHJvcHMuc29sdXRpb25UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVNTRVRTX0JVQ0tFVF9OQU1FOiBwcm9wcy5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgRlJPTV9FTUFJTDogJ25vcmVwbHlAbWFya2V0cGxhY2UuY29tJyxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBBZG1pbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBhZG1pbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQWRtaW5GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2FkbWluLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYWRtaW4nKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJTX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTT0xVVElPTlNfVEFCTEU6IHByb3BzLnNvbHV0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVJUTkVSX0FQUExJQ0FUSU9OX1RBQkxFX05BTUU6IHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBUb2tlbiBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHRva2VuTWFuYWdlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVG9rZW5NYW5hZ2VyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICd0b2tlbi1tYW5hZ2VyLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvdG9rZW5zJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUT0tFTl9UQUJMRV9OQU1FOiBwcm9wcy50b2tlblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENvbnRyb2wgUGxhbmUgVG9rZW4gR2VuZXJhdGlvbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBzb2x1dGlvblRva2VuR2VuZXJhdG9yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvblRva2VuR2VuZXJhdG9yRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi10b2tlbi1nZW5lcmF0b3IuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS90b2tlbnMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRPS0VOX1NFQ1JFVDogJ21hcmtldHBsYWNlLWNvbnRyb2wtcGxhbmUtc2VjcmV0LTIwMjUnLCAvLyBJbiBwcm9kdWN0aW9uLCB1c2UgQVdTIFNlY3JldHMgTWFuYWdlclxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENvbnRyb2wgUGxhbmUgVG9rZW4gVmFsaWRhdGlvbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBzb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi10b2tlbi12YWxpZGF0b3IuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS90b2tlbnMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU0VTU0lPTlNfVEFCTEVfTkFNRTogcHJvcHMudXNlclNlc3Npb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBFTkFCTEVfTE9DQVRJT05fVFJBQ0tJTkc6ICd0cnVlJyxcbiAgICAgICAgSVBfU0FMVDogJ21hcmtldHBsYWNlLWxvY2F0aW9uLXNhbHQtMjAyNSdcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBQaG9uZVBlIFBheW1lbnQgRnVuY3Rpb25zXG4gICAgY29uc3QgcGhvbmVQZVdlYmhvb2tGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Bob25lUGVXZWJob29rRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwaG9uZXBlLXdlYmhvb2suaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRPS0VOX1NFQ1JFVDogJ21hcmtldHBsYWNlLWNvbnRyb2wtcGxhbmUtc2VjcmV0LTIwMjUnLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENhc2hmcmVlIFdlYmhvb2sgRnVuY3Rpb25cbiAgICBjb25zdCBjYXNoZnJlZVdlYmhvb2tGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0Nhc2hmcmVlV2ViaG9va0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnY2FzaGZyZWUtd2ViaG9vay5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgU09MVVRJT05fVEFCTEVfTkFNRTogcHJvcHMuc29sdXRpb25UYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgY29uc3QgcGF5bWVudFJlY29uY2lsaWF0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50UmVjb25jaWxpYXRpb25GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3BheW1lbnQtcmVjb25jaWxpYXRpb24uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksIC8vIDUgbWludXRlcyBmb3IgcHJvY2Vzc2luZyBtdWx0aXBsZSBwYXltZW50c1xuICAgIH0pXG5cbiAgICBjb25zdCBwaG9uZVBlUmVjb25jaWxpYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Bob25lUGVSZWNvbmNpbGlhdGlvbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncGhvbmVwZS1yZWNvbmNpbGlhdGlvbi5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEhPTkVQRV9FTlZJUk9OTUVOVDogJ3NhbmRib3gnLCAvLyBDaGFuZ2UgdG8gJ3Byb2R1Y3Rpb24nIGZvciBsaXZlXG4gICAgICAgIFBIT05FUEVfQVVUSF9UT0tFTjogJ3lvdXItcGhvbmVwZS1hdXRoLXRva2VuJywgLy8gVXNlIEFXUyBTZWNyZXRzIE1hbmFnZXIgaW4gcHJvZHVjdGlvblxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgfSlcblxuICAgIC8vIEFuYWx5dGljcyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgYnVzaW5lc3NNZXRyaWNzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdCdXNpbmVzc01ldHJpY3NGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2J1c2luZXNzLW1ldHJpY3MuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hbmFseXRpY3MnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NFU1NJT05TX1RBQkxFOiBwcm9wcy51c2VyU2Vzc2lvbnNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICBjb25zdCBnZW9ncmFwaGljQW5hbHl0aWNzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZW9ncmFwaGljQW5hbHl0aWNzRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdnZW9ncmFwaGljLWFuYWx5dGljcy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2FuYWx5dGljcycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU0VTU0lPTlNfVEFCTEU6IHByb3BzLnVzZXJTZXNzaW9uc1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIGNvbnN0IHVzYWdlQW5hbHl0aWNzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVc2FnZUFuYWx5dGljc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAndXNhZ2UtYW5hbHl0aWNzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYW5hbHl0aWNzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NFU1NJT05TX1RBQkxFOiBwcm9wcy51c2VyU2Vzc2lvbnNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBBUEkgUm91dGVzXG4gICAgY29uc3QgYXV0aEFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKVxuICAgIGNvbnN0IGNhdGFsb2dBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdjYXRhbG9nJylcbiAgICBjb25zdCB1c2VyQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgndXNlcicsIHtcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxuICAgICAgICAgICdYLUFtei1EYXRlJywgXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxuICAgICAgICAgICdYLUFwaS1LZXknLFxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pXG4gICAgY29uc3QgYWRtaW5BcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhZG1pbicpXG4gICAgY29uc3QgcGFydG5lckFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BhcnRuZXInKVxuICAgIGNvbnN0IHBheW1lbnRzQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGF5bWVudHMnLCB7XG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxuICAgICAgICAgICdYLUFwaS1LZXknLFxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXG4gICAgICAgICAgJ1gtQW16LVVzZXItQWdlbnQnXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pXG4gICAgY29uc3QgYXBpUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhcGknKVxuXG4gICAgLy8gUGF5bWVudCByb3V0ZXNcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgnaW5pdGlhdGUnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50SW5pdGlhdGVGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ3N0YXR1cycpLmFkZFJlc291cmNlKCd7dHJhbnNhY3Rpb25JZH0nKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRTdGF0dXNGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ3VwZ3JhZGUtdG8tcHJvJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXBncmFkZVRvUHJvRnVuY3Rpb24pKVxuICAgIFxuICAgIC8vIFBob25lUGUgd2ViaG9vayByb3V0ZSAobm8gYXV0aCByZXF1aXJlZClcbiAgICBjb25zdCBwaG9uZVBlV2ViaG9va1Jlc291cmNlID0gcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ3Bob25lcGUtd2ViaG9vaycpXG4gICAgcGhvbmVQZVdlYmhvb2tSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwaG9uZVBlV2ViaG9va0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pXG5cbiAgICAvLyBDYXNoZnJlZSB3ZWJob29rIHJvdXRlIChubyBhdXRoIHJlcXVpcmVkKVxuICAgIGNvbnN0IGNhc2hmcmVlV2ViaG9va1Jlc291cmNlID0gcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ2Nhc2hmcmVlLXdlYmhvb2snKVxuICAgIGNhc2hmcmVlV2ViaG9va1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhc2hmcmVlV2ViaG9va0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pXG5cbiAgICAvLyBQaG9uZVBlIHJlY29uY2lsaWF0aW9uIHJvdXRlIChwcm90ZWN0ZWQpXG4gICAgcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ3JlY29uY2lsaWF0aW9uJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGhvbmVQZVJlY29uY2lsaWF0aW9uRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gUGF5bWVudCBjYWxsYmFjayAtIG5vIGF1dGggcmVxdWlyZWQgZm9yIHdlYmhvb2tzXG4gICAgY29uc3QgY2FsbGJhY2tSZXNvdXJjZSA9IHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdjYWxsYmFjaycpXG4gICAgY2FsbGJhY2tSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRDYWxsYmFja0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pIC8vIEZvciBkaXJlY3QgY2FsbGJhY2tzXG4gICAgY2FsbGJhY2tSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50Q2FsbGJhY2tGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICB9KSAvLyBGb3IgUGhvbmVQZSB3ZWJob29rc1xuXG4gICAgLy8gVXNlciBsaW1pdHMgYW5kIHVzYWdlIHRyYWNraW5nIHJvdXRlcyAoZm9yIEZBSVNTIGludGVncmF0aW9uKVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdjaGVjay11c2VyLWxpbWl0cycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNoZWNrVXNlckxpbWl0c0Z1bmN0aW9uKSlcbiAgICBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaW5jcmVtZW50LXVzYWdlJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oaW5jcmVtZW50VXNhZ2VGdW5jdGlvbikpXG5cbiAgICAvLyBBdXRoIHJvdXRlc1xuICAgIGF1dGhBcGkuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmVnaXN0ZXJGdW5jdGlvbikpXG4gICAgXG4gICAgLy8gQ29udHJvbCBQbGFuZSBBUEkgcm91dGVzXG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2dlbmVyYXRlLXNvbHV0aW9uLXRva2VuJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2VuZXJhdGVTb2x1dGlvblRva2VuRnVuY3Rpb24pKVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdnZW5lcmF0ZS10b2tlbicpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdlbmVyYXRlU29sdXRpb25Ub2tlbkZ1bmN0aW9uKSkgLy8gRnJvbnRlbmQgY29tcGF0aWJpbGl0eVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCd2YWxpZGF0ZS1zb2x1dGlvbi10b2tlbicpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNvbHV0aW9uVG9rZW5WYWxpZGF0b3JGdW5jdGlvbikpXG4gICAgXG4gICAgLy8gVXNlciByb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBwcm9maWxlUmVzb3VyY2UgPSB1c2VyQXBpLmFkZFJlc291cmNlKCdwcm9maWxlJylcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9maWxlRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb2ZpbGVGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBVc2VyIG1hbmFnZW1lbnQgcm91dGVzXG4gICAgY29uc3QgdXNlcnNSZXNvdXJjZSA9IHVzZXJBcGkuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JylcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbikpXG4gICAgXG4gICAgLy8gQWRtaW4gdXNlciBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IGFkbWluVXNlcnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCd1c2VycycpXG4gICAgYWRtaW5Vc2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYWRtaW5Vc2Vyc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dXNlcklkfScpLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBQYXJ0bmVyIGFwcGxpY2F0aW9uIHJvdXRlc1xuICAgIGNvbnN0IGFwcGxpY2F0aW9uc1Jlc291cmNlID0gcGFydG5lckFwaS5hZGRSZXNvdXJjZSgnYXBwbGljYXRpb25zJylcbiAgICBhcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYXBwbGljYXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgY29uc3QgYXBwbGljYXRpb25SZXNvdXJjZSA9IGFwcGxpY2F0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7YXBwbGljYXRpb25JZH0nKVxuICAgIGFwcGxpY2F0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYXBwbGljYXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIEFkbWluIHBhcnRuZXIgYXBwbGljYXRpb24gcm91dGVzXG4gICAgY29uc3QgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCdhcHBsaWNhdGlvbnMnKVxuICAgIGFkbWluQXBwbGljYXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzQwMScsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KVxuICAgIGFkbWluQXBwbGljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3thcHBsaWNhdGlvbklkfScpLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBDYXRhbG9nIHJvdXRlcyAocHVibGljKVxuICAgIGNhdGFsb2dBcGkuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3NlYXJjaCcpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCdjYXRlZ29yaWVzJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3tzb2x1dGlvbklkfScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBcbiAgICAvLyBJbWFnZSB1cGxvYWQgcm91dGUgKHByb3RlY3RlZClcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCd1cGxvYWQtaW1hZ2UnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gUGFydG5lciBzb2x1dGlvbiBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IHBhcnRuZXJTb2x1dGlvbnNSZXNvdXJjZSA9IHBhcnRuZXJBcGkuYWRkUmVzb3VyY2UoJ3NvbHV0aW9ucycpXG4gICAgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBjb25zdCBwYXJ0bmVyU29sdXRpb25SZXNvdXJjZSA9IHBhcnRuZXJTb2x1dGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3NvbHV0aW9uSWR9JylcbiAgICBwYXJ0bmVyU29sdXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcGFydG5lclNvbHV0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gQWRtaW4gc29sdXRpb24gbWFuYWdlbWVudCByb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBhZG1pblNvbHV0aW9uc1Jlc291cmNlID0gYWRtaW5BcGkuYWRkUmVzb3VyY2UoJ3NvbHV0aW9ucycpXG4gICAgYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnNDAxJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pXG4gICAgY29uc3QgYWRtaW5Tb2x1dGlvblJlc291cmNlID0gYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3NvbHV0aW9uSWR9JylcbiAgICBhZG1pblNvbHV0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBcbiAgICAvLyBBZG1pbiBtaWdyYXRpb24gcm91dGVzXG4gICAgY29uc3QgYWRtaW5NaWdyYXRlUmVzb3VyY2UgPSBhZG1pbkFwaS5hZGRSZXNvdXJjZSgnbWlncmF0ZS11c2VyLWNvdW50cmllcycpXG4gICAgYWRtaW5NaWdyYXRlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBUb2tlbiBNYW5hZ2VtZW50IEFQSSBSb3V0ZXMgKGZvciBGQUlTUyBpbnRlZ3JhdGlvbilcbiAgICBjb25zdCB0cmFja1VzYWdlUmVzb3VyY2UgPSBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgndHJhY2stdXNhZ2UnKVxuICAgIHRyYWNrVXNhZ2VSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0b2tlbk1hbmFnZXJGdW5jdGlvbikpXG5cbiAgICAvLyBBZG1pbiB0b2tlbiBtYW5hZ2VtZW50IHJvdXRlc1xuICAgIGNvbnN0IHVzZXJUb2tlbnNSZXNvdXJjZSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCd1c2VyLXRva2VucycpLmFkZFJlc291cmNlKCd7dXNlcklkfScpXG4gICAgdXNlclRva2Vuc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odG9rZW5NYW5hZ2VyRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gQW5hbHl0aWNzIEFQSSBSb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBhbmFseXRpY3NBcGkgPSBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnYW5hbHl0aWNzJylcbiAgICBhbmFseXRpY3NBcGkuYWRkUmVzb3VyY2UoJ2J1c2luZXNzLW1ldHJpY3MnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGJ1c2luZXNzTWV0cmljc0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhbmFseXRpY3NBcGkuYWRkUmVzb3VyY2UoJ2dlb2dyYXBoaWMnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdlb2dyYXBoaWNBbmFseXRpY3NGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYW5hbHl0aWNzQXBpLmFkZFJlc291cmNlKCd1c2FnZScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNhZ2VBbmFseXRpY3NGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgfVxufSJdfQ==