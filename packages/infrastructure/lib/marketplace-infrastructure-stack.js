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
const data_stack_1 = require("./data-stack");
const auth_stack_1 = require("./auth-stack");
const api_stack_1 = require("./api-stack");
class MarketplaceInfrastructureStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const uniqueSuffix = Date.now().toString();
        // Create Data Stack (DynamoDB tables, S3 buckets - NO VPC/RDS)
        const dataStack = new data_stack_1.DataStack(this, 'DataStack', {
            uniqueSuffix,
        });
        // Create Auth Stack (Cognito User Pool - NO social providers yet)
        const authStack = new auth_stack_1.AuthStack(this, 'AuthStack', {
            userTableName: dataStack.userTable.tableName,
        });
        // Create API Stack (API Gateway + Lambda functions)
        const apiStack = new api_stack_1.ApiStack(this, 'ApiStack', {
            userPool: authStack.userPool,
            userTable: dataStack.userTable,
            solutionTable: dataStack.solutionTable,
            partnerApplicationTable: dataStack.partnerApplicationTable,
            transactionTable: dataStack.transactionTable,
            userSolutionsTable: dataStack.userSolutionsTable,
            commissionSettingsTable: dataStack.commissionSettingsTable,
            partnerEarningsTable: dataStack.partnerEarningsTable,
            assetsBucket: dataStack.assetsBucket,
        });
        // Outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: authStack.userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: authStack.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });
        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: apiStack.api.url,
            description: 'API Gateway Endpoint',
        });
        new cdk.CfnOutput(this, 'UserTableName', {
            value: dataStack.userTable.tableName,
            description: 'DynamoDB User Table Name',
        });
        new cdk.CfnOutput(this, 'SolutionTableName', {
            value: dataStack.solutionTable.tableName,
            description: 'DynamoDB Solution Table Name',
        });
        new cdk.CfnOutput(this, 'AssetsBucketName', {
            value: dataStack.assetsBucket.bucketName,
            description: 'S3 Assets Bucket Name',
        });
    }
}
exports.MarketplaceInfrastructureStack = MarketplaceInfrastructureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UtaW5mcmFzdHJ1Y3R1cmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXJrZXRwbGFjZS1pbmZyYXN0cnVjdHVyZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsNkNBQXdDO0FBQ3hDLDZDQUF3QztBQUN4QywyQ0FBc0M7QUFFdEMsTUFBYSw4QkFBK0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMzRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUUxQywrREFBK0Q7UUFDL0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDakQsWUFBWTtTQUNiLENBQUMsQ0FBQTtRQUVGLGtFQUFrRTtRQUNsRSxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUNqRCxhQUFhLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTO1NBQzdDLENBQUMsQ0FBQTtRQUVGLG9EQUFvRDtRQUNwRCxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM5QyxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDNUIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTO1lBQzlCLGFBQWEsRUFBRSxTQUFTLENBQUMsYUFBYTtZQUN0Qyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsdUJBQXVCO1lBQzFELGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxnQkFBZ0I7WUFDNUMsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLGtCQUFrQjtZQUNoRCx1QkFBdUIsRUFBRSxTQUFTLENBQUMsdUJBQXVCO1lBQzFELG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxvQkFBb0I7WUFDcEQsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZO1NBQ3JDLENBQUMsQ0FBQTtRQUVGLFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ3BDLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDaEQsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ3ZCLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUztZQUNwQyxXQUFXLEVBQUUsMEJBQTBCO1NBQ3hDLENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDM0MsS0FBSyxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsU0FBUztZQUN4QyxXQUFXLEVBQUUsOEJBQThCO1NBQzVDLENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVTtZQUN4QyxXQUFXLEVBQUUsdUJBQXVCO1NBQ3JDLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQTVERCx3RUE0REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXHJcbmltcG9ydCB7IERhdGFTdGFjayB9IGZyb20gJy4vZGF0YS1zdGFjaydcclxuaW1wb3J0IHsgQXV0aFN0YWNrIH0gZnJvbSAnLi9hdXRoLXN0YWNrJ1xyXG5pbXBvcnQgeyBBcGlTdGFjayB9IGZyb20gJy4vYXBpLXN0YWNrJ1xyXG5cclxuZXhwb3J0IGNsYXNzIE1hcmtldHBsYWNlSW5mcmFzdHJ1Y3R1cmVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcylcclxuXHJcbiAgICBjb25zdCB1bmlxdWVTdWZmaXggPSBEYXRlLm5vdygpLnRvU3RyaW5nKClcclxuXHJcbiAgICAvLyBDcmVhdGUgRGF0YSBTdGFjayAoRHluYW1vREIgdGFibGVzLCBTMyBidWNrZXRzIC0gTk8gVlBDL1JEUylcclxuICAgIGNvbnN0IGRhdGFTdGFjayA9IG5ldyBEYXRhU3RhY2sodGhpcywgJ0RhdGFTdGFjaycsIHtcclxuICAgICAgdW5pcXVlU3VmZml4LFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBDcmVhdGUgQXV0aCBTdGFjayAoQ29nbml0byBVc2VyIFBvb2wgLSBOTyBzb2NpYWwgcHJvdmlkZXJzIHlldClcclxuICAgIGNvbnN0IGF1dGhTdGFjayA9IG5ldyBBdXRoU3RhY2sodGhpcywgJ0F1dGhTdGFjaycsIHtcclxuICAgICAgdXNlclRhYmxlTmFtZTogZGF0YVN0YWNrLnVzZXJUYWJsZS50YWJsZU5hbWUsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgU3RhY2sgKEFQSSBHYXRld2F5ICsgTGFtYmRhIGZ1bmN0aW9ucylcclxuICAgIGNvbnN0IGFwaVN0YWNrID0gbmV3IEFwaVN0YWNrKHRoaXMsICdBcGlTdGFjaycsIHtcclxuICAgICAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcclxuICAgICAgdXNlclRhYmxlOiBkYXRhU3RhY2sudXNlclRhYmxlLFxyXG4gICAgICBzb2x1dGlvblRhYmxlOiBkYXRhU3RhY2suc29sdXRpb25UYWJsZSxcclxuICAgICAgcGFydG5lckFwcGxpY2F0aW9uVGFibGU6IGRhdGFTdGFjay5wYXJ0bmVyQXBwbGljYXRpb25UYWJsZSxcclxuICAgICAgdHJhbnNhY3Rpb25UYWJsZTogZGF0YVN0YWNrLnRyYW5zYWN0aW9uVGFibGUsXHJcbiAgICAgIHVzZXJTb2x1dGlvbnNUYWJsZTogZGF0YVN0YWNrLnVzZXJTb2x1dGlvbnNUYWJsZSxcclxuICAgICAgY29tbWlzc2lvblNldHRpbmdzVGFibGU6IGRhdGFTdGFjay5jb21taXNzaW9uU2V0dGluZ3NUYWJsZSxcclxuICAgICAgcGFydG5lckVhcm5pbmdzVGFibGU6IGRhdGFTdGFjay5wYXJ0bmVyRWFybmluZ3NUYWJsZSxcclxuICAgICAgYXNzZXRzQnVja2V0OiBkYXRhU3RhY2suYXNzZXRzQnVja2V0LFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBPdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IGF1dGhTdGFjay51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiBhdXRoU3RhY2sudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxyXG4gICAgfSlcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpRW5kcG9pbnQnLCB7XHJcbiAgICAgIHZhbHVlOiBhcGlTdGFjay5hcGkudXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IEVuZHBvaW50JyxcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBkYXRhU3RhY2sudXNlclRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBVc2VyIFRhYmxlIE5hbWUnLFxyXG4gICAgfSlcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU29sdXRpb25UYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBkYXRhU3RhY2suc29sdXRpb25UYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgU29sdXRpb24gVGFibGUgTmFtZScsXHJcbiAgICB9KVxyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogZGF0YVN0YWNrLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEFzc2V0cyBCdWNrZXQgTmFtZScsXHJcbiAgICB9KVxyXG4gIH1cclxufSJdfQ==