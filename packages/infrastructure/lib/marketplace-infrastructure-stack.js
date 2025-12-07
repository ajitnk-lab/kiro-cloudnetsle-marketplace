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
const data_stack_1 = require("./data-stack");
const api_stack_1 = require("./api-stack");
const frontend_stack_1 = require("./frontend-stack");
class MarketplaceInfrastructureStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create data layer (DynamoDB, S3, RDS)
        const dataStack = new data_stack_1.DataStack(this, 'DataStack');
        // Create authentication layer (Cognito)
        const authStack = new auth_stack_1.AuthStack(this, 'AuthStack', {
            userTableName: dataStack.userTable.tableName,
            userSolutionEntitlementsTableName: dataStack.userSolutionEntitlementsTable.tableName,
            subscriptionHistoryTableName: dataStack.subscriptionHistoryTable.tableName,
            tokenSecret: 'marketplace-secret-key-2024', // In production, use AWS Secrets Manager
        });
        // Grant permissions
        dataStack.userTable.grantWriteData(authStack.postConfirmationFunction);
        dataStack.userSolutionEntitlementsTable.grantWriteData(authStack.postConfirmationFunction);
        dataStack.subscriptionHistoryTable.grantWriteData(authStack.postConfirmationFunction);
        // Create API layer (API Gateway, Lambda functions)
        const apiStack = new api_stack_1.ApiStack(this, 'ApiStack', {
            userPool: authStack.userPool,
            userTable: dataStack.userTable,
            solutionTable: dataStack.solutionTable,
            partnerApplicationTable: dataStack.partnerApplicationTable,
            tokenTable: dataStack.tokenTable,
            userSolutionEntitlementsTable: dataStack.userSolutionEntitlementsTable,
            paymentTransactionsTable: dataStack.paymentTransactionsTable,
            userSessionsTable: dataStack.userSessionsTable, // NEW: Analytics tables
            apiMetricsTable: dataStack.apiMetricsTable, // NEW: Analytics tables
            subscriptionHistoryTable: dataStack.subscriptionHistoryTable, // NEW: Subscription history
            companySettingsTable: dataStack.companySettingsTable, // NEW: GST company settings
            assetsBucket: dataStack.assetsBucket,
            invoiceBucket: dataStack.invoiceBucket, // NEW: Invoice storage
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
            value: apiStack.api.url,
            description: 'API Gateway URL',
        });
        new cdk.CfnOutput(this, 'AssetsBucketName', {
            value: dataStack.assetsBucket.bucketName,
            description: 'S3 Assets Bucket Name',
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
            value: dataStack.userTable.tableName,
            description: 'DynamoDB User Table Name',
        });
        new cdk.CfnOutput(this, 'EntitlementTableName', {
            value: dataStack.userSolutionEntitlementsTable.tableName,
            description: 'DynamoDB User Solution Entitlements Table Name',
        });
        new cdk.CfnOutput(this, 'SessionTableName', {
            value: dataStack.sessionTable.tableName,
            description: 'DynamoDB Session Table Name',
        });
    }
}
exports.MarketplaceInfrastructureStack = MarketplaceInfrastructureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsNkNBQXdDO0FBQ3hDLDZDQUF3QztBQUN4QywyQ0FBc0M7QUFDdEMscURBQWdEO0FBRWhELE1BQWEsOEJBQStCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0QsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2Qix3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVsRCx3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDakQsYUFBYSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUztZQUM1QyxpQ0FBaUMsRUFBRSxTQUFTLENBQUMsNkJBQTZCLENBQUMsU0FBUztZQUNwRiw0QkFBNEIsRUFBRSxTQUFTLENBQUMsd0JBQXdCLENBQUMsU0FBUztZQUMxRSxXQUFXLEVBQUUsNkJBQTZCLEVBQUUseUNBQXlDO1NBQ3RGLENBQUMsQ0FBQTtRQUVGLG9CQUFvQjtRQUNwQixTQUFTLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN0RSxTQUFTLENBQUMsNkJBQTZCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQzFGLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFD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QUE2QixDQUFDLFNBQVM7WUFDeEQsV0FBVyxFQUFFLGdEQUFnRDtTQUM5RCxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFDLEtBQUssRUFBRSxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVM7WUFDdkMsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUE1RkQsd0VBNEZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcbmltcG9ydCB7IEF1dGhTdGFjayB9IGZyb20gJy4vYXV0aC1zdGFjaydcbmltcG9ydCB7IERhdGFTdGFjayB9IGZyb20gJy4vZGF0YS1zdGFjaydcbmltcG9ydCB7IEFwaVN0YWNrIH0gZnJvbSAnLi9hcGktc3RhY2snXG5pbXBvcnQgeyBGcm9udGVuZFN0YWNrIH0gZnJvbSAnLi9mcm9udGVuZC1zdGFjaydcblxuZXhwb3J0IGNsYXNzIE1hcmtldHBsYWNlSW5mcmFzdHJ1Y3R1cmVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgLy8gQ3JlYXRlIGRhdGEgbGF5ZXIgKER5bmFtb0RCLCBTMywgUkRTKVxuICAgIGNvbnN0IGRhdGFTdGFjayA9IG5ldyBEYXRhU3RhY2sodGhpcywgJ0RhdGFTdGFjaycpXG5cbiAgICAvLyBDcmVhdGUgYXV0aGVudGljYXRpb24gbGF5ZXIgKENvZ25pdG8pXG4gICAgY29uc3QgYXV0aFN0YWNrID0gbmV3IEF1dGhTdGFjayh0aGlzLCAnQXV0aFN0YWNrJywge1xuICAgICAgdXNlclRhYmxlTmFtZTogZGF0YVN0YWNrLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICB1c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZU5hbWU6IGRhdGFTdGFjay51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBzdWJzY3JpcHRpb25IaXN0b3J5VGFibGVOYW1lOiBkYXRhU3RhY2suc3Vic2NyaXB0aW9uSGlzdG9yeVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIHRva2VuU2VjcmV0OiAnbWFya2V0cGxhY2Utc2VjcmV0LWtleS0yMDI0JywgLy8gSW4gcHJvZHVjdGlvbiwgdXNlIEFXUyBTZWNyZXRzIE1hbmFnZXJcbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcbiAgICBkYXRhU3RhY2sudXNlclRhYmxlLmdyYW50V3JpdGVEYXRhKGF1dGhTdGFjay5wb3N0Q29uZmlybWF0aW9uRnVuY3Rpb24pXG4gICAgZGF0YVN0YWNrLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLmdyYW50V3JpdGVEYXRhKGF1dGhTdGFjay5wb3N0Q29uZmlybWF0aW9uRnVuY3Rpb24pXG4gICAgZGF0YVN0YWNrLnN1YnNjcmlwdGlvbkhpc3RvcnlUYWJsZS5ncmFudFdyaXRlRGF0YShhdXRoU3RhY2sucG9zdENvbmZpcm1hdGlvbkZ1bmN0aW9uKVxuXG4gICAgLy8gQ3JlYXRlIEFQSSBsYXllciAoQVBJIEdhdGV3YXksIExhbWJkYSBmdW5jdGlvbnMpXG4gICAgY29uc3QgYXBpU3RhY2sgPSBuZXcgQXBpU3RhY2sodGhpcywgJ0FwaVN0YWNrJywge1xuICAgICAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcbiAgICAgIHVzZXJUYWJsZTogZGF0YVN0YWNrLnVzZXJUYWJsZSxcbiAgICAgIHNvbHV0aW9uVGFibGU6IGRhdGFTdGFjay5zb2x1dGlvblRhYmxlLFxuICAgICAgcGFydG5lckFwcGxpY2F0aW9uVGFibGU6IGRhdGFTdGFjay5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZSxcbiAgICAgIHRva2VuVGFibGU6IGRhdGFTdGFjay50b2tlblRhYmxlLFxuICAgICAgdXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGU6IGRhdGFTdGFjay51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZSxcbiAgICAgIHBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZTogZGF0YVN0YWNrLnBheW1lbnRUcmFuc2FjdGlvbnNUYWJsZSxcbiAgICAgIHVzZXJTZXNzaW9uc1RhYmxlOiBkYXRhU3RhY2sudXNlclNlc3Npb25zVGFibGUsIC8vIE5FVzogQW5hbHl0aWNzIHRhYmxlc1xuICAgICAgYXBpTWV0cmljc1RhYmxlOiBkYXRhU3RhY2suYXBpTWV0cmljc1RhYmxlLCAvLyBORVc6IEFuYWx5dGljcyB0YWJsZXNcbiAgICAgIHN1YnNjcmlwdGlvbkhpc3RvcnlUYWJsZTogZGF0YVN0YWNrLnN1YnNjcmlwdGlvbkhpc3RvcnlUYWJsZSwgLy8gTkVXOiBTdWJzY3JpcHRpb24gaGlzdG9yeVxuICAgICAgY29tcGFueVNldHRpbmdzVGFibGU6IGRhdGFTdGFjay5jb21wYW55U2V0dGluZ3NUYWJsZSwgLy8gTkVXOiBHU1QgY29tcGFueSBzZXR0aW5nc1xuICAgICAgYXNzZXRzQnVja2V0OiBkYXRhU3RhY2suYXNzZXRzQnVja2V0LFxuICAgICAgaW52b2ljZUJ1Y2tldDogZGF0YVN0YWNrLmludm9pY2VCdWNrZXQsIC8vIE5FVzogSW52b2ljZSBzdG9yYWdlXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBmcm9udGVuZCBkZXBsb3ltZW50IChTMyArIENsb3VkRnJvbnQpXG4gICAgY29uc3QgZnJvbnRlbmRTdGFjayA9IG5ldyBGcm9udGVuZFN0YWNrKHRoaXMsICdGcm9udGVuZFN0YWNrJylcblxuICAgIC8vIE91dHB1dCBpbXBvcnRhbnQgdmFsdWVzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XG4gICAgICB2YWx1ZTogYXV0aFN0YWNrLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XG4gICAgICB2YWx1ZTogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xuICAgICAgdmFsdWU6IGFwaVN0YWNrLmFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IGRhdGFTdGFjay5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQXNzZXRzIEJ1Y2tldCBOYW1lJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XG4gICAgICB2YWx1ZTogZnJvbnRlbmRTdGFjay53ZWJzaXRlVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdGcm9udGVuZCBXZWJzaXRlIFVSTCAoQ2xvdWRGcm9udCknLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2Vic2l0ZUJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogZnJvbnRlbmRTdGFjay53ZWJzaXRlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIFdlYnNpdGUgQnVja2V0IE5hbWUnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IGZyb250ZW5kU3RhY2suZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCcsXG4gICAgfSlcblxuICAgIC8vIEV4cG9ydCBEeW5hbW9EQiB0YWJsZSBuYW1lcyBmb3IgRkFJU1MgaW50ZWdyYXRpb25cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclRhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBkYXRhU3RhY2sudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgVXNlciBUYWJsZSBOYW1lJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VudGl0bGVtZW50VGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IGRhdGFTdGFjay51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIFVzZXIgU29sdXRpb24gRW50aXRsZW1lbnRzIFRhYmxlIE5hbWUnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2Vzc2lvblRhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBkYXRhU3RhY2suc2Vzc2lvblRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgU2Vzc2lvbiBUYWJsZSBOYW1lJyxcbiAgICB9KVxuICB9XG59Il19