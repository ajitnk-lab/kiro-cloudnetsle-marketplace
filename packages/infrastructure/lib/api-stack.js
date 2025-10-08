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
                USER_TABLE_NAME: props.userTable.tableName,
                ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
                FROM_EMAIL: 'noreply@marketplace.com',
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
        const applicationResource = applicationsResource.addResource('{applicationId}');
        applicationResource.addMethod('GET', new apigateway.LambdaIntegration(partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        applicationResource.addMethod('PUT', new apigateway.LambdaIntegration(partnerApplicationFunction), {
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
        const partnerSolutionResource = partnerSolutionsResource.addResource('{solutionId}');
        partnerSolutionResource.addMethod('PUT', new apigateway.LambdaIntegration(catalogFunction), {
            authorizer: cognitoAuthorizer,
        });
        partnerSolutionResource.addMethod('DELETE', new apigateway.LambdaIntegration(catalogFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Admin solution management routes (protected)
        const adminSolutionsResource = adminApi.addResource('solutions');
        adminSolutionsResource.addMethod('GET', new apigateway.LambdaIntegration(solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        const adminSolutionResource = adminSolutionsResource.addResource('{solutionId}');
        adminSolutionResource.addMethod('PUT', new apigateway.LambdaIntegration(solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        adminSolutionResource.addMethod('DELETE', new apigateway.LambdaIntegration(solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFrQztBQUNsQyx1RUFBd0Q7QUFDeEQsK0RBQWdEO0FBSWhELHlEQUEwQztBQUMxQywyQ0FBc0M7QUFVdEMsTUFBYSxRQUFTLFNBQVEsc0JBQVM7SUFHckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEQsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixXQUFXLEVBQUUsOEJBQThCO1lBQzNDLDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUU7b0JBQ1osY0FBYztvQkFDZCxZQUFZO29CQUNaLGVBQWU7b0JBQ2YsV0FBVztvQkFDWCxzQkFBc0I7aUJBQ3ZCO2FBQ0Y7WUFDRCxhQUFhLEVBQUU7Z0JBQ2IsU0FBUyxFQUFFLE1BQU07YUFDbEI7U0FDRixDQUFDLENBQUE7UUFFRiw0QkFBNEI7UUFDNUIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDN0YsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1lBQ2xDLGNBQWMsRUFBRSxxQ0FBcUM7U0FDdEQsQ0FBQyxDQUFBO1FBRUYsd0JBQXdCO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElB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Q0FBQyxDQUFBO0lBRUosQ0FBQztDQUNGO0FBclBELDRCQXFQQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYidcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMydcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSdcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5cbmludGVyZmFjZSBBcGlTdGFja1Byb3BzIHtcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2xcbiAgdXNlclRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICBzb2x1dGlvblRhYmxlOiBkeW5hbW9kYi5UYWJsZVxuICBwYXJ0bmVyQXBwbGljYXRpb25UYWJsZTogZHluYW1vZGIuVGFibGVcbiAgYXNzZXRzQnVja2V0OiBzMy5CdWNrZXRcbn1cblxuZXhwb3J0IGNsYXNzIEFwaVN0YWNrIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpXG5cbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXlcbiAgICB0aGlzLmFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ01hcmtldHBsYWNlQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdNYXJrZXRwbGFjZSBBUEknLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIG1hcmtldHBsYWNlIHBsYXRmb3JtJyxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxuICAgICAgICAgICdYLUFtei1EYXRlJyxcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtQXBpLUtleScsXG4gICAgICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxuICAgICAgfSxcbiAgICB9KVxuXG4gICAgLy8gQ3JlYXRlIENvZ25pdG8gQXV0aG9yaXplclxuICAgIGNvbnN0IGNvZ25pdG9BdXRob3JpemVyID0gbmV3IGFwaWdhdGV3YXkuQ29nbml0b1VzZXJQb29sc0F1dGhvcml6ZXIodGhpcywgJ0NvZ25pdG9BdXRob3JpemVyJywge1xuICAgICAgY29nbml0b1VzZXJQb29sczogW3Byb3BzLnVzZXJQb29sXSxcbiAgICAgIGlkZW50aXR5U291cmNlOiAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nLFxuICAgIH0pXG5cbiAgICAvLyBMYW1iZGEgZXhlY3V0aW9uIHJvbGVcbiAgICBjb25zdCBsYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYVZQQ0FjY2Vzc0V4ZWN1dGlvblJvbGUnKSxcbiAgICAgIF0sXG4gICAgfSlcblxuICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zXG4gICAgcHJvcHMudXNlclRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsYW1iZGFSb2xlKVxuICAgIHByb3BzLnNvbHV0aW9uVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMucGFydG5lckFwcGxpY2F0aW9uVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxhbWJkYVJvbGUpXG4gICAgcHJvcHMuYXNzZXRzQnVja2V0LmdyYW50UmVhZFdyaXRlKGxhbWJkYVJvbGUpXG5cbiAgICAvLyBHcmFudCBDb2duaXRvIHBlcm1pc3Npb25zIGZvciB1c2VyIG1hbmFnZW1lbnRcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5EaXNhYmxlVXNlcicsXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkVuYWJsZVVzZXInLFxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy51c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgfSkpXG5cbiAgICAvLyBHcmFudCBTRVMgcGVybWlzc2lvbnMgZm9yIGVtYWlsIG5vdGlmaWNhdGlvbnNcbiAgICBsYW1iZGFSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxuICAgICAgICAnc2VzOlNlbmRSYXdFbWFpbCcsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gWW91IG1pZ2h0IHdhbnQgdG8gcmVzdHJpY3QgdGhpcyB0byBzcGVjaWZpYyBlbWFpbCBhZGRyZXNzZXNcbiAgICB9KSlcblxuICAgIC8vIEF1dGggTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IHJlZ2lzdGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdSZWdpc3RlckZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncmVnaXN0ZXIuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFVTRVJfUE9PTF9JRDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgIH0pXG5cbiAgICBjb25zdCBwcm9maWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQcm9maWxlRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdwcm9maWxlLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvYXV0aCcpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgfSlcblxuICAgIC8vIFVzZXIgTWFuYWdlbWVudCBMYW1iZGEgRnVuY3Rpb25cbiAgICBjb25zdCB1c2VyTWFuYWdlbWVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXNlck1hbmFnZW1lbnRGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3VzZXItbWFuYWdlbWVudC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfVEFCTEVfTkFNRTogcHJvcHMudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9QT09MX0lEOiBwcm9wcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFBhcnRuZXIgQXBwbGljYXRpb24gTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3QgcGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3BhcnRuZXItYXBwbGljYXRpb24uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBQQVJUTkVSX0FQUExJQ0FUSU9OX1RBQkxFX05BTUU6IHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBGUk9NX0VNQUlMOiAnbm9yZXBseUBtYXJrZXRwbGFjZS5jb20nLCAvLyBVcGRhdGUgd2l0aCB5b3VyIHZlcmlmaWVkIFNFUyBlbWFpbFxuICAgICAgICBBRE1JTl9FTUFJTDogJ2FkbWluQG1hcmtldHBsYWNlLmNvbScsIC8vIFVwZGF0ZSB3aXRoIGFkbWluIGVtYWlsXG4gICAgICB9LFxuICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gQ2F0YWxvZyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgY2F0YWxvZ0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ2F0YWxvZ0Z1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnY2F0YWxvZy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2NhdGFsb2cnKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNPTFVUSU9OX1RBQkxFX05BTUU6IHByb3BzLnNvbHV0aW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBU1NFVFNfQlVDS0VUX05BTUU6IHByb3BzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIFNvbHV0aW9uIE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uXG4gICAgY29uc3Qgc29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTb2x1dGlvbk1hbmFnZW1lbnRGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ3NvbHV0aW9uLW1hbmFnZW1lbnQuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9jYXRhbG9nJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTT0xVVElPTl9UQUJMRV9OQU1FOiBwcm9wcy5zb2x1dGlvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9UQUJMRV9OQU1FOiBwcm9wcy51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgICBBU1NFVFNfQlVDS0VUX05BTUU6IHByb3BzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBGUk9NX0VNQUlMOiAnbm9yZXBseUBtYXJrZXRwbGFjZS5jb20nLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSlcblxuICAgIC8vIEFQSSBSb3V0ZXNcbiAgICBjb25zdCBhdXRoQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpXG4gICAgY29uc3QgY2F0YWxvZ0FwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2NhdGFsb2cnKVxuICAgIGNvbnN0IHVzZXJBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd1c2VyJylcbiAgICBjb25zdCBhZG1pbkFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FkbWluJylcbiAgICBjb25zdCBwYXJ0bmVyQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGFydG5lcicpXG5cbiAgICAvLyBBdXRoIHJvdXRlc1xuICAgIGF1dGhBcGkuYWRkUmVzb3VyY2UoJ3JlZ2lzdGVyJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmVnaXN0ZXJGdW5jdGlvbikpXG4gICAgXG4gICAgLy8gVXNlciByb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBwcm9maWxlUmVzb3VyY2UgPSB1c2VyQXBpLmFkZFJlc291cmNlKCdwcm9maWxlJylcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9maWxlRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb2ZpbGVGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBVc2VyIG1hbmFnZW1lbnQgcm91dGVzXG4gICAgY29uc3QgdXNlcnNSZXNvdXJjZSA9IHVzZXJBcGkuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JylcbiAgICB1c2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbikpXG4gICAgXG4gICAgLy8gQWRtaW4gdXNlciBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IGFkbWluVXNlcnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCd1c2VycycpXG4gICAgYWRtaW5Vc2Vyc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYWRtaW5Vc2Vyc1Jlc291cmNlLmFkZFJlc291cmNlKCd7dXNlcklkfScpLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odXNlck1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBQYXJ0bmVyIGFwcGxpY2F0aW9uIHJvdXRlc1xuICAgIGNvbnN0IGFwcGxpY2F0aW9uc1Jlc291cmNlID0gcGFydG5lckFwaS5hZGRSZXNvdXJjZSgnYXBwbGljYXRpb25zJylcbiAgICBhcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYXBwbGljYXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgY29uc3QgYXBwbGljYXRpb25SZXNvdXJjZSA9IGFwcGxpY2F0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7YXBwbGljYXRpb25JZH0nKVxuICAgIGFwcGxpY2F0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYXBwbGljYXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIEFkbWluIHBhcnRuZXIgYXBwbGljYXRpb24gcm91dGVzXG4gICAgY29uc3QgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCdhcHBsaWNhdGlvbnMnKVxuICAgIGFkbWluQXBwbGljYXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2FwcGxpY2F0aW9uSWR9JykuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBDYXRhbG9nIHJvdXRlcyAocHVibGljKVxuICAgIGNhdGFsb2dBcGkuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3NlYXJjaCcpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCdjYXRlZ29yaWVzJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3tzb2x1dGlvbklkfScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBcbiAgICAvLyBJbWFnZSB1cGxvYWQgcm91dGUgKHByb3RlY3RlZClcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCd1cGxvYWQtaW1hZ2UnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gUGFydG5lciBzb2x1dGlvbiBtYW5hZ2VtZW50IHJvdXRlcyAocHJvdGVjdGVkKVxuICAgIGNvbnN0IHBhcnRuZXJTb2x1dGlvbnNSZXNvdXJjZSA9IHBhcnRuZXJBcGkuYWRkUmVzb3VyY2UoJ3NvbHV0aW9ucycpXG4gICAgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcGFydG5lclNvbHV0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY2F0YWxvZ0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBjb25zdCBwYXJ0bmVyU29sdXRpb25SZXNvdXJjZSA9IHBhcnRuZXJTb2x1dGlvbnNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3NvbHV0aW9uSWR9JylcbiAgICBwYXJ0bmVyU29sdXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhdGFsb2dGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgcGFydG5lclNvbHV0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjYXRhbG9nRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gQWRtaW4gc29sdXRpb24gbWFuYWdlbWVudCByb3V0ZXMgKHByb3RlY3RlZClcbiAgICBjb25zdCBhZG1pblNvbHV0aW9uc1Jlc291cmNlID0gYWRtaW5BcGkuYWRkUmVzb3VyY2UoJ3NvbHV0aW9ucycpXG4gICAgYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBjb25zdCBhZG1pblNvbHV0aW9uUmVzb3VyY2UgPSBhZG1pblNvbHV0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7c29sdXRpb25JZH0nKVxuICAgIGFkbWluU29sdXRpb25SZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhZG1pblNvbHV0aW9uUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzb2x1dGlvbk1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgfVxufSJdfQ==