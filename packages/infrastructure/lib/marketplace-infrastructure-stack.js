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
    }
}
exports.MarketplaceInfrastructureStack = MarketplaceInfrastructureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsNkNBQXdDO0FBQ3hDLDZDQUF3QztBQUN4QywyQ0FBc0M7QUFDdEMscURBQWdEO0FBRWhELE1BQWEsOEJBQStCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0QsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2Qix3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVsRCx3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDakQsYUFBYSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUztZQUM1QyxpQ0FBaUMsRUFBRSxTQUFTLENBQUMsNkJBQTZCLENBQUMsU0FBUztZQUNwRixXQUFXLEVBQUUsNkJBQTZCLEVBQUUseUNBQXlDO1NBQ3RGLENBQUMsQ0FBQTtRQUVGLG9CQUFvQjtRQUNwQixTQUFTLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN0RSxTQUFTLENBQUMsNkJBQTZCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBRTFGLG1EQUFtRDtRQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM5QyxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDNUIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTO1lBQzlCLGFBQWEsRUFBRSxTQUFTLENBQUMsYUFBYTtZQUN0Qyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsdUJBQXVCO1lBQzFELFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVTtZQUNoQyw2QkFBNkIsRUFBRSxTQUFTLENBQUMsNkJBQTZCO1lBQ3RFLHdCQUF3QixFQUFFLFNBQVMsQ0FBQyx3QkFBd0I7WUFDNUQsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLHdCQUF3QjtZQUN4RSxlQUFlLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFBRSx3QkFBd0I7WUFDcEUsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZO1NBQ3JDLENBQUMsQ0FBQTtRQUVGLCtDQUErQztRQUMvQyxNQUFNLGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBRTlELDBCQUEwQjtRQUMxQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ3BDLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDaEQsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ3ZCLFdBQVcsRUFBRSxpQkFBaUI7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFVO1lBQ3hDLFdBQVcsRUFBRSx1QkFBdUI7U0FDckMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxVQUFVO1lBQy9CLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsYUFBYSxDQUFDLGFBQWEsQ0FBQyxVQUFVO1lBQzdDLFdBQVcsRUFBRSx3QkFBd0I7U0FDdEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsYUFBYSxDQUFDLFlBQVksQ0FBQyxjQUFjO1lBQ2hELFdBQVcsRUFBRSw0QkFBNEI7U0FDMUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBdkVELHdFQXVFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5pbXBvcnQgeyBBdXRoU3RhY2sgfSBmcm9tICcuL2F1dGgtc3RhY2snXG5pbXBvcnQgeyBEYXRhU3RhY2sgfSBmcm9tICcuL2RhdGEtc3RhY2snXG5pbXBvcnQgeyBBcGlTdGFjayB9IGZyb20gJy4vYXBpLXN0YWNrJ1xuaW1wb3J0IHsgRnJvbnRlbmRTdGFjayB9IGZyb20gJy4vZnJvbnRlbmQtc3RhY2snXG5cbmV4cG9ydCBjbGFzcyBNYXJrZXRwbGFjZUluZnJhc3RydWN0dXJlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcblxuICAgIC8vIENyZWF0ZSBkYXRhIGxheWVyIChEeW5hbW9EQiwgUzMsIFJEUylcbiAgICBjb25zdCBkYXRhU3RhY2sgPSBuZXcgRGF0YVN0YWNrKHRoaXMsICdEYXRhU3RhY2snKVxuXG4gICAgLy8gQ3JlYXRlIGF1dGhlbnRpY2F0aW9uIGxheWVyIChDb2duaXRvKVxuICAgIGNvbnN0IGF1dGhTdGFjayA9IG5ldyBBdXRoU3RhY2sodGhpcywgJ0F1dGhTdGFjaycsIHtcbiAgICAgIHVzZXJUYWJsZU5hbWU6IGRhdGFTdGFjay51c2VyVGFibGUudGFibGVOYW1lLFxuICAgICAgdXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGVOYW1lOiBkYXRhU3RhY2sudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgdG9rZW5TZWNyZXQ6ICdtYXJrZXRwbGFjZS1zZWNyZXQta2V5LTIwMjQnLCAvLyBJbiBwcm9kdWN0aW9uLCB1c2UgQVdTIFNlY3JldHMgTWFuYWdlclxuICAgIH0pXG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9uc1xuICAgIGRhdGFTdGFjay51c2VyVGFibGUuZ3JhbnRXcml0ZURhdGEoYXV0aFN0YWNrLnBvc3RDb25maXJtYXRpb25GdW5jdGlvbilcbiAgICBkYXRhU3RhY2sudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUuZ3JhbnRXcml0ZURhdGEoYXV0aFN0YWNrLnBvc3RDb25maXJtYXRpb25GdW5jdGlvbilcblxuICAgIC8vIENyZWF0ZSBBUEkgbGF5ZXIgKEFQSSBHYXRld2F5LCBMYW1iZGEgZnVuY3Rpb25zKVxuICAgIGNvbnN0IGFwaVN0YWNrID0gbmV3IEFwaVN0YWNrKHRoaXMsICdBcGlTdGFjaycsIHtcbiAgICAgIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXG4gICAgICB1c2VyVGFibGU6IGRhdGFTdGFjay51c2VyVGFibGUsXG4gICAgICBzb2x1dGlvblRhYmxlOiBkYXRhU3RhY2suc29sdXRpb25UYWJsZSxcbiAgICAgIHBhcnRuZXJBcHBsaWNhdGlvblRhYmxlOiBkYXRhU3RhY2sucGFydG5lckFwcGxpY2F0aW9uVGFibGUsXG4gICAgICB0b2tlblRhYmxlOiBkYXRhU3RhY2sudG9rZW5UYWJsZSxcbiAgICAgIHVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlOiBkYXRhU3RhY2sudXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUsXG4gICAgICBwYXltZW50VHJhbnNhY3Rpb25zVGFibGU6IGRhdGFTdGFjay5wYXltZW50VHJhbnNhY3Rpb25zVGFibGUsXG4gICAgICB1c2VyU2Vzc2lvbnNUYWJsZTogZGF0YVN0YWNrLnVzZXJTZXNzaW9uc1RhYmxlLCAvLyBORVc6IEFuYWx5dGljcyB0YWJsZXNcbiAgICAgIGFwaU1ldHJpY3NUYWJsZTogZGF0YVN0YWNrLmFwaU1ldHJpY3NUYWJsZSwgLy8gTkVXOiBBbmFseXRpY3MgdGFibGVzXG4gICAgICBhc3NldHNCdWNrZXQ6IGRhdGFTdGFjay5hc3NldHNCdWNrZXQsXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBmcm9udGVuZCBkZXBsb3ltZW50IChTMyArIENsb3VkRnJvbnQpXG4gICAgY29uc3QgZnJvbnRlbmRTdGFjayA9IG5ldyBGcm9udGVuZFN0YWNrKHRoaXMsICdGcm9udGVuZFN0YWNrJylcblxuICAgIC8vIE91dHB1dCBpbXBvcnRhbnQgdmFsdWVzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XG4gICAgICB2YWx1ZTogYXV0aFN0YWNrLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XG4gICAgICB2YWx1ZTogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xuICAgICAgdmFsdWU6IGFwaVN0YWNrLmFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IGRhdGFTdGFjay5hc3NldHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQXNzZXRzIEJ1Y2tldCBOYW1lJyxcbiAgICB9KVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XG4gICAgICB2YWx1ZTogZnJvbnRlbmRTdGFjay53ZWJzaXRlVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdGcm9udGVuZCBXZWJzaXRlIFVSTCAoQ2xvdWRGcm9udCknLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2Vic2l0ZUJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogZnJvbnRlbmRTdGFjay53ZWJzaXRlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIFdlYnNpdGUgQnVja2V0IE5hbWUnLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IGZyb250ZW5kU3RhY2suZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCcsXG4gICAgfSlcbiAgfVxufSJdfQ==