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
            tokenSecret: 'marketplace-secret-key-2024', // In production, use AWS Secrets Manager
        });
        // Grant permissions
        dataStack.userTable.grantWriteData(authStack.postConfirmationFunction);
        dataStack.userSolutionEntitlementsTable.grantWriteData(authStack.postConfirmationFunction);
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
            assetsBucket: dataStack.assetsBucket,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsNkNBQXdDO0FBQ3hDLDZDQUF3QztBQUN4QywyQ0FBc0M7QUFDdEMscURBQWdEO0FBRWhELE1BQWEsOEJBQStCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0QsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2Qix3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVsRCx3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDakQsYUFBYSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUztZQUM1QyxpQ0FBaUMsRUFBRSxTQUFTLENBQUMsNkJBQTZCLENBQUMsU0FBUztZQUNwRixXQUFXLEVBQUUsNkJBQTZCLEVBQUUseUNBQXlDO1NBQ3RGLENBQUMsQ0FBQTtRQUVGLG9CQUFvQjtRQUNwQixTQUFTLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN0RSxTQUFTLENBQUMsNkJBQTZCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBRTFGLG1EQUFtRDtRQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM5QyxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDNUIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTO1lBQzlCLGFBQWEsRUFBRSxTQUFTLENBQUMsYUFBYTtZQUN0Qyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsdUJBQXVCO1lBQzFELFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVTtZQUNoQyw2QkFBNkIsRUFBRSxTQUFTLENBQUMsNkJBQTZCO1lBQ3RFLHdCQUF3QixFQUFFLFNBQVMsQ0FBQyx3QkFBd0I7WUFDNUQsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLHdCQUF3QjtZQUN4RSxlQUFlLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFBRSx3QkFBd0I7WUFDcEUsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZO1NBQ3JDLENBQUMsQ0FBQTtRQUVGLCtDQUErQztRQUMvQyxNQUFNLGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBRTlELDBCQUEwQjtRQUMxQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ3BDLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDaEQsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ3ZCLFdBQVcsRUFBRSxpQkFBaUI7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFVO1lBQ3hDLFdBQVcsRUFBRSx1QkFBdUI7U0FDckMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxVQUFVO1lBQy9CLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsYUFBYSxDQUFDLGFBQWEsQ0FBQyxVQUFVO1lBQzdDLFdBQVcsRUFBRSx3QkFBd0I7U0FDdEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsYUFBYSxDQUFDLFlBQVksQ0FBQyxjQUFjO1lBQ2hELFdBQVcsRUFBRSw0QkFBNEI7U0FDMUMsQ0FBQyxDQUFBO1FBRUYsb0RBQW9EO1FBQ3BELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVM7WUFDcEMsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxTQUFTLENBQUMsNkJBQTZCLENBQUMsU0FBUztZQUN4RCxXQUFXLEVBQUUsZ0RBQWdEO1NBQzlELENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxZQUFZLENBQUMsU0FBUztZQUN2QyxXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQXZGRCx3RUF1RkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuaW1wb3J0IHsgQXV0aFN0YWNrIH0gZnJvbSAnLi9hdXRoLXN0YWNrJ1xuaW1wb3J0IHsgRGF0YVN0YWNrIH0gZnJvbSAnLi9kYXRhLXN0YWNrJ1xuaW1wb3J0IHsgQXBpU3RhY2sgfSBmcm9tICcuL2FwaS1zdGFjaydcbmltcG9ydCB7IEZyb250ZW5kU3RhY2sgfSBmcm9tICcuL2Zyb250ZW5kLXN0YWNrJ1xuXG5leHBvcnQgY2xhc3MgTWFya2V0cGxhY2VJbmZyYXN0cnVjdHVyZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpXG5cbiAgICAvLyBDcmVhdGUgZGF0YSBsYXllciAoRHluYW1vREIsIFMzLCBSRFMpXG4gICAgY29uc3QgZGF0YVN0YWNrID0gbmV3IERhdGFTdGFjayh0aGlzLCAnRGF0YVN0YWNrJylcblxuICAgIC8vIENyZWF0ZSBhdXRoZW50aWNhdGlvbiBsYXllciAoQ29nbml0bylcbiAgICBjb25zdCBhdXRoU3RhY2sgPSBuZXcgQXV0aFN0YWNrKHRoaXMsICdBdXRoU3RhY2snLCB7XG4gICAgICB1c2VyVGFibGVOYW1lOiBkYXRhU3RhY2sudXNlclRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIHVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlTmFtZTogZGF0YVN0YWNrLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIHRva2VuU2VjcmV0OiAnbWFya2V0cGxhY2Utc2VjcmV0LWtleS0yMDI0JywgLy8gSW4gcHJvZHVjdGlvbiwgdXNlIEFXUyBTZWNyZXRzIE1hbmFnZXJcbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcbiAgICBkYXRhU3RhY2sudXNlclRhYmxlLmdyYW50V3JpdGVEYXRhKGF1dGhTdGFjay5wb3N0Q29uZmlybWF0aW9uRnVuY3Rpb24pXG4gICAgZGF0YVN0YWNrLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLmdyYW50V3JpdGVEYXRhKGF1dGhTdGFjay5wb3N0Q29uZmlybWF0aW9uRnVuY3Rpb24pXG5cbiAgICAvLyBDcmVhdGUgQVBJIGxheWVyIChBUEkgR2F0ZXdheSwgTGFtYmRhIGZ1bmN0aW9ucylcbiAgICBjb25zdCBhcGlTdGFjayA9IG5ldyBBcGlTdGFjayh0aGlzLCAnQXBpU3RhY2snLCB7XG4gICAgICB1c2VyUG9vbDogYXV0aFN0YWNrLnVzZXJQb29sLFxuICAgICAgdXNlclRhYmxlOiBkYXRhU3RhY2sudXNlclRhYmxlLFxuICAgICAgc29sdXRpb25UYWJsZTogZGF0YVN0YWNrLnNvbHV0aW9uVGFibGUsXG4gICAgICBwYXJ0bmVyQXBwbGljYXRpb25UYWJsZTogZGF0YVN0YWNrLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLFxuICAgICAgdG9rZW5UYWJsZTogZGF0YVN0YWNrLnRva2VuVGFibGUsXG4gICAgICB1c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZTogZGF0YVN0YWNrLnVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLFxuICAgICAgcGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlOiBkYXRhU3RhY2sucGF5bWVudFRyYW5zYWN0aW9uc1RhYmxlLFxuICAgICAgdXNlclNlc3Npb25zVGFibGU6IGRhdGFTdGFjay51c2VyU2Vzc2lvbnNUYWJsZSwgLy8gTkVXOiBBbmFseXRpY3MgdGFibGVzXG4gICAgICBhcGlNZXRyaWNzVGFibGU6IGRhdGFTdGFjay5hcGlNZXRyaWNzVGFibGUsIC8vIE5FVzogQW5hbHl0aWNzIHRhYmxlc1xuICAgICAgYXNzZXRzQnVja2V0OiBkYXRhU3RhY2suYXNzZXRzQnVja2V0LFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgZnJvbnRlbmQgZGVwbG95bWVudCAoUzMgKyBDbG91ZEZyb250KVxuICAgIGNvbnN0IGZyb250ZW5kU3RhY2sgPSBuZXcgRnJvbnRlbmRTdGFjayh0aGlzLCAnRnJvbnRlbmRTdGFjaycpXG5cbiAgICAvLyBPdXRwdXQgaW1wb3J0YW50IHZhbHVlc1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IGF1dGhTdGFjay51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgdmFsdWU6IGF1dGhTdGFjay51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpR2F0ZXdheVVybCcsIHtcbiAgICAgIHZhbHVlOiBhcGlTdGFjay5hcGkudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXNzZXRzQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiBkYXRhU3RhY2suYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEFzc2V0cyBCdWNrZXQgTmFtZScsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlVXJsJywge1xuICAgICAgdmFsdWU6IGZyb250ZW5kU3RhY2sud2Vic2l0ZVVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRnJvbnRlbmQgV2Vic2l0ZSBVUkwgKENsb3VkRnJvbnQpJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IGZyb250ZW5kU3RhY2sud2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBXZWJzaXRlIEJ1Y2tldCBOYW1lJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiBmcm9udGVuZFN0YWNrLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gSUQnLFxuICAgIH0pXG5cbiAgICAvLyBFeHBvcnQgRHluYW1vREIgdGFibGUgbmFtZXMgZm9yIEZBSVNTIGludGVncmF0aW9uXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZGF0YVN0YWNrLnVzZXJUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIFVzZXIgVGFibGUgTmFtZScsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFbnRpdGxlbWVudFRhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBkYXRhU3RhY2sudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBVc2VyIFNvbHV0aW9uIEVudGl0bGVtZW50cyBUYWJsZSBOYW1lJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Nlc3Npb25UYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZGF0YVN0YWNrLnNlc3Npb25UYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIFNlc3Npb24gVGFibGUgTmFtZScsXG4gICAgfSlcbiAgfVxufSJdfQ==