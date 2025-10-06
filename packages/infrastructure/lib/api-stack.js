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
        props.transactionTable.grantReadWriteData(lambdaRole);
        props.userSolutionsTable.grantReadWriteData(lambdaRole);
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
        });
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
        });
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
        });
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
        });
        const transactionStatusFunction = new lambda.Function(this, 'TransactionStatusFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'payment-handler.getTransactionStatus',
            code: lambda.Code.fromAsset('lambda/payments'),
            environment: {
                TRANSACTIONS_TABLE: props.transactionTable.tableName,
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });
        const userTransactionsFunction = new lambda.Function(this, 'UserTransactionsFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'payment-handler.getUserTransactions',
            code: lambda.Code.fromAsset('lambda/payments'),
            environment: {
                TRANSACTIONS_TABLE: props.transactionTable.tableName,
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
        });
        // API Routes
        const authApi = this.api.root.addResource('auth');
        const catalogApi = this.api.root.addResource('catalog');
        const userApi = this.api.root.addResource('user');
        const adminApi = this.api.root.addResource('admin');
        const partnerApi = this.api.root.addResource('partner');
        const paymentsApi = this.api.root.addResource('payments');
        // Auth routes
        authApi.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(registerFunction));
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
        const applicationIdResource = applicationsResource.addResource('{applicationId}');
        applicationIdResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        applicationIdResource.addMethod('PUT', new apigateway.LambdaIntegration(partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Admin partner application routes
        const adminApplicationsResource = adminApi.addResource('applications');
        adminApplicationsResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        adminApplicationsResource.addResource('{applicationId}').addMethod('PUT', new apigateway.LambdaIntegration(partnerApplicationFunction), {
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
        const partnerSolutionIdResource = partnerSolutionsResource.addResource('{solutionId}');
        partnerSolutionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        partnerSolutionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Admin solution management routes (protected)
        const adminSolutionsResource = adminApi.addResource('solutions');
        adminSolutionsResource.addMethod('GET', new apigateway.LambdaIntegration(solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        const adminSolutionIdResource = adminSolutionsResource.addResource('{solutionId}');
        adminSolutionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Payment routes
        paymentsApi.addResource('create').addMethod('POST', new apigateway.LambdaIntegration(paymentFunction), {
            authorizer: cognitoAuthorizer,
        });
        paymentsApi.addResource('webhook').addMethod('POST', new apigateway.LambdaIntegration(paymentWebhookFunction));
        paymentsApi.addResource('transaction').addResource('{transactionId}').addMethod('GET', new apigateway.LambdaIntegration(transactionStatusFunction), {
            authorizer: cognitoAuthorizer,
        });
        paymentsApi.addResource('user').addResource('{userId}').addResource('transactions').addMethod('GET', new apigateway.LambdaIntegration(userTransactionsFunction), {
            authorizer: cognitoAuthorizer,
        });
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFrQztBQUNsQyx1RUFBd0Q7QUFDeEQsK0RBQWdEO0FBSWhELHlEQUEwQztBQUMxQywyQ0FBc0M7QUFZdEMsTUFBYSxRQUFTLFNBQVEsc0JBQVM7SUFHckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEQsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixXQUFXLEVBQUUsOEJBQThCO1lBQzNDLDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUU7b0JBQ1osY0FBYztvQkFDZCxZQUFZO29CQUNaLGVBQWU7b0JBQ2YsV0FBVztvQkFDWCxzQkFBc0I7aUJBQ3ZCO2FBQ0Y7WUFDRCxhQUFhLEVBQUU7Z0JBQ2IsU0FBUyxFQUFFLE1BQU07YUFDbEI7U0FDRixDQUFDLENBQUE7UUFFRiw0QkFBNEI7UUFDNUIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDN0YsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1lBQ2xDLGNBQWMsRUFBRSxxQ0FBcUM7U0FDdEQsQ0FBQyxDQUFBO1FBRUYsd0JBQXdCO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElB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QXVCLEdBQUcsc0JBQXNCLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xGLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsMEJBQTBCLENBQUMsRUFBRTtZQUNyRyxVQUFVLEVBQUUsaUJBQWlCO1NBQzlCLENBQUMsQ0FBQTtRQUVGLGlCQUFpQjtRQUNqQixXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDckcsVUFBVSxFQUFFLGlCQUFpQjtTQUM5QixDQUFDLENBQUE7UUFDRixXQUFXLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1FBQzlHLFdBQVcsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFO1lBQ2xKLFVBQVUsRUFBRSxpQkFBaUI7U0FDOUIsQ0FBQyxDQUFBO1FBQ0YsV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsd0JBQXdCLENBQUMsRUFBRTtZQUMvSixVQUFVLEVBQUUsaUJBQWlCO1NBQzlCLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQXpURCw0QkF5VEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknXHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMydcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0bydcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nXHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXHJcblxyXG5pbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyB7XHJcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2xcclxuICB1c2VyVGFibGU6IGR5bmFtb2RiLlRhYmxlXHJcbiAgc29sdXRpb25UYWJsZTogZHluYW1vZGIuVGFibGVcclxuICBwYXJ0bmVyQXBwbGljYXRpb25UYWJsZTogZHluYW1vZGIuVGFibGVcclxuICB0cmFuc2FjdGlvblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxyXG4gIHVzZXJTb2x1dGlvbnNUYWJsZTogZHluYW1vZGIuVGFibGVcclxuICBhc3NldHNCdWNrZXQ6IHMzLkJ1Y2tldFxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaVxyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBpU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKVxyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheVxyXG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdNYXJrZXRwbGFjZUFwaScsIHtcclxuICAgICAgcmVzdEFwaU5hbWU6ICdNYXJrZXRwbGFjZSBBUEknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBmb3IgbWFya2V0cGxhY2UgcGxhdGZvcm0nLFxyXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcclxuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICAgJ1gtQW16LURhdGUnLFxyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgJ1gtQXBpLUtleScsXHJcbiAgICAgICAgICAnWC1BbXotU2VjdXJpdHktVG9rZW4nLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcclxuICAgICAgICBzdGFnZU5hbWU6ICdwcm9kJyxcclxuICAgICAgfSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQ3JlYXRlIENvZ25pdG8gQXV0aG9yaXplclxyXG4gICAgY29uc3QgY29nbml0b0F1dGhvcml6ZXIgPSBuZXcgYXBpZ2F0ZXdheS5Db2duaXRvVXNlclBvb2xzQXV0aG9yaXplcih0aGlzLCAnQ29nbml0b0F1dGhvcml6ZXInLCB7XHJcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFtwcm9wcy51c2VyUG9vbF0sXHJcbiAgICAgIGlkZW50aXR5U291cmNlOiAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBMYW1iZGEgZXhlY3V0aW9uIHJvbGVcclxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0xhbWJkYUV4ZWN1dGlvblJvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlJyksXHJcbiAgICAgIF0sXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zXHJcbiAgICBwcm9wcy51c2VyVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXHJcbiAgICBwcm9wcy5zb2x1dGlvblRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxyXG4gICAgcHJvcHMucGFydG5lckFwcGxpY2F0aW9uVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXHJcbiAgICBwcm9wcy50cmFuc2FjdGlvblRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxyXG4gICAgcHJvcHMudXNlclNvbHV0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxyXG4gICAgcHJvcHMuYXNzZXRzQnVja2V0LmdyYW50UmVhZFdyaXRlKGxhbWJkYVJvbGUpXHJcblxyXG4gICAgLy8gR3JhbnQgQ29nbml0byBwZXJtaXNzaW9ucyBmb3IgdXNlciBtYW5hZ2VtZW50XHJcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkRpc2FibGVVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5FbmFibGVVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMudXNlclBvb2wudXNlclBvb2xBcm5dLFxyXG4gICAgfSkpXHJcblxyXG4gICAgLy8gR3JhbnQgU0VTIHBlcm1pc3Npb25zIGZvciBlbWFpbCBub3RpZmljYXRpb25zXHJcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxyXG4gICAgICAgICdzZXM6U2VuZFJhd0VtYWlsJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gWW91IG1pZ2h0IHdhbnQgdG8gcmVzdHJpY3QgdGhpcyB0byBzcGVjaWZpYyBlbWFpbCBhZGRyZXNzZXNcclxuICAgIH0pKVxyXG5cclxuICAgIC8vIEF1dGggTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JlZ2lzdGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBoYW5kbGVyOiAncmVnaXN0ZXIuaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICB9LFxyXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBwcm9maWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQcm9maWxlRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBoYW5kbGVyOiAncHJvZmlsZS5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gVXNlciBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgdXNlck1hbmFnZW1lbnRGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VzZXJNYW5hZ2VtZW50RnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBoYW5kbGVyOiAndXNlci1tYW5hZ2VtZW50LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFVTRVJfUE9PTF9JRDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgfSxcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBQYXJ0bmVyIEFwcGxpY2F0aW9uIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgcGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGhhbmRsZXI6ICdwYXJ0bmVyLWFwcGxpY2F0aW9uLmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUEFSVE5FUl9BUFBMSUNBVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEZST01fRU1BSUw6ICdub3JlcGx5QG1hcmtldHBsYWNlLmNvbScsIC8vIFVwZGF0ZSB3aXRoIHlvdXIgdmVyaWZpZWQgU0VTIGVtYWlsXHJcbiAgICAgICAgQURNSU5fRU1BSUw6ICdhZG1pbkBtYXJrZXRwbGFjZS5jb20nLCAvLyBVcGRhdGUgd2l0aCBhZG1pbiBlbWFpbFxyXG4gICAgICB9LFxyXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIENhdGFsb2cgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY2F0YWxvZ0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ2F0YWxvZ0Z1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgaGFuZGxlcjogJ2NhdGFsb2cuaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2NhdGFsb2cnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBU1NFVFNfQlVDS0VUX05BTUU6IHByb3BzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFNvbHV0aW9uIE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCBzb2x1dGlvbk1hbmFnZW1lbnRGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgaGFuZGxlcjogJ3NvbHV0aW9uLW1hbmFnZW1lbnQuaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2NhdGFsb2cnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBU1NFVFNfQlVDS0VUX05BTUU6IHByb3BzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFBheW1lbnQgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgcGF5bWVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUGF5bWVudEZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgaGFuZGxlcjogJ3BheW1lbnQtaGFuZGxlci5jcmVhdGVQYXltZW50UmVxdWVzdCcsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgU09MVVRJT05TX1RBQkxFOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBUUkFOU0FDVElPTlNfVEFCTEU6IHByb3BzLnRyYW5zYWN0aW9uVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFVTRVJfU09MVVRJT05TX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25zVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIElOU1RBTU9KT19BUElfS0VZOiAndGVzdF9hcGlfa2V5JywgLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCBrZXkgaW4gcHJvZHVjdGlvblxyXG4gICAgICAgIElOU1RBTU9KT19BVVRIX1RPS0VOOiAndGVzdF9hdXRoX3Rva2VuJywgLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCB0b2tlbiBpbiBwcm9kdWN0aW9uXHJcbiAgICAgICAgSU5TVEFNT0pPX0VORFBPSU5UOiAnaHR0cHM6Ly90ZXN0Lmluc3RhbW9qby5jb20vYXBpLzEuMS8nLFxyXG4gICAgICAgIEZST05URU5EX1VSTDogJ2h0dHBzOi8vZGRkenE5dWwxeWdyMy5jbG91ZGZyb250Lm5ldCcsXHJcbiAgICAgICAgQVBJX0dBVEVXQVlfVVJMOiBgaHR0cHM6Ly8ke3RoaXMuYXBpLnJlc3RBcGlJZH0uZXhlY3V0ZS1hcGkuJHtjZGsuQXdzLlJFR0lPTn0uYW1hem9uYXdzLmNvbS9wcm9kYCxcclxuICAgICAgICBGUk9NX0VNQUlMOiAnbm9yZXBseUBtYXJrZXRwbGFjZS5jb20nLFxyXG4gICAgICB9LFxyXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHBheW1lbnRXZWJob29rRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXltZW50V2ViaG9va0Z1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgaGFuZGxlcjogJ3BheW1lbnQtaGFuZGxlci5oYW5kbGVXZWJob29rJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvcGF5bWVudHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBTT0xVVElPTlNfVEFCTEU6IHByb3BzLnNvbHV0aW9uVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMudHJhbnNhY3Rpb25UYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVNFUl9TT0xVVElPTlNfVEFCTEU6IHByb3BzLnVzZXJTb2x1dGlvbnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgRlJPTlRFTkRfVVJMOiAnaHR0cHM6Ly9kZGR6cTl1bDF5Z3IzLmNsb3VkZnJvbnQubmV0JyxcclxuICAgICAgICBGUk9NX0VNQUlMOiAnbm9yZXBseUBtYXJrZXRwbGFjZS5jb20nLFxyXG4gICAgICB9LFxyXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uU3RhdHVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUcmFuc2FjdGlvblN0YXR1c0Z1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgaGFuZGxlcjogJ3BheW1lbnQtaGFuZGxlci5nZXRUcmFuc2FjdGlvblN0YXR1cycsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3BheW1lbnRzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVFJBTlNBQ1RJT05TX1RBQkxFOiBwcm9wcy50cmFuc2FjdGlvblRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCB1c2VyVHJhbnNhY3Rpb25zRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVc2VyVHJhbnNhY3Rpb25zRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBoYW5kbGVyOiAncGF5bWVudC1oYW5kbGVyLmdldFVzZXJUcmFuc2FjdGlvbnMnLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9wYXltZW50cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRSQU5TQUNUSU9OU19UQUJMRTogcHJvcHMudHJhbnNhY3Rpb25UYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQVBJIFJvdXRlc1xyXG4gICAgY29uc3QgYXV0aEFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKVxyXG4gICAgY29uc3QgY2F0YWxvZ0FwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2NhdGFsb2cnKVxyXG4gICAgY29uc3QgdXNlckFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXInKVxyXG4gICAgY29uc3QgYWRtaW5BcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhZG1pbicpXHJcbiAgICBjb25zdCBwYXJ0bmVyQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGFydG5lcicpXHJcbiAgICBjb25zdCBwYXltZW50c0FwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BheW1lbnRzJylcclxuXHJcbiAgICAvLyBBdXRoIHJvdXRlc1xyXG4gICAgYXV0aEFwaS5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyZWdpc3RlckZ1bmN0aW9uKSlcclxuICAgIFxyXG4gICAgLy8gVXNlciByb3V0ZXMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHByb2ZpbGVSZXNvdXJjZSA9IHVzZXJBcGkuYWRkUmVzb3VyY2UoJ3Byb2ZpbGUnKVxyXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvZmlsZUZ1bmN0aW9uKSwge1xyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pXHJcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9maWxlRnVuY3Rpb24pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBVc2VyIG1hbmFnZW1lbnQgcm91dGVzXHJcbiAgICBjb25zdCB1c2Vyc1Jlc291cmNlID0gdXNlckFwaS5hZGRSZXNvdXJjZSgne3VzZXJJZH0nKVxyXG4gICAgdXNlcnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVzZXJNYW5hZ2VtZW50RnVuY3Rpb24pKVxyXG4gICAgXHJcbiAgICAvLyBBZG1pbiB1c2VyIG1hbmFnZW1lbnQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBhZG1pblVzZXJzUmVzb3VyY2UgPSBhZG1pbkFwaS5hZGRSZXNvdXJjZSgndXNlcnMnKVxyXG4gICAgYWRtaW5Vc2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbiksIHtcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG4gICAgYWRtaW5Vc2Vyc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dXNlcklkfScpLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbiksIHtcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFBhcnRuZXIgYXBwbGljYXRpb24gcm91dGVzXHJcbiAgICBjb25zdCBhcHBsaWNhdGlvbnNSZXNvdXJjZSA9IHBhcnRuZXJBcGkuYWRkUmVzb3VyY2UoJ2FwcGxpY2F0aW9ucycpXHJcbiAgICBhcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG4gICAgYXBwbGljYXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG4gICAgY29uc3QgYXBwbGljYXRpb25JZFJlc291cmNlID0gYXBwbGljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3thcHBsaWNhdGlvbklkfScpXHJcbiAgICBhcHBsaWNhdGlvbklkUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG4gICAgYXBwbGljYXRpb25JZFJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBBZG1pbiBwYXJ0bmVyIGFwcGxpY2F0aW9uIHJvdXRlc1xyXG4gICAgY29uc3QgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCdhcHBsaWNhdGlvbnMnKVxyXG4gICAgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pXHJcbiAgICBhZG1pbkFwcGxpY2F0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7YXBwbGljYXRpb25JZH0nKS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQ2F0YWxvZyByb3V0ZXMgKHB1YmxpYylcclxuICAgIGNhdGFsb2dBcGkuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxyXG4gICAgY2F0YWxvZ0FwaS5hZGRSZXNvdXJjZSgnc2VhcmNoJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxyXG4gICAgY2F0YWxvZ0FwaS5hZGRSZXNvdXJjZSgnY2F0ZWdvcmllcycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcclxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3tzb2x1dGlvbklkfScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcclxuICAgIFxyXG4gICAgLy8gSW1hZ2UgdXBsb2FkIHJvdXRlIChwcm90ZWN0ZWQpXHJcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCd1cGxvYWQtaW1hZ2UnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBQYXJ0bmVyIHNvbHV0aW9uIG1hbmFnZW1lbnQgcm91dGVzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBwYXJ0bmVyU29sdXRpb25zUmVzb3VyY2UgPSBwYXJ0bmVyQXBpLmFkZFJlc291cmNlKCdzb2x1dGlvbnMnKVxyXG4gICAgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG4gICAgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSwge1xyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pXHJcbiAgICBjb25zdCBwYXJ0bmVyU29sdXRpb25JZFJlc291cmNlID0gcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7c29sdXRpb25JZH0nKVxyXG4gICAgcGFydG5lclNvbHV0aW9uSWRSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pXHJcbiAgICBwYXJ0bmVyU29sdXRpb25JZFJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oc29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb24pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBBZG1pbiBzb2x1dGlvbiBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxyXG4gICAgY29uc3QgYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCdzb2x1dGlvbnMnKVxyXG4gICAgYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pXHJcbiAgICBjb25zdCBhZG1pblNvbHV0aW9uSWRSZXNvdXJjZSA9IGFkbWluU29sdXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tzb2x1dGlvbklkfScpXHJcbiAgICBhZG1pblNvbHV0aW9uSWRSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgLy8gUGF5bWVudCByb3V0ZXNcclxuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdjcmVhdGUnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXltZW50RnVuY3Rpb24pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxyXG4gICAgfSlcclxuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCd3ZWJob29rJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocGF5bWVudFdlYmhvb2tGdW5jdGlvbikpXHJcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgndHJhbnNhY3Rpb24nKS5hZGRSZXNvdXJjZSgne3RyYW5zYWN0aW9uSWR9JykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbih0cmFuc2FjdGlvblN0YXR1c0Z1bmN0aW9uKSwge1xyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pXHJcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgndXNlcicpLmFkZFJlc291cmNlKCd7dXNlcklkfScpLmFkZFJlc291cmNlKCd0cmFuc2FjdGlvbnMnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHVzZXJUcmFuc2FjdGlvbnNGdW5jdGlvbiksIHtcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG4gIH1cclxufSJdfQ==