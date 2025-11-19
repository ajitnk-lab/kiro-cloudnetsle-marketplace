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
        props.apiMetricsTable.grantReadWriteData(lambdaRole); // NEW: Analytics tables
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
            code: lambda.Code.fromAsset('lambda/tokens'),
            environment: {
                TOKEN_TABLE: props.tokenTable.tableName,
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
                USER_SESSIONS_TABLE: props.userSessionsTable.tableName,
                API_METRICS_TABLE: props.apiMetricsTable.tableName
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
        const upgradeResource = paymentsApi.addResource('upgrade-to-pro');
        upgradeResource.addMethod('POST', new apigateway.LambdaIntegration(upgradeToProFunction));
        upgradeResource.addMethod('OPTIONS', new apigateway.MockIntegration({
            integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                    'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
                    'method.response.header.Access-Control-Allow-Origin': "'*'"
                }
            }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}'
            }
        }), {
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Origin': true
                }
            }]
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
        apiResource.addResource('validate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(validateTokenFunction));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFrQztBQUNsQyx1RUFBd0Q7QUFDeEQsK0RBQWdEO0FBSWhELHlEQUEwQztBQUMxQywyQ0FBc0M7QUFldEMsTUFBYSxRQUFTLFNBQVEsc0JBQVM7SUFHckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEQsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixXQUFXLEVBQUUsOEJBQThCO1lBQzNDLDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUU7b0JBQ1osY0FBYztvQkFDZCxZQUFZO29CQUNaLGVBQWU7b0JBQ2YsV0FBVztvQkFDWCxzQkFBc0I7aUJBQ3ZCO2FBQ0Y7WUFDRCxhQUFhLEVBQUU7Z0JBQ2IsU0FBUyxFQUFFLE1BQU07YUFDbEI7U0FDRixDQUFDLENBQUE7UUFFRixxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUU7WUFDMUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsWUFBWTtZQUMxQyxlQUFlLEVBQUU7Z0JBQ2YsNkJBQTZCLEVBQUUsS0FBSztnQkFDcEMsOEJBQThCLEVBQUUsd0VBQXdFO2dCQUN4Ryw4QkFBOEIsRUFBRSwrQkFBK0I7YUFDaEU7U0FDRixDQUFDLENBQUE7UUFF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OUIsQ0FBQyxDQUFBO1FBQ0YsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLEVBQUU7WUFDM0csVUFBVSxFQUFFLGlCQUFpQjtTQUM5QixDQUFDLENBQUE7SUFFSixDQUFDO0NBQ0Y7QUF6akJELDRCQXlqQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5J1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJ1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5pbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyB7XG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sXG4gIHVzZXJUYWJsZTogZHluYW1vZGIuVGFibGVcbiAgc29sdXRpb25UYWJsZTogZHluYW1vZGIuVGFibGVcbiAgcGFydG5lckFwcGxpY2F0aW9uVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHRva2VuVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICBwYXltZW50VHJhbnNhY3Rpb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlXG4gIHVzZXJTZXNzaW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSAvLyBORVc6IEFuYWx5dGljcyB0YWJsZXNcbiAgYXBpTWV0cmljc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSAvLyBORVc6IEFuYWx5dGljcyB0YWJsZXNcbiAgYXNzZXRzQnVja2V0OiBzMy5CdWNrZXRcbn1cblxuZXhwb3J0IGNsYXNzIEFwaVN0YWNrIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpXG5cbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXlcbiAgICB0aGlzLmFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ01hcmtldHBsYWNlQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdNYXJrZXRwbGFjZSBBUEknLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIG1hcmtldHBsYWNlIHBsYXRmb3JtJyxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxuICAgICAgICAgICdYLUFtei1EYXRlJyxcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtQXBpLUtleScsXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxuICAgICAgfSxcbiAgICB9KVxuXG4gICAgLy8gQWRkIENPUlMgc3VwcG9ydCBmb3IgNDAxIHJlc3BvbnNlc1xuICAgIHRoaXMuYXBpLmFkZEdhdGV3YXlSZXNwb25zZSgnVW5hdXRob3JpemVkJywge1xuICAgICAgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUuVU5BVVRIT1JJWkVELFxuICAgICAgcmVzcG9uc2VIZWFkZXJzOiB7XG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IFwiJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuJ1wiLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJ0dFVCxQT1NULFBVVCxERUxFVEUsT1BUSU9OUydcIixcbiAgICAgIH0sXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBDb2duaXRvIEF1dGhvcml6ZXJcbiAgICBjb25zdCBjb2duaXRvQXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyKHRoaXMsICdDb2duaXRvQXV0aG9yaXplcicsIHtcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFtwcm9wcy51c2VyUG9vbF0sXG4gICAgICBpZGVudGl0eVNvdXJjZTogJ21ldGhvZC5yZXF1ZXN0LmhlYWRlci5BdXRob3JpemF0aW9uJyxcbiAgICB9KVxuXG4gICAgLy8gTGFtYmRhIGV4ZWN1dGlvbiByb2xlXG4gICAgY29uc3QgbGFtYmRhUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlJyksXG4gICAgICBdLFxuICAgIH0pXG5cbiAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9uc1xuICAgIHByb3BzLnVzZXJUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGFtYmRhUm9sZSlcbiAgICBwcm9wcy5zb2x1dGlvblRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnRva2VuVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnVzZXJTZXNzaW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKSAvLyBORVc6IEFuYWx5dGljcyB0YWJsZXNcbiAgICBwcm9wcy5hcGlNZXRyaWNzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpIC8vIE5FVzogQW5hbHl0aWNzIHRhYmxlc1xuICAgIHByb3BzLmFzc2V0c0J1Y2tldC5ncmFudFJlYWRXcml0ZShsYW1iZGFSb2xlKVxuXG4gICAgLy8gR3JhbnQgQ29nbml0byBwZXJtaXNzaW9ucyBmb3IgdXNlciBtYW5hZ2VtZW50XG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGlzYWJsZVVzZXInLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5FbmFibGVVc2VyJyxcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMudXNlclBvb2wudXNlclBvb2xBcm5dLFxuICAgIH0pKVxuXG4gICAgLy8gR3JhbnQgU2VjcmV0cyBNYW5hZ2VyIHBlcm1pc3Npb25zIGZvciBQaG9uZVBlIGNyZWRlbnRpYWxzXG4gICAgbGFtYmRhUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gQ2FuIGJlIHJlc3RyaWN0ZWQgdG8gc3BlY2lmaWMgc2VjcmV0IEFSTiBpZiBuZWVkZWRcbiAgICB9KSlcblxuICAgIC8vIEdyYW50IFNFUyBwZXJtaXNzaW9ucyBmb3IgZW1haWwgbm90aWZpY2F0aW9uc1xuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnc2VzOlNlbmRFbWFpbCcsXG4gICAgICAgICdzZXM6U2VuZFJhd0VtYWlsJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBZb3UgbWlnaHQgd2FudCB0byByZXN0cmljdCB0aGlzIHRvIHNwZWNpZmljIGVtYWlsIGFkZHJlc3Nlc1xuICAgIH0pKVxuXG4gICAgLy8gQXV0aCBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JlZ2lzdGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdyZWdpc3Rlci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBUT0tFTl9TRUNSRVQ6ICdtYXJrZXRwbGFjZS1jb250cm9sLXBsYW5lLXNlY3JldC0yMDI1JywgLy8gSW4gcHJvZHVjdGlvbiwgdXNlIEFXUyBTZWNyZXRzIE1hbmFnZXJcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgIH0pXG5cbiAgICBjb25zdCBwcm9maWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQcm9maWxlRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwcm9maWxlLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgfSlcblxuICAgIC8vIFVzZXIgTWFuYWdlbWVudCBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCB1c2VyTWFuYWdlbWVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXNlck1hbmFnZW1lbnRGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3VzZXItbWFuYWdlbWVudC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFBhcnRuZXIgQXBwbGljYXRpb24gTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgcGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3BhcnRuZXItYXBwbGljYXRpb24uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQQVJUTkVSX0FQUExJQ0FUSU9OX1RBQkxFX05BTUU6IHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBGUk9NX0VNQUlMOiAnbm9yZXBseUBtYXJrZXRwbGFjZS5jb20nLCAvLyBVcGRhdGUgd2l0aCB5b3VyIHZlcmlmaWVkIFNFUyBlbWFpbFxuICAgICAgICBBRE1JTl9FTUFJTDogJ2FkbWluQG1hcmtldHBsYWNlLmNvbScsIC8vIFVwZGF0ZSB3aXRoIGFkbWluIGVtYWlsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gR2VuZXJhdGUgU29sdXRpb24gVG9rZW4gTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgZ2VuZXJhdGVTb2x1dGlvblRva2VuRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZW5lcmF0ZVNvbHV0aW9uVG9rZW5GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3NvbHV0aW9uLXRva2VuLWdlbmVyYXRvci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3Rva2VucycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVE9LRU5fVEFCTEU6IHByb3BzLnRva2VuVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogcHJvcHMudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFNvbHV0aW9uIFRva2VuIFZhbGlkYXRvciBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCB2YWxpZGF0ZVRva2VuRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24yJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnc29sdXRpb24tdG9rZW4tdmFsaWRhdG9yLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvdG9rZW5zJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUT0tFTl9UQUJMRTogcHJvcHMudG9rZW5UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gUGF5bWVudCBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBwYXltZW50SW5pdGlhdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BheW1lbnRJbml0aWF0ZUZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnaW5pdGlhdGUuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFBheW1lbnQgU3RhdHVzIExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHBheW1lbnRTdGF0dXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1BheW1lbnRTdGF0dXNGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3N0YXR1cy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gVXBncmFkZSB0byBQcm8gTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgdXBncmFkZVRvUHJvRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGdyYWRlVG9Qcm9GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3VwZ3JhZGUtdG8tcHJvLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcGF5bWVudHMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFBheW1lbnQgQ2FsbGJhY2sgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgcGF5bWVudENhbGxiYWNrRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50Q2FsbGJhY2tGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3BheW1lbnQtY2FsbGJhY2suaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUEFZTUVOVF9UUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gQ2hlY2sgVXNlciBMaW1pdHMgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgY2hlY2tVc2VyTGltaXRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDaGVja1VzZXJMaW1pdHNGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2NoZWNrLXVzZXItbGltaXRzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBJbmNyZW1lbnQgVXNhZ2UgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgaW5jcmVtZW50VXNhZ2VGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0luY3JlbWVudFVzYWdlRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmNyZW1lbnQtdXNhZ2UuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENhdGFsb2cgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGNhdGFsb2dGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NhdGFsb2dGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2NhdGFsb2cuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9jYXRhbG9nJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVNTRVRTX0JVQ0tFVF9OQU1FOiBwcm9wcy5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBTb2x1dGlvbiBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnU29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi1tYW5hZ2VtZW50LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvY2F0YWxvZycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU09MVVRJT05fVEFCTEVfTkFNRTogcHJvcHMuc29sdXRpb25UYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQVNTRVRTX0JVQ0tFVF9OQU1FOiBwcm9wcy5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgRlJPTV9FTUFJTDogJ25vcmVwbHlAbWFya2V0cGxhY2UuY29tJyxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBBZG1pbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBhZG1pbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQWRtaW5GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2FkbWluLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYWRtaW4nKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJTX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTT0xVVElPTlNfVEFCTEU6IHByb3BzLnNvbHV0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVJUTkVSX0FQUExJQ0FUSU9OX1RBQkxFX05BTUU6IHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBUb2tlbiBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IHRva2VuTWFuYWdlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVG9rZW5NYW5hZ2VyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICd0b2tlbi1tYW5hZ2VyLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvdG9rZW5zJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUT0tFTl9UQUJMRV9OQU1FOiBwcm9wcy50b2tlblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENvbnRyb2wgUGxhbmUgVG9rZW4gR2VuZXJhdGlvbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBzb2x1dGlvblRva2VuR2VuZXJhdG9yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvblRva2VuR2VuZXJhdG9yRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi10b2tlbi1nZW5lcmF0b3IuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS90b2tlbnMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFRPS0VOX1NFQ1JFVDogJ21hcmtldHBsYWNlLWNvbnRyb2wtcGxhbmUtc2VjcmV0LTIwMjUnLCAvLyBJbiBwcm9kdWN0aW9uLCB1c2UgQVdTIFNlY3JldHMgTWFuYWdlclxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIENvbnRyb2wgUGxhbmUgVG9rZW4gVmFsaWRhdGlvbiBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCBzb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzb2x1dGlvbi10b2tlbi12YWxpZGF0b3IuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS90b2tlbnMnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU0VTU0lPTlNfVEFCTEVfTkFNRTogcHJvcHMudXNlclNlc3Npb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBFTkFCTEVfTE9DQVRJT05fVFJBQ0tJTkc6ICd0cnVlJyxcbiAgICAgICAgSVBfU0FMVDogJ21hcmtldHBsYWNlLWxvY2F0aW9uLXNhbHQtMjAyNSdcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICAvLyBBbmFseXRpY3MgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGJ1c2luZXNzTWV0cmljc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQnVzaW5lc3NNZXRyaWNzRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdidXNpbmVzcy1tZXRyaWNzLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYW5hbHl0aWNzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBQQVlNRU5UX1RSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TRVNTSU9OU19UQUJMRTogcHJvcHMudXNlclNlc3Npb25zVGFibGUudGFibGVOYW1lXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgY29uc3QgZ2VvZ3JhcGhpY0FuYWx5dGljc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2VvZ3JhcGhpY0FuYWx5dGljc0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnZ2VvZ3JhcGhpYy1hbmFseXRpY3MuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hbmFseXRpY3MnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFBBWU1FTlRfVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX1NFU1NJT05TX1RBQkxFOiBwcm9wcy51c2VyU2Vzc2lvbnNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgIH0pXG5cbiAgICBjb25zdCB1c2FnZUFuYWx5dGljc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXNhZ2VBbmFseXRpY3NGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3VzYWdlLWFuYWx5dGljcy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2FuYWx5dGljcycpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9TT0xVVElPTl9FTlRJVExFTUVOVFNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9TRVNTSU9OU19UQUJMRTogcHJvcHMudXNlclNlc3Npb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBUElfTUVUUklDU19UQUJMRTogcHJvcHMuYXBpTWV0cmljc1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIEFQSSBSb3V0ZXNcbiAgICBjb25zdCBhdXRoQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpXG4gICAgY29uc3QgY2F0YWxvZ0FwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2NhdGFsb2cnKVxuICAgIGNvbnN0IHVzZXJBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd1c2VyJywge1xuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgJ1gtQW16LURhdGUnLCBcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtQXBpLUtleScsXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSlcbiAgICBjb25zdCBhZG1pbkFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FkbWluJylcbiAgICBjb25zdCBwYXJ0bmVyQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGFydG5lcicpXG4gICAgY29uc3QgcGF5bWVudHNBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdwYXltZW50cycsIHtcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxuICAgICAgICAgICdYLUFtei1EYXRlJyxcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtQXBpLUtleScsXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcbiAgICAgICAgICAnWC1BbXotVXNlci1BZ2VudCdcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSlcbiAgICBjb25zdCBhcGlSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FwaScpXG5cbiAgICAvLyBQYXltZW50IHJvdXRlc1xuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdpbml0aWF0ZScpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRJbml0aWF0ZUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgnc3RhdHVzJykuYWRkUmVzb3VyY2UoJ3t0cmFuc2FjdGlvbklkfScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudFN0YXR1c0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgndXBncmFkZS10by1wcm8nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1cGdyYWRlVG9Qcm9GdW5jdGlvbikpXG4gICAgXG4gICAgLy8gUGF5bWVudCBjYWxsYmFjayAtIG5vIGF1dGggcmVxdWlyZWQgZm9yIHdlYmhvb2tzXG4gICAgY29uc3QgY2FsbGJhY2tSZXNvdXJjZSA9IHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdjYWxsYmFjaycpXG4gICAgY2FsbGJhY2tSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBheW1lbnRDYWxsYmFja0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORVxuICAgIH0pIC8vIEZvciBkaXJlY3QgY2FsbGJhY2tzXG4gICAgY2FsbGJhY2tSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50Q2FsbGJhY2tGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcGlnYXRld2F5LkF1dGhvcml6YXRpb25UeXBlLk5PTkVcbiAgICB9KSAvLyBGb3IgUGhvbmVQZSB3ZWJob29rc1xuXG4gICAgLy8gVXNlciBsaW1pdHMgYW5kIHVzYWdlIHRyYWNraW5nIHJvdXRlcyAoZm9yIEZBSVNTIGludGVncmF0aW9uKVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdjaGVjay11c2VyLWxpbWl0cycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNoZWNrVXNlckxpbWl0c0Z1bmN0aW9uKSlcbiAgICBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnaW5jcmVtZW50LXVzYWdlJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oaW5jcmVtZW50VXNhZ2VGdW5jdGlvbikpXG5cbiAgICAvLyBBdXRoIHJvdXRlc1xuICAgIGF1dGhBcGkuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmVnaXN0ZXJGdW5jdGlvbikpXG4gICAgXG4gICAgLy8gQ29udHJvbCBQbGFuZSBBUEkgcm91dGVzXG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2dlbmVyYXRlLXNvbHV0aW9uLXRva2VuJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2VuZXJhdGVTb2x1dGlvblRva2VuRnVuY3Rpb24pKVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdnZW5lcmF0ZS10b2tlbicpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdlbmVyYXRlU29sdXRpb25Ub2tlbkZ1bmN0aW9uKSkgLy8gRnJvbnRlbmQgY29tcGF0aWJpbGl0eVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCd2YWxpZGF0ZS1zb2x1dGlvbi10b2tlbicpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHZhbGlkYXRlVG9rZW5GdW5jdGlvbikpXG4gICAgXG4gICAgLy8gVXNlciByb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBwcm9maWxlUmVzb3VyY2UgPSB1c2VyQXBpLmFkZFJlc291cmNlKCdwcm9maWxlJylcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9maWxlRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb2ZpbGVGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBVc2VyIG1hbmFnZW1lbnQgcm91dGVzXG4gICAgY29uc3QgdXNlcnNSZXNvdXJjZSA9IHVzZXJBcGkuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JylcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbikpXG4gICAgXG4gICAgLy8gQWRtaW4gdXNlciBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IGFkbWluVXNlcnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCd1c2VycycpXG4gICAgYWRtaW5Vc2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYWRtaW5Vc2Vyc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dXNlcklkfScpLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBQYXJ0bmVyIGFwcGxpY2F0aW9uIHJvdXRlc1xuICAgIGNvbnN0IGFwcGxpY2F0aW9uc1Jlc291cmNlID0gcGFydG5lckFwaS5hZGRSZXNvdXJjZSgnYXBwbGljYXRpb25zJylcbiAgICBhcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYXBwbGljYXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgY29uc3QgYXBwbGljYXRpb25SZXNvdXJjZSA9IGFwcGxpY2F0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7YXBwbGljYXRpb25JZH0nKVxuICAgIGFwcGxpY2F0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYXBwbGljYXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIEFkbWluIHBhcnRuZXIgYXBwbGljYXRpb24gcm91dGVzXG4gICAgY29uc3QgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCdhcHBsaWNhdGlvbnMnKVxuICAgIGFkbWluQXBwbGljYXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzQwMScsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9KVxuICAgIGFkbWluQXBwbGljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3thcHBsaWNhdGlvbklkfScpLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYWRtaW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBDYXRhbG9nIHJvdXRlcyAocHVibGljKVxuICAgIGNhdGFsb2dBcGkuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3NlYXJjaCcpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCdjYXRlZ29yaWVzJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3tzb2x1dGlvbklkfScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBcbiAgICAvLyBJbWFnZSB1cGxvYWQgcm91dGUgKHByb3RlY3RlZClcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCd1cGxvYWQtaW1hZ2UnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gUGFydG5lciBzb2x1dGlvbiBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IHBhcnRuZXJTb2x1dGlvbnNSZXNvdXJjZSA9IHBhcnRuZXJBcGkuYWRkUmVzb3VyY2UoJ3NvbHV0aW9ucycpXG4gICAgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBjb25zdCBwYXJ0bmVyU29sdXRpb25SZXNvdXJjZSA9IHBhcnRuZXJTb2x1dGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3NvbHV0aW9uSWR9JylcbiAgICBwYXJ0bmVyU29sdXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcGFydG5lclNvbHV0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gQWRtaW4gc29sdXRpb24gbWFuYWdlbWVudCByb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBhZG1pblNvbHV0aW9uc1Jlc291cmNlID0gYWRtaW5BcGkuYWRkUmVzb3VyY2UoJ3NvbHV0aW9ucycpXG4gICAgYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFkbWluRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnNDAxJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH0pXG4gICAgY29uc3QgYWRtaW5Tb2x1dGlvblJlc291cmNlID0gYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3NvbHV0aW9uSWR9JylcbiAgICBhZG1pblNvbHV0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIFRva2VuIE1hbmFnZW1lbnQgQVBJIFJvdXRlcyAoZm9yIEZBSVNTIGludGVncmF0aW9uKVxuICAgIGNvbnN0IHRyYWNrVXNhZ2VSZXNvdXJjZSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCd0cmFjay11c2FnZScpXG4gICAgdHJhY2tVc2FnZVJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHRva2VuTWFuYWdlckZ1bmN0aW9uKSlcblxuICAgIC8vIEFkbWluIHRva2VuIG1hbmFnZW1lbnQgcm91dGVzXG4gICAgY29uc3QgdXNlclRva2Vuc1Jlc291cmNlID0gYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VzZXItdG9rZW5zJykuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JylcbiAgICB1c2VyVG9rZW5zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0b2tlbk1hbmFnZXJGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBBbmFseXRpY3MgQVBJIFJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IGFuYWx5dGljc0FwaSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdhbmFseXRpY3MnKVxuICAgIGFuYWx5dGljc0FwaS5hZGRSZXNvdXJjZSgnYnVzaW5lc3MtbWV0cmljcycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYnVzaW5lc3NNZXRyaWNzRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGFuYWx5dGljc0FwaS5hZGRSZXNvdXJjZSgnZ2VvZ3JhcGhpYycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2VvZ3JhcGhpY0FuYWx5dGljc0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhbmFseXRpY3NBcGkuYWRkUmVzb3VyY2UoJ3VzYWdlJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih1c2FnZUFuYWx5dGljc0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICB9XG59Il19