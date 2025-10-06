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
        const authStack = new auth_stack_1.AuthStack(this, 'AuthStack');
        // Create API layer (API Gateway, Lambda functions)
        const apiStack = new api_stack_1.ApiStack(this, 'ApiStack', {
            userPool: authStack.userPool,
            userTable: dataStack.userTable,
            solutionTable: dataStack.solutionTable,
            partnerApplicationTable: dataStack.partnerApplicationTable,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsNkNBQXdDO0FBQ3hDLDZDQUF3QztBQUN4QywyQ0FBc0M7QUFDdEMscURBQWdEO0FBRWhELE1BQWEsOEJBQStCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0QsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2Qix3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVsRCx3Q0FBd0M7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVsRCxtREFBbUQ7UUFDbkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDOUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO1lBQzVCLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztZQUM5QixhQUFhLEVBQUUsU0FBUyxDQUFDLGFBQWE7WUFDdEMsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLHVCQUF1QjtZQUMxRCxZQUFZLEVBQUUsU0FBUyxDQUFDLFlBQVk7U0FDckMsQ0FBQyxDQUFBO1FBRUYsK0NBQStDO1FBQy9DLE1BQU0sYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFFOUQsMEJBQTBCO1FBQzFCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVU7WUFDcEMsV0FBVyxFQUFFLHNCQUFzQjtTQUNwQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFDLEtBQUssRUFBRSxTQUFTLENBQUMsY0FBYyxDQUFDLGdCQUFnQjtZQUNoRCxXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUc7WUFDdkIsV0FBVyxFQUFFLGlCQUFpQjtTQUMvQixDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFDLEtBQUssRUFBRSxTQUFTLENBQUMsWUFBWSxDQUFDLFVBQVU7WUFDeEMsV0FBVyxFQUFFLHVCQUF1QjtTQUNyQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsYUFBYSxDQUFDLFVBQVU7WUFDL0IsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzNDLEtBQUssRUFBRSxhQUFhLENBQUMsYUFBYSxDQUFDLFVBQVU7WUFDN0MsV0FBVyxFQUFFLHdCQUF3QjtTQUN0QyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxhQUFhLENBQUMsWUFBWSxDQUFDLGNBQWM7WUFDaEQsV0FBVyxFQUFFLDRCQUE0QjtTQUMxQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUExREQsd0VBMERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xyXG5pbXBvcnQgeyBBdXRoU3RhY2sgfSBmcm9tICcuL2F1dGgtc3RhY2snXHJcbmltcG9ydCB7IERhdGFTdGFjayB9IGZyb20gJy4vZGF0YS1zdGFjaydcclxuaW1wb3J0IHsgQXBpU3RhY2sgfSBmcm9tICcuL2FwaS1zdGFjaydcclxuaW1wb3J0IHsgRnJvbnRlbmRTdGFjayB9IGZyb20gJy4vZnJvbnRlbmQtc3RhY2snXHJcblxyXG5leHBvcnQgY2xhc3MgTWFya2V0cGxhY2VJbmZyYXN0cnVjdHVyZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxyXG5cclxuICAgIC8vIENyZWF0ZSBkYXRhIGxheWVyIChEeW5hbW9EQiwgUzMsIFJEUylcclxuICAgIGNvbnN0IGRhdGFTdGFjayA9IG5ldyBEYXRhU3RhY2sodGhpcywgJ0RhdGFTdGFjaycpXHJcblxyXG4gICAgLy8gQ3JlYXRlIGF1dGhlbnRpY2F0aW9uIGxheWVyIChDb2duaXRvKVxyXG4gICAgY29uc3QgYXV0aFN0YWNrID0gbmV3IEF1dGhTdGFjayh0aGlzLCAnQXV0aFN0YWNrJylcclxuXHJcbiAgICAvLyBDcmVhdGUgQVBJIGxheWVyIChBUEkgR2F0ZXdheSwgTGFtYmRhIGZ1bmN0aW9ucylcclxuICAgIGNvbnN0IGFwaVN0YWNrID0gbmV3IEFwaVN0YWNrKHRoaXMsICdBcGlTdGFjaycsIHtcclxuICAgICAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcclxuICAgICAgdXNlclRhYmxlOiBkYXRhU3RhY2sudXNlclRhYmxlLFxyXG4gICAgICBzb2x1dGlvblRhYmxlOiBkYXRhU3RhY2suc29sdXRpb25UYWJsZSxcclxuICAgICAgcGFydG5lckFwcGxpY2F0aW9uVGFibGU6IGRhdGFTdGFjay5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZSxcclxuICAgICAgYXNzZXRzQnVja2V0OiBkYXRhU3RhY2suYXNzZXRzQnVja2V0LFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBDcmVhdGUgZnJvbnRlbmQgZGVwbG95bWVudCAoUzMgKyBDbG91ZEZyb250KVxyXG4gICAgY29uc3QgZnJvbnRlbmRTdGFjayA9IG5ldyBGcm9udGVuZFN0YWNrKHRoaXMsICdGcm9udGVuZFN0YWNrJylcclxuXHJcbiAgICAvLyBPdXRwdXQgaW1wb3J0YW50IHZhbHVlc1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XHJcbiAgICAgIHZhbHVlOiBhdXRoU3RhY2sudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXHJcbiAgICB9KVxyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xyXG4gICAgICB2YWx1ZTogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgQ2xpZW50IElEJyxcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBhcGlTdGFjay5hcGkudXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcsXHJcbiAgICB9KVxyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogZGF0YVN0YWNrLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEFzc2V0cyBCdWNrZXQgTmFtZScsXHJcbiAgICB9KVxyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlVXJsJywge1xyXG4gICAgICB2YWx1ZTogZnJvbnRlbmRTdGFjay53ZWJzaXRlVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Zyb250ZW5kIFdlYnNpdGUgVVJMIChDbG91ZEZyb250KScsXHJcbiAgICB9KVxyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IGZyb250ZW5kU3RhY2sud2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIFdlYnNpdGUgQnVja2V0IE5hbWUnLFxyXG4gICAgfSlcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbklkJywge1xyXG4gICAgICB2YWx1ZTogZnJvbnRlbmRTdGFjay5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gSUQnLFxyXG4gICAgfSlcclxuICB9XHJcbn0iXX0=