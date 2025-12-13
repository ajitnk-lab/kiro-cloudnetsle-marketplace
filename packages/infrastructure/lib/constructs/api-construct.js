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
exports.ApiConstruct = void 0;
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const constructs_1 = require("constructs");
class ApiConstruct extends constructs_1.Construct {
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
        // Cognito Authorizer
        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [props.userPool],
        });
        // Auth routes (no auth required)
        const authApi = this.api.root.addResource('auth');
        authApi.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(props.registerFunction));
        // Catalog routes (no auth required)
        const catalogApi = this.api.root.addResource('catalog');
        catalogApi.addMethod('GET', new apigateway.LambdaIntegration(props.catalogFunction));
        catalogApi.addResource('search').addMethod('GET', new apigateway.LambdaIntegration(props.catalogFunction));
        catalogApi.addResource('categories').addMethod('GET', new apigateway.LambdaIntegration(props.catalogFunction));
        catalogApi.addResource('{solutionId}').addMethod('GET', new apigateway.LambdaIntegration(props.catalogFunction));
        catalogApi.addResource('upload-image').addMethod('POST', new apigateway.LambdaIntegration(props.catalogFunction));
        // User routes (auth required)
        const userApi = this.api.root.addResource('user');
        userApi.addResource('{userId}').addMethod('GET', new apigateway.LambdaIntegration(props.userManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        const profileResource = userApi.addResource('profile');
        profileResource.addMethod('GET', new apigateway.LambdaIntegration(props.profileFunction), {
            authorizer: cognitoAuthorizer,
        });
        profileResource.addMethod('PUT', new apigateway.LambdaIntegration(props.profileFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Payment routes
        const paymentsApi = this.api.root.addResource('payments');
        paymentsApi.addResource('initiate').addMethod('POST', new apigateway.LambdaIntegration(props.paymentInitiateFunction), {
            authorizer: cognitoAuthorizer,
        });
        paymentsApi.addResource('status').addResource('{transactionId}').addMethod('GET', new apigateway.LambdaIntegration(props.paymentStatusFunction));
        const callbackResource = paymentsApi.addResource('callback');
        callbackResource.addMethod('GET', new apigateway.LambdaIntegration(props.paymentCallbackFunction));
        callbackResource.addMethod('POST', new apigateway.LambdaIntegration(props.paymentCallbackFunction));
        paymentsApi.addResource('upgrade-to-pro').addMethod('POST', new apigateway.LambdaIntegration(props.upgradeToProFunction), {
            authorizer: cognitoAuthorizer,
        });
        paymentsApi.addResource('cashfree-webhook').addMethod('POST', new apigateway.LambdaIntegration(props.cashfreeWebhookFunction));
        paymentsApi.addResource('phonepe-webhook').addMethod('POST', new apigateway.LambdaIntegration(props.phonepeWebhookFunction));
        paymentsApi.addResource('reconciliation').addMethod('POST', new apigateway.LambdaIntegration(props.paymentReconciliationFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Partner routes (auth required)
        const partnerApi = this.api.root.addResource('partner');
        const applicationsResource = partnerApi.addResource('applications');
        applicationsResource.addMethod('GET', new apigateway.LambdaIntegration(props.partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        applicationsResource.addMethod('POST', new apigateway.LambdaIntegration(props.partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        const applicationIdResource = applicationsResource.addResource('{applicationId}');
        applicationIdResource.addMethod('GET', new apigateway.LambdaIntegration(props.partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        applicationIdResource.addMethod('PUT', new apigateway.LambdaIntegration(props.partnerApplicationFunction), {
            authorizer: cognitoAuthorizer,
        });
        const solutionsResource = partnerApi.addResource('solutions');
        solutionsResource.addMethod('GET', new apigateway.LambdaIntegration(props.solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        solutionsResource.addMethod('POST', new apigateway.LambdaIntegration(props.solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        const solutionIdResource = solutionsResource.addResource('{solutionId}');
        solutionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(props.solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        solutionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(props.solutionManagementFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Admin routes (auth required)
        const adminApi = this.api.root.addResource('admin');
        const adminUsersResource = adminApi.addResource('users');
        adminUsersResource.addMethod('GET', new apigateway.LambdaIntegration(props.adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        adminUsersResource.addResource('{userId}').addMethod('PUT', new apigateway.LambdaIntegration(props.adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        const adminApplicationsResource = adminApi.addResource('applications');
        adminApplicationsResource.addMethod('GET', new apigateway.LambdaIntegration(props.adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        adminApplicationsResource.addResource('{applicationId}').addMethod('PUT', new apigateway.LambdaIntegration(props.adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        const adminSolutionsResource = adminApi.addResource('solutions');
        adminSolutionsResource.addMethod('GET', new apigateway.LambdaIntegration(props.adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        adminSolutionsResource.addResource('{solutionId}').addMethod('PUT', new apigateway.LambdaIntegration(props.adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        adminApi.addResource('migrate-user-countries').addMethod('POST', new apigateway.LambdaIntegration(props.adminFunction), {
            authorizer: cognitoAuthorizer,
        });
        // API routes (for solution access)
        const apiResource = this.api.root.addResource('api');
        apiResource.addResource('generate-token').addMethod('POST', new apigateway.LambdaIntegration(props.tokenManagerFunction), {
            authorizer: cognitoAuthorizer,
        });
        apiResource.addResource('validate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(props.solutionTokenValidatorFunction));
        apiResource.addResource('generate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(props.generateSolutionTokenFunction), {
            authorizer: cognitoAuthorizer,
        });
        apiResource.addResource('check-user-limits').addMethod('POST', new apigateway.LambdaIntegration(props.checkUserLimitsFunction));
        apiResource.addResource('increment-usage').addMethod('POST', new apigateway.LambdaIntegration(props.incrementUsageFunctionCF29C1F7));
        apiResource.addResource('track-usage').addMethod('POST', new apigateway.LambdaIntegration(props.incrementUsageFunctionCF29C1F7));
        apiResource.addResource('user-tokens').addResource('{userId}').addMethod('GET', new apigateway.LambdaIntegration(props.tokenManagerFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Analytics routes (auth required)
        const analyticsApi = apiResource.addResource('analytics');
        analyticsApi.addResource('business-metrics').addMethod('GET', new apigateway.LambdaIntegration(props.businessMetricsFunction), {
            authorizer: cognitoAuthorizer,
        });
        analyticsApi.addResource('geographic').addMethod('GET', new apigateway.LambdaIntegration(props.geographicAnalyticsFunction), {
            authorizer: cognitoAuthorizer,
        });
        analyticsApi.addResource('usage').addMethod('GET', new apigateway.LambdaIntegration(props.usageAnalyticsFunction), {
            authorizer: cognitoAuthorizer,
        });
        analyticsApi.addResource('msme-kpis').addMethod('GET', new apigateway.LambdaIntegration(props.msmeKpiFunction), {
            authorizer: cognitoAuthorizer,
        });
        // Founder metrics (auth required)
        const founderApi = apiResource.addResource('founder');
        founderApi.addResource('metrics').addMethod('GET', new apigateway.LambdaIntegration(props.businessMetricsFunction), {
            authorizer: cognitoAuthorizer,
        });
    }
}
exports.ApiConstruct = ApiConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwaS1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUVBQXdEO0FBR3hELDJDQUFzQztBQW1DdEMsTUFBYSxZQUFhLFNBQVEsc0JBQVM7SUFHekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEQsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixXQUFXLEVBQUUsOEJBQThCO1lBQzNDLDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUU7b0JBQ1osY0FBYztvQkFDZCxZQUFZO29CQUNaLGVBQWU7b0JBQ2YsV0FBVztvQkFDWCxzQkFBc0I7aUJBQ3ZCO2FBQ0Y7WUFDRCxhQUFhLEVBQUU7Z0JBQ2IsU0FBUyxFQUFFLE1BQU07YUFDbEI7U0FDRixDQUFDLENBQUE7UUFFRixxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUU7WUFDMUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsWUFBWTtZQUMxQyxlQUFlLEVBQUU7Z0JBQ2YsNkJBQTZCLEVBQUUsS0FBSztnQkFDcEMsOEJBQThCLEVBQUUsd0VBQXdFO2dCQUN4Ryw4QkFBOEIsRUFBRSwrQkFBK0I7YUFDaEU7U0FDRixDQUFDLENBQUE7UUFFRixxQkFBcUI7UUFDckIsTUFBTSxpQkFBaUIsR0FB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QUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFO1lBQ2xILFVBQVUsRUFBRSxpQkFBaUI7U0FDOUIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBOUxELG9DQThMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5pbnRlcmZhY2UgQXBpQ29uc3RydWN0UHJvcHMge1xuICAvLyBMYW1iZGEgZnVuY3Rpb25zXG4gIHBheW1lbnRJbml0aWF0ZUZ1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIHBheW1lbnRTdGF0dXNGdW5jdGlvbjogbGFtYmRhLklGdW5jdGlvblxuICB1cGdyYWRlVG9Qcm9GdW5jdGlvbjogbGFtYmRhLklGdW5jdGlvblxuICBwYXltZW50Q2FsbGJhY2tGdW5jdGlvbjogbGFtYmRhLklGdW5jdGlvblxuICBjYXNoZnJlZVdlYmhvb2tGdW5jdGlvbjogbGFtYmRhLklGdW5jdGlvblxuICBwaG9uZXBlV2ViaG9va0Z1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIHBob25lcGVSZWNvbmNpbGlhdGlvbkZ1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIGludm9pY2VHZW5lcmF0aW9uRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb25cbiAgY2F0YWxvZ0Z1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIHNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIHBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIGFkbWluRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb25cbiAgdXNlck1hbmFnZW1lbnRGdW5jdGlvbjogbGFtYmRhLklGdW5jdGlvblxuICBwcm9maWxlRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb25cbiAgcmVnaXN0ZXJGdW5jdGlvbjogbGFtYmRhLklGdW5jdGlvblxuICB0b2tlbk1hbmFnZXJGdW5jdGlvbjogbGFtYmRhLklGdW5jdGlvblxuICBzb2x1dGlvblRva2VuR2VuZXJhdG9yRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb25cbiAgZ2VuZXJhdGVTb2x1dGlvblRva2VuRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb25cbiAgc29sdXRpb25Ub2tlblZhbGlkYXRvckZ1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIGNoZWNrVXNlckxpbWl0c0Z1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIGluY3JlbWVudFVzYWdlRnVuY3Rpb25DRjI5QzFGNzogbGFtYmRhLklGdW5jdGlvblxuICB1c2FnZUFuYWx5dGljc0Z1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIGJ1c2luZXNzTWV0cmljc0Z1bmN0aW9uOiBsYW1iZGEuSUZ1bmN0aW9uXG4gIGdlb2dyYXBoaWNBbmFseXRpY3NGdW5jdGlvbjogbGFtYmRhLklGdW5jdGlvblxuICBtc21lS3BpRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb25cbiAgcGF5bWVudFJlY29uY2lsaWF0aW9uRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb25cblxuICAvLyBDb2duaXRvXG4gIHVzZXJQb29sOiBjb2duaXRvLklVc2VyUG9vbFxufVxuXG5leHBvcnQgY2xhc3MgQXBpQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaUNvbnN0cnVjdFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKVxuXG4gICAgLy8gQ3JlYXRlIEFQSSBHYXRld2F5XG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdNYXJrZXRwbGFjZUFwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiAnTWFya2V0cGxhY2UgQVBJJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBtYXJrZXRwbGFjZSBwbGF0Zm9ybScsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxuICAgICAgICAgICdYLUFwaS1LZXknLFxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6ICdwcm9kJyxcbiAgICAgIH0sXG4gICAgfSlcblxuICAgIC8vIEFkZCBDT1JTIHN1cHBvcnQgZm9yIDQwMSByZXNwb25zZXNcbiAgICB0aGlzLmFwaS5hZGRHYXRld2F5UmVzcG9uc2UoJ1VuYXV0aG9yaXplZCcsIHtcbiAgICAgIHR5cGU6IGFwaWdhdGV3YXkuUmVzcG9uc2VUeXBlLlVOQVVUSE9SSVpFRCxcbiAgICAgIHJlc3BvbnNlSGVhZGVyczoge1xuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbidcIixcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMnXCIsXG4gICAgICB9LFxuICAgIH0pXG5cbiAgICAvLyBDb2duaXRvIEF1dGhvcml6ZXJcbiAgICBjb25zdCBjb2duaXRvQXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyKHRoaXMsICdDb2duaXRvQXV0aG9yaXplcicsIHtcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFtwcm9wcy51c2VyUG9vbF0sXG4gICAgfSlcblxuICAgIC8vIEF1dGggcm91dGVzIChubyBhdXRoIHJlcXVpcmVkKVxuICAgIGNvbnN0IGF1dGhBcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhdXRoJylcbiAgICBhdXRoQXBpLmFkZFJlc291cmNlKCdyZWdpc3RlcicpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLnJlZ2lzdGVyRnVuY3Rpb24pKVxuXG4gICAgLy8gQ2F0YWxvZyByb3V0ZXMgKG5vIGF1dGggcmVxdWlyZWQpXG4gICAgY29uc3QgY2F0YWxvZ0FwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2NhdGFsb2cnKVxuICAgIGNhdGFsb2dBcGkuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5jYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3NlYXJjaCcpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCdjYXRlZ29yaWVzJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5jYXRhbG9nRnVuY3Rpb24pKVxuICAgIGNhdGFsb2dBcGkuYWRkUmVzb3VyY2UoJ3tzb2x1dGlvbklkfScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuY2F0YWxvZ0Z1bmN0aW9uKSlcbiAgICBjYXRhbG9nQXBpLmFkZFJlc291cmNlKCd1cGxvYWQtaW1hZ2UnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5jYXRhbG9nRnVuY3Rpb24pKVxuXG4gICAgLy8gVXNlciByb3V0ZXMgKGF1dGggcmVxdWlyZWQpXG4gICAgY29uc3QgdXNlckFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXInKVxuICAgIHVzZXJBcGkuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy51c2VyTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBcbiAgICBjb25zdCBwcm9maWxlUmVzb3VyY2UgPSB1c2VyQXBpLmFkZFJlc291cmNlKCdwcm9maWxlJylcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5wcm9maWxlRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLnByb2ZpbGVGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBQYXltZW50IHJvdXRlc1xuICAgIGNvbnN0IHBheW1lbnRzQXBpID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgncGF5bWVudHMnKVxuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCdpbml0aWF0ZScpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLnBheW1lbnRJbml0aWF0ZUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgnc3RhdHVzJykuYWRkUmVzb3VyY2UoJ3t0cmFuc2FjdGlvbklkfScpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMucGF5bWVudFN0YXR1c0Z1bmN0aW9uKSlcbiAgICBcbiAgICBjb25zdCBjYWxsYmFja1Jlc291cmNlID0gcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ2NhbGxiYWNrJylcbiAgICBjYWxsYmFja1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMucGF5bWVudENhbGxiYWNrRnVuY3Rpb24pKVxuICAgIGNhbGxiYWNrUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMucGF5bWVudENhbGxiYWNrRnVuY3Rpb24pKVxuICAgIFxuICAgIHBheW1lbnRzQXBpLmFkZFJlc291cmNlKCd1cGdyYWRlLXRvLXBybycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLnVwZ3JhZGVUb1Byb0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgnY2FzaGZyZWUtd2ViaG9vaycpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLmNhc2hmcmVlV2ViaG9va0Z1bmN0aW9uKSlcbiAgICBwYXltZW50c0FwaS5hZGRSZXNvdXJjZSgncGhvbmVwZS13ZWJob29rJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMucGhvbmVwZVdlYmhvb2tGdW5jdGlvbikpXG4gICAgcGF5bWVudHNBcGkuYWRkUmVzb3VyY2UoJ3JlY29uY2lsaWF0aW9uJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMucGF5bWVudFJlY29uY2lsaWF0aW9uRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gUGFydG5lciByb3V0ZXMgKGF1dGggcmVxdWlyZWQpXG4gICAgY29uc3QgcGFydG5lckFwaSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BhcnRuZXInKVxuICAgIFxuICAgIGNvbnN0IGFwcGxpY2F0aW9uc1Jlc291cmNlID0gcGFydG5lckFwaS5hZGRSZXNvdXJjZSgnYXBwbGljYXRpb25zJylcbiAgICBhcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5wYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgXG4gICAgY29uc3QgYXBwbGljYXRpb25JZFJlc291cmNlID0gYXBwbGljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3thcHBsaWNhdGlvbklkfScpXG4gICAgYXBwbGljYXRpb25JZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMucGFydG5lckFwcGxpY2F0aW9uRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGFwcGxpY2F0aW9uSWRSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLnBhcnRuZXJBcHBsaWNhdGlvbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBcbiAgICBjb25zdCBzb2x1dGlvbnNSZXNvdXJjZSA9IHBhcnRuZXJBcGkuYWRkUmVzb3VyY2UoJ3NvbHV0aW9ucycpXG4gICAgc29sdXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5zb2x1dGlvbk1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgc29sdXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuc29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIFxuICAgIGNvbnN0IHNvbHV0aW9uSWRSZXNvdXJjZSA9IHNvbHV0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7c29sdXRpb25JZH0nKVxuICAgIHNvbHV0aW9uSWRSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLnNvbHV0aW9uTWFuYWdlbWVudEZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBzb2x1dGlvbklkUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5zb2x1dGlvbk1hbmFnZW1lbnRGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBBZG1pbiByb3V0ZXMgKGF1dGggcmVxdWlyZWQpXG4gICAgY29uc3QgYWRtaW5BcGkgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhZG1pbicpXG4gICAgXG4gICAgY29uc3QgYWRtaW5Vc2Vyc1Jlc291cmNlID0gYWRtaW5BcGkuYWRkUmVzb3VyY2UoJ3VzZXJzJylcbiAgICBhZG1pblVzZXJzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5hZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhZG1pblVzZXJzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JykuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5hZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBcbiAgICBjb25zdCBhZG1pbkFwcGxpY2F0aW9uc1Jlc291cmNlID0gYWRtaW5BcGkuYWRkUmVzb3VyY2UoJ2FwcGxpY2F0aW9ucycpXG4gICAgYWRtaW5BcHBsaWNhdGlvbnNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLmFkbWluRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGFkbWluQXBwbGljYXRpb25zUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3thcHBsaWNhdGlvbklkfScpLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuYWRtaW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgXG4gICAgY29uc3QgYWRtaW5Tb2x1dGlvbnNSZXNvdXJjZSA9IGFkbWluQXBpLmFkZFJlc291cmNlKCdzb2x1dGlvbnMnKVxuICAgIGFkbWluU29sdXRpb25zUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5hZG1pbkZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhZG1pblNvbHV0aW9uc1Jlc291cmNlLmFkZFJlc291cmNlKCd7c29sdXRpb25JZH0nKS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLmFkbWluRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIFxuICAgIGFkbWluQXBpLmFkZFJlc291cmNlKCdtaWdyYXRlLXVzZXItY291bnRyaWVzJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuYWRtaW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBBUEkgcm91dGVzIChmb3Igc29sdXRpb24gYWNjZXNzKVxuICAgIGNvbnN0IGFwaVJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXBpJylcbiAgICBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZ2VuZXJhdGUtdG9rZW4nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy50b2tlbk1hbmFnZXJGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3ZhbGlkYXRlLXNvbHV0aW9uLXRva2VuJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuc29sdXRpb25Ub2tlblZhbGlkYXRvckZ1bmN0aW9uKSlcbiAgICBhcGlSZXNvdXJjZS5hZGRSZXNvdXJjZSgnZ2VuZXJhdGUtc29sdXRpb24tdG9rZW4nKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5nZW5lcmF0ZVNvbHV0aW9uVG9rZW5GdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2NoZWNrLXVzZXItbGltaXRzJykuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuY2hlY2tVc2VyTGltaXRzRnVuY3Rpb24pKVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdpbmNyZW1lbnQtdXNhZ2UnKS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy5pbmNyZW1lbnRVc2FnZUZ1bmN0aW9uQ0YyOUMxRjcpKVxuICAgIGFwaVJlc291cmNlLmFkZFJlc291cmNlKCd0cmFjay11c2FnZScpLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLmluY3JlbWVudFVzYWdlRnVuY3Rpb25DRjI5QzFGNykpXG4gICAgYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3VzZXItdG9rZW5zJykuYWRkUmVzb3VyY2UoJ3t1c2VySWR9JykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy50b2tlbk1hbmFnZXJGdW5jdGlvbiksIHtcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICAvLyBBbmFseXRpY3Mgcm91dGVzIChhdXRoIHJlcXVpcmVkKVxuICAgIGNvbnN0IGFuYWx5dGljc0FwaSA9IGFwaVJlc291cmNlLmFkZFJlc291cmNlKCdhbmFseXRpY3MnKVxuICAgIGFuYWx5dGljc0FwaS5hZGRSZXNvdXJjZSgnYnVzaW5lc3MtbWV0cmljcycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuYnVzaW5lc3NNZXRyaWNzRnVuY3Rpb24pLCB7XG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcbiAgICB9KVxuICAgIGFuYWx5dGljc0FwaS5hZGRSZXNvdXJjZSgnZ2VvZ3JhcGhpYycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMuZ2VvZ3JhcGhpY0FuYWx5dGljc0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhbmFseXRpY3NBcGkuYWRkUmVzb3VyY2UoJ3VzYWdlJykuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihwcm9wcy51c2FnZUFuYWx5dGljc0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgICBhbmFseXRpY3NBcGkuYWRkUmVzb3VyY2UoJ21zbWUta3BpcycpLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocHJvcHMubXNtZUtwaUZ1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIC8vIEZvdW5kZXIgbWV0cmljcyAoYXV0aCByZXF1aXJlZClcbiAgICBjb25zdCBmb3VuZGVyQXBpID0gYXBpUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2ZvdW5kZXInKVxuICAgIGZvdW5kZXJBcGkuYWRkUmVzb3VyY2UoJ21ldHJpY3MnKS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHByb3BzLmJ1c2luZXNzTWV0cmljc0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXG4gICAgfSlcbiAgfVxufVxuIl19