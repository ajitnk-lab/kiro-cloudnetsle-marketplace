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
exports.MarketplaceInfrastructureStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const auth_stack_1 = require("./auth-stack");
const data_construct_1 = require("./constructs/data-construct");
const api_construct_1 = require("./constructs/api-construct");
const frontend_stack_1 = require("./frontend-stack");
class MarketplaceInfrastructureStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create authentication layer first (Cognito with custom attributes)
        const authStack = new auth_stack_1.AuthStack(this, 'AuthStack', {
            userTableName: '', // Will be set after DataConstruct creation
            userSolutionEntitlementsTableName: '',
            subscriptionHistoryTableName: '',
            tokenSecret: 'marketplace-secret-key-2024',
        });
        // Create data layer (DynamoDB, S3, Lambda functions) - pass AuthStack's UserPool
        const dataConstruct = new data_construct_1.DataConstruct(this, 'DataStack', {
            userPool: authStack.userPool,
            userPoolClient: authStack.userPoolClient,
        });
        // Grant permissions to auth functions
        dataConstruct.userTable.grantWriteData(authStack.postConfirmationFunction);
        dataConstruct.userSolutionEntitlementsTable.grantWriteData(authStack.postConfirmationFunction);
        dataConstruct.subscriptionHistoryTable.grantWriteData(authStack.postConfirmationFunction);
        // Update AuthStack Lambda environment variables with table names
        authStack.postConfirmationFunction.addEnvironment('USER_TABLE_NAME', dataConstruct.userTable.tableName);
        authStack.postConfirmationFunction.addEnvironment('ENTITLEMENT_TABLE_NAME', dataConstruct.userSolutionEntitlementsTable.tableName);
        authStack.postConfirmationFunction.addEnvironment('SUBSCRIPTION_HISTORY_TABLE_NAME', dataConstruct.subscriptionHistoryTable.tableName);
        // Create API layer (API Gateway only - references Lambda from DataConstruct)
        const apiConstruct = new api_construct_1.ApiConstruct(this, 'ApiStack', {
            // Pass all Lambda functions from DataConstruct
            paymentInitiateFunction: dataConstruct.paymentInitiateFunction,
            paymentStatusFunction: dataConstruct.paymentStatusFunction,
            upgradeToProFunction: dataConstruct.upgradeToProFunction,
            paymentCallbackFunction: dataConstruct.paymentCallbackFunction,
            cashfreeWebhookFunction: dataConstruct.cashfreeWebhookFunction,
            phonepeWebhookFunction: dataConstruct.phonepeWebhookFunction,
            phonepeReconciliationFunction: dataConstruct.phonepeReconciliationFunction,
            invoiceGenerationFunction: dataConstruct.invoiceGenerationFunction,
            catalogFunction: dataConstruct.catalogFunction,
            solutionManagementFunction: dataConstruct.solutionManagementFunction,
            partnerApplicationFunction: dataConstruct.partnerApplicationFunction,
            adminFunction: dataConstruct.adminFunction,
            userManagementFunction: dataConstruct.userManagementFunction,
            profileFunction: dataConstruct.profileFunction,
            registerFunction: dataConstruct.registerFunction,
            tokenManagerFunction: dataConstruct.tokenManagerFunction,
            solutionTokenGeneratorFunction: dataConstruct.solutionTokenGeneratorFunction,
            generateSolutionTokenFunction: dataConstruct.generateSolutionTokenFunction,
            solutionTokenValidatorFunction: dataConstruct.solutionTokenValidatorFunction,
            checkUserLimitsFunction: dataConstruct.checkUserLimitsFunction,
            incrementUsageFunctionCF29C1F7: dataConstruct.incrementUsageFunctionCF29C1F7,
            usageAnalyticsFunction: dataConstruct.usageAnalyticsFunction,
            businessMetricsFunction: dataConstruct.businessMetricsFunction,
            geographicAnalyticsFunction: dataConstruct.geographicAnalyticsFunction,
            msmeKpiFunction: dataConstruct.msmeKpiFunction,
            paymentReconciliationFunction: dataConstruct.paymentReconciliationFunction,
            // Pass Cognito User Pool from AuthStack
            userPool: authStack.userPool,
        });
        // Create frontend deployment (S3 + CloudFront)
        const frontendStack = new frontend_stack_1.FrontendStack(this, 'FrontendStack');
        // Output important values
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: authStack.userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: authStack.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });
        new cdk.CfnOutput(this, 'ApiGatewayUrl', {
            value: apiConstruct.api.url,
            description: 'API Gateway URL',
        });
        new cdk.CfnOutput(this, 'AssetsBucketName', {
            value: dataConstruct.assetsBucket.bucketName,
            description: 'S3 Assets Bucket Name',
        });
        new cdk.CfnOutput(this, 'InvoiceBucketName', {
            value: dataConstruct.invoiceBucket.bucketName,
            description: 'S3 Invoice Bucket Name',
        });
        new cdk.CfnOutput(this, 'WebsiteUrl', {
            value: frontendStack.websiteUrl,
            description: 'Frontend Website URL (CloudFront)',
        });
        new cdk.CfnOutput(this, 'WebsiteBucketName', {
            value: frontendStack.websiteBucket.bucketName,
            description: 'S3 Website Bucket Name',
        });
        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: frontendStack.distribution.distributionId,
            description: 'CloudFront Distribution ID',
        });
        // Export DynamoDB table names for FAISS integration
        new cdk.CfnOutput(this, 'UserTableName', {
            value: dataConstruct.userTable.tableName,
            description: 'DynamoDB User Table Name',
        });
        new cdk.CfnOutput(this, 'EntitlementTableName', {
            value: dataConstruct.userSolutionEntitlementsTable.tableName,
            description: 'DynamoDB User Solution Entitlements Table Name',
        });
        new cdk.CfnOutput(this, 'SessionTableName', {
            value: dataConstruct.sessionTable.tableName,
            description: 'DynamoDB Session Table Name',
        });
        new cdk.CfnOutput(this, 'CompanySettingsTableName', {
            value: dataConstruct.companySettingsTable.tableName,
            description: 'DynamoDB Company Settings Table Name (GST)',
        });
    }
}
exports.MarketplaceInfrastructureStack = MarketplaceInfrastructureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsNkNBQXdDO0FBQ3hDLGdFQUEyRDtBQUMzRCw4REFBeUQ7QUFDekQscURBQWdEO0FBRWhELE1BQWEsOEJBQStCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0QsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QixxRUFBcUU7UUFDckUsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDakQsYUFBYSxFQUFFLEVBQUUsRUFBRSwyQ0FBMkM7WUFDOUQsaUNBQWlDLEVBQUUsRUFBRTtZQUNyQyw0QkFBNEIsRUFBRSxFQUFFO1lBQ2hDLFdBQVcsRUFBRSw2QkFBNkI7U0FDM0MsQ0FBQyxDQUFBO1FBRUYsaUZBQWlGO1FBQ2pGLE1BQU0sYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ3pELFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtZQUM1QixjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWM7U0FDekMsQ0FBQyxDQUFBO1FBRUYsc0NBQXNDO1FBQ3RDLGFBQWEsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQzFFLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDOUYsYUFBYSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsd0JB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VyxFQUFFLGdEQUFnRDtTQUM5RCxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFDLEtBQUssRUFBRSxhQUFhLENBQUMsWUFBWSxDQUFDLFNBQVM7WUFDM0MsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxhQUFhLENBQUMsb0JBQW9CLENBQUMsU0FBUztZQUNuRCxXQUFXLEVBQUUsNENBQTRDO1NBQzFELENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQS9IRCx3RUErSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuaW1wb3J0IHsgQXV0aFN0YWNrIH0gZnJvbSAnLi9hdXRoLXN0YWNrJ1xuaW1wb3J0IHsgRGF0YUNvbnN0cnVjdCB9IGZyb20gJy4vY29uc3RydWN0cy9kYXRhLWNvbnN0cnVjdCdcbmltcG9ydCB7IEFwaUNvbnN0cnVjdCB9IGZyb20gJy4vY29uc3RydWN0cy9hcGktY29uc3RydWN0J1xuaW1wb3J0IHsgRnJvbnRlbmRTdGFjayB9IGZyb20gJy4vZnJvbnRlbmQtc3RhY2snXG5cbmV4cG9ydCBjbGFzcyBNYXJrZXRwbGFjZUluZnJhc3RydWN0dXJlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIC8vIENyZWF0ZSBhdXRoZW50aWNhdGlvbiBsYXllciBmaXJzdCAoQ29nbml0byB3aXRoIGN1c3RvbSBhdHRyaWJ1dGVzKVxuICAgIGNvbnN0IGF1dGhTdGFjayA9IG5ldyBBdXRoU3RhY2sodGhpcywgJ0F1dGhTdGFjaycsIHtcbiAgICAgIHVzZXJUYWJsZU5hbWU6ICcnLCAvLyBXaWxsIGJlIHNldCBhZnRlciBEYXRhQ29uc3RydWN0IGNyZWF0aW9uXG4gICAgICB1c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZU5hbWU6ICcnLFxuICAgICAgc3Vic2NyaXB0aW9uSGlzdG9yeVRhYmxlTmFtZTogJycsXG4gICAgICB0b2tlblNlY3JldDogJ21hcmtldHBsYWNlLXNlY3JldC1rZXktMjAyNCcsXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBkYXRhIGxheWVyIChEeW5hbW9EQiwgUzMsIExhbWJkYSBmdW5jdGlvbnMpIC0gcGFzcyBBdXRoU3RhY2sncyBVc2VyUG9vbFxuICAgIGNvbnN0IGRhdGFDb25zdHJ1Y3QgPSBuZXcgRGF0YUNvbnN0cnVjdCh0aGlzLCAnRGF0YVN0YWNrJywge1xuICAgICAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50OiBhdXRoU3RhY2sudXNlclBvb2xDbGllbnQsXG4gICAgfSlcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIGF1dGggZnVuY3Rpb25zXG4gICAgZGF0YUNvbnN0cnVjdC51c2VyVGFibGUuZ3JhbnRXcml0ZURhdGEoYXV0aFN0YWNrLnBvc3RDb25maXJtYXRpb25GdW5jdGlvbilcbiAgICBkYXRhQ29uc3RydWN0LnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLmdyYW50V3JpdGVEYXRhKGF1dGhTdGFjay5wb3N0Q29uZmlybWF0aW9uRnVuY3Rpb24pXG4gICAgZGF0YUNvbnN0cnVjdC5zdWJzY3JpcHRpb25IaXN0b3J5VGFibGUuZ3JhbnRXcml0ZURhdGEoYXV0aFN0YWNrLnBvc3RDb25maXJtYXRpb25GdW5jdGlvbilcbiAgICBcbiAgICAvLyBVcGRhdGUgQXV0aFN0YWNrIExhbWJkYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2l0aCB0YWJsZSBuYW1lc1xuICAgIGF1dGhTdGFjay5wb3N0Q29uZmlybWF0aW9uRnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoJ1VTRVJfVEFCTEVfTkFNRScsIGRhdGFDb25zdHJ1Y3QudXNlclRhYmxlLnRhYmxlTmFtZSlcbiAgICBhdXRoU3RhY2sucG9zdENvbmZpcm1hdGlvbkZ1bmN0aW9uLmFkZEVudmlyb25tZW50KCdFTlRJVExFTUVOVF9UQUJMRV9OQU1FJywgZGF0YUNvbnN0cnVjdC51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUpXG4gICAgYXV0aFN0YWNrLnBvc3RDb25maXJtYXRpb25GdW5jdGlvbi5hZGRFbnZpcm9ubWVudCgnU1VCU0NSSVBUSU9OX0hJU1RPUllfVEFCTEVfTkFNRScsIGRhdGFDb25zdHJ1Y3Quc3Vic2NyaXB0aW9uSGlzdG9yeVRhYmxlLnRhYmxlTmFtZSlcblxuICAgIC8vIENyZWF0ZSBBUEkgbGF5ZXIgKEFQSSBHYXRld2F5IG9ubHkgLSByZWZlcmVuY2VzIExhbWJkYSBmcm9tIERhdGFDb25zdHJ1Y3QpXG4gICAgY29uc3QgYXBpQ29uc3RydWN0ID0gbmV3IEFwaUNvbnN0cnVjdCh0aGlzLCAnQXBpU3RhY2snLCB7XG4gICAgICAvLyBQYXNzIGFsbCBMYW1iZGEgZnVuY3Rpb25zIGZyb20gRGF0YUNvbnN0cnVjdFxuICAgICAgcGF5bWVudEluaXRpYXRlRnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QucGF5bWVudEluaXRpYXRlRnVuY3Rpb24sXG4gICAgICBwYXltZW50U3RhdHVzRnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QucGF5bWVudFN0YXR1c0Z1bmN0aW9uLFxuICAgICAgdXBncmFkZVRvUHJvRnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QudXBncmFkZVRvUHJvRnVuY3Rpb24sXG4gICAgICBwYXltZW50Q2FsbGJhY2tGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5wYXltZW50Q2FsbGJhY2tGdW5jdGlvbixcbiAgICAgIGNhc2hmcmVlV2ViaG9va0Z1bmN0aW9uOiBkYXRhQ29uc3RydWN0LmNhc2hmcmVlV2ViaG9va0Z1bmN0aW9uLFxuICAgICAgcGhvbmVwZVdlYmhvb2tGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5waG9uZXBlV2ViaG9va0Z1bmN0aW9uLFxuICAgICAgcGhvbmVwZVJlY29uY2lsaWF0aW9uRnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QucGhvbmVwZVJlY29uY2lsaWF0aW9uRnVuY3Rpb24sXG4gICAgICBpbnZvaWNlR2VuZXJhdGlvbkZ1bmN0aW9uOiBkYXRhQ29uc3RydWN0Lmludm9pY2VHZW5lcmF0aW9uRnVuY3Rpb24sXG4gICAgICBjYXRhbG9nRnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QuY2F0YWxvZ0Z1bmN0aW9uLFxuICAgICAgc29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb246IGRhdGFDb25zdHJ1Y3Quc29sdXRpb25NYW5hZ2VtZW50RnVuY3Rpb24sXG4gICAgICBwYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5wYXJ0bmVyQXBwbGljYXRpb25GdW5jdGlvbixcbiAgICAgIGFkbWluRnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QuYWRtaW5GdW5jdGlvbixcbiAgICAgIHVzZXJNYW5hZ2VtZW50RnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QudXNlck1hbmFnZW1lbnRGdW5jdGlvbixcbiAgICAgIHByb2ZpbGVGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5wcm9maWxlRnVuY3Rpb24sXG4gICAgICByZWdpc3RlckZ1bmN0aW9uOiBkYXRhQ29uc3RydWN0LnJlZ2lzdGVyRnVuY3Rpb24sXG4gICAgICB0b2tlbk1hbmFnZXJGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC50b2tlbk1hbmFnZXJGdW5jdGlvbixcbiAgICAgIHNvbHV0aW9uVG9rZW5HZW5lcmF0b3JGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5zb2x1dGlvblRva2VuR2VuZXJhdG9yRnVuY3Rpb24sXG4gICAgICBnZW5lcmF0ZVNvbHV0aW9uVG9rZW5GdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5nZW5lcmF0ZVNvbHV0aW9uVG9rZW5GdW5jdGlvbixcbiAgICAgIHNvbHV0aW9uVG9rZW5WYWxpZGF0b3JGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5zb2x1dGlvblRva2VuVmFsaWRhdG9yRnVuY3Rpb24sXG4gICAgICBjaGVja1VzZXJMaW1pdHNGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5jaGVja1VzZXJMaW1pdHNGdW5jdGlvbixcbiAgICAgIGluY3JlbWVudFVzYWdlRnVuY3Rpb25DRjI5QzFGNzogZGF0YUNvbnN0cnVjdC5pbmNyZW1lbnRVc2FnZUZ1bmN0aW9uQ0YyOUMxRjcsXG4gICAgICB1c2FnZUFuYWx5dGljc0Z1bmN0aW9uOiBkYXRhQ29uc3RydWN0LnVzYWdlQW5hbHl0aWNzRnVuY3Rpb24sXG4gICAgICBidXNpbmVzc01ldHJpY3NGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5idXNpbmVzc01ldHJpY3NGdW5jdGlvbixcbiAgICAgIGdlb2dyYXBoaWNBbmFseXRpY3NGdW5jdGlvbjogZGF0YUNvbnN0cnVjdC5nZW9ncmFwaGljQW5hbHl0aWNzRnVuY3Rpb24sXG4gICAgICBtc21lS3BpRnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QubXNtZUtwaUZ1bmN0aW9uLFxuICAgICAgcGF5bWVudFJlY29uY2lsaWF0aW9uRnVuY3Rpb246IGRhdGFDb25zdHJ1Y3QucGF5bWVudFJlY29uY2lsaWF0aW9uRnVuY3Rpb24sXG4gICAgICBcbiAgICAgIC8vIFBhc3MgQ29nbml0byBVc2VyIFBvb2wgZnJvbSBBdXRoU3RhY2tcbiAgICAgIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBmcm9udGVuZCBkZXBsb3ltZW50IChTMyArIENsb3VkRnJvbnQpXG4gICAgY29uc3QgZnJvbnRlbmRTdGFjayA9IG5ldyBGcm9udGVuZFN0YWNrKHRoaXMsICdGcm9udGVuZFN0YWNrJylcblxuICAgIC8vIE91dHB1dCBpbXBvcnRhbnQgdmFsdWVzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XG4gICAgICB2YWx1ZTogYXV0aFN0YWNrLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XG4gICAgICB2YWx1ZTogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xuICAgICAgdmFsdWU6IGFwaUNvbnN0cnVjdC5hcGkudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXNzZXRzQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiBkYXRhQ29uc3RydWN0LmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBBc3NldHMgQnVja2V0IE5hbWUnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSW52b2ljZUJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogZGF0YUNvbnN0cnVjdC5pbnZvaWNlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEludm9pY2UgQnVja2V0IE5hbWUnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2Vic2l0ZVVybCcsIHtcbiAgICAgIHZhbHVlOiBmcm9udGVuZFN0YWNrLndlYnNpdGVVcmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Zyb250ZW5kIFdlYnNpdGUgVVJMIChDbG91ZEZyb250KScsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiBmcm9udGVuZFN0YWNrLndlYnNpdGVCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgV2Vic2l0ZSBCdWNrZXQgTmFtZScsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RGlzdHJpYnV0aW9uSWQnLCB7XG4gICAgICB2YWx1ZTogZnJvbnRlbmRTdGFjay5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgRGlzdHJpYnV0aW9uIElEJyxcbiAgICB9KVxuXG4gICAgLy8gRXhwb3J0IER5bmFtb0RCIHRhYmxlIG5hbWVzIGZvciBGQUlTUyBpbnRlZ3JhdGlvblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGRhdGFDb25zdHJ1Y3QudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgVXNlciBUYWJsZSBOYW1lJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VudGl0bGVtZW50VGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGRhdGFDb25zdHJ1Y3QudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBVc2VyIFNvbHV0aW9uIEVudGl0bGVtZW50cyBUYWJsZSBOYW1lJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Nlc3Npb25UYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZGF0YUNvbnN0cnVjdC5zZXNzaW9uVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBTZXNzaW9uIFRhYmxlIE5hbWUnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29tcGFueVNldHRpbmdzVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGRhdGFDb25zdHJ1Y3QuY29tcGFueVNldHRpbmdzVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBDb21wYW55IFNldHRpbmdzIFRhYmxlIE5hbWUgKEdTVCknLFxuICAgIH0pXG4gIH1cbn1cbiJdfQ==