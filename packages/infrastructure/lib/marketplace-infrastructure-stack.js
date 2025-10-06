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
        });
        // Create API layer (API Gateway, Lambda functions)
        const apiStack = new api_stack_1.ApiStack(this, 'ApiStack', {
            userPool: authStack.userPool,
            userTable: dataStack.userTable,
            solutionTable: dataStack.solutionTable,
            partnerApplicationTable: dataStack.partnerApplicationTable,
            transactionTable: dataStack.transactionTable,
            userSolutionsTable: dataStack.userSolutionsTable,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsNkNBQXdDO0FBQ3hDLDZDQUF3QztBQUN4QywyQ0FBc0M7QUFDdEMscURBQWdEO0FBRWhELE1BQWEsOEJBQStCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0QsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2Qix3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVsRCx3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDakQsYUFBYSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUztTQUM3QyxDQUFDLENBQUE7UUFFRixtREFBbUQ7UUFDbkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDOUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO1lBQzVCLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztZQUM5QixhQUFhLEVBQUUsU0FBUyxDQUFDLGFBQWE7WUFDdEMsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLHVCQUF1QjtZQUMxRCxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsZ0JBQWdCO1lBQzVDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxrQkFBa0I7WUFDaEQsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZO1NBQ3JDLENBQUMsQ0FBQTtRQUVGLCtDQUErQztRQUMvQyxNQUFNLGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBRTlELDBCQUEwQjtRQUMxQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ3BDLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDaEQsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ3ZCLFdBQVcsRUFBRSxpQkFBaUI7U0FDL0IsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFVO1lBQ3hDLFdBQVcsRUFBRSx1QkFBdUI7U0FDckMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxVQUFVO1lBQy9CLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsYUFBYSxDQUFDLGFBQWEsQ0FBQyxVQUFVO1lBQzdDLFdBQVcsRUFBRSx3QkFBd0I7U0FDdEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsYUFBYSxDQUFDLFlBQVksQ0FBQyxjQUFjO1lBQ2hELFdBQVcsRUFBRSw0QkFBNEI7U0FDMUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBOURELHdFQThEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcclxuaW1wb3J0IHsgQXV0aFN0YWNrIH0gZnJvbSAnLi9hdXRoLXN0YWNrJ1xyXG5pbXBvcnQgeyBEYXRhU3RhY2sgfSBmcm9tICcuL2RhdGEtc3RhY2snXHJcbmltcG9ydCB7IEFwaVN0YWNrIH0gZnJvbSAnLi9hcGktc3RhY2snXHJcbmltcG9ydCB7IEZyb250ZW5kU3RhY2sgfSBmcm9tICcuL2Zyb250ZW5kLXN0YWNrJ1xyXG5cclxuZXhwb3J0IGNsYXNzIE1hcmtldHBsYWNlSW5mcmFzdHJ1Y3R1cmVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcclxuXHJcbiAgICAvLyBDcmVhdGUgZGF0YSBsYXllciAoRHluYW1vREIsIFMzLCBSRFMpXHJcbiAgICBjb25zdCBkYXRhU3RhY2sgPSBuZXcgRGF0YVN0YWNrKHRoaXMsICdEYXRhU3RhY2snKVxyXG5cclxuICAgIC8vIENyZWF0ZSBhdXRoZW50aWNhdGlvbiBsYXllciAoQ29nbml0bylcclxuICAgIGNvbnN0IGF1dGhTdGFjayA9IG5ldyBBdXRoU3RhY2sodGhpcywgJ0F1dGhTdGFjaycsIHtcclxuICAgICAgdXNlclRhYmxlTmFtZTogZGF0YVN0YWNrLnVzZXJUYWJsZS50YWJsZU5hbWUsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgbGF5ZXIgKEFQSSBHYXRld2F5LCBMYW1iZGEgZnVuY3Rpb25zKVxyXG4gICAgY29uc3QgYXBpU3RhY2sgPSBuZXcgQXBpU3RhY2sodGhpcywgJ0FwaVN0YWNrJywge1xyXG4gICAgICB1c2VyUG9vbDogYXV0aFN0YWNrLnVzZXJQb29sLFxyXG4gICAgICB1c2VyVGFibGU6IGRhdGFTdGFjay51c2VyVGFibGUsXHJcbiAgICAgIHNvbHV0aW9uVGFibGU6IGRhdGFTdGFjay5zb2x1dGlvblRhYmxlLFxyXG4gICAgICBwYXJ0bmVyQXBwbGljYXRpb25UYWJsZTogZGF0YVN0YWNrLnBhcnRuZXJBcHBsaWNhdGlvblRhYmxlLFxyXG4gICAgICB0cmFuc2FjdGlvblRhYmxlOiBkYXRhU3RhY2sudHJhbnNhY3Rpb25UYWJsZSxcclxuICAgICAgdXNlclNvbHV0aW9uc1RhYmxlOiBkYXRhU3RhY2sudXNlclNvbHV0aW9uc1RhYmxlLFxyXG4gICAgICBhc3NldHNCdWNrZXQ6IGRhdGFTdGFjay5hc3NldHNCdWNrZXQsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIENyZWF0ZSBmcm9udGVuZCBkZXBsb3ltZW50IChTMyArIENsb3VkRnJvbnQpXHJcbiAgICBjb25zdCBmcm9udGVuZFN0YWNrID0gbmV3IEZyb250ZW5kU3RhY2sodGhpcywgJ0Zyb250ZW5kU3RhY2snKVxyXG5cclxuICAgIC8vIE91dHB1dCBpbXBvcnRhbnQgdmFsdWVzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IGF1dGhTdGFjay51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiBhdXRoU3RhY2sudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxyXG4gICAgfSlcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpR2F0ZXdheVVybCcsIHtcclxuICAgICAgdmFsdWU6IGFwaVN0YWNrLmFwaS51cmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Fzc2V0c0J1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBkYXRhU3RhY2suYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQXNzZXRzIEJ1Y2tldCBOYW1lJyxcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBmcm9udGVuZFN0YWNrLndlYnNpdGVVcmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRnJvbnRlbmQgV2Vic2l0ZSBVUkwgKENsb3VkRnJvbnQpJyxcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogZnJvbnRlbmRTdGFjay53ZWJzaXRlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgV2Vic2l0ZSBCdWNrZXQgTmFtZScsXHJcbiAgICB9KVxyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RGlzdHJpYnV0aW9uSWQnLCB7XHJcbiAgICAgIHZhbHVlOiBmcm9udGVuZFN0YWNrLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCcsXHJcbiAgICB9KVxyXG4gIH1cclxufSJdfQ==