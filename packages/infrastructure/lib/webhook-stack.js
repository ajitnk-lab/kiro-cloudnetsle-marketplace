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
exports.WebhookStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
class WebhookStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Reference existing DynamoDB table
        const userSolutionEntitlementsTable = dynamodb.Table.fromTableName(this, 'ExistingUserSolutionEntitlementsTable', 'marketplace-user-solution-entitlements');
        // Create Cashfree webhook Lambda function
        const cashfreeWebhookFunction = new lambda.Function(this, 'CashfreeWebhookFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'cashfree-subscription-webhook.handler',
            code: lambda.Code.fromAsset('lambda/webhooks'),
            environment: {
                USER_SOLUTION_ENTITLEMENTS_TABLE: userSolutionEntitlementsTable.tableName,
            },
            timeout: cdk.Duration.seconds(30),
        });
        // Grant permissions to the Lambda function
        userSolutionEntitlementsTable.grantReadWriteData(cashfreeWebhookFunction);
        // Reference existing API Gateway
        const existingApi = apigateway.RestApi.fromRestApiId(this, 'ExistingMarketplaceApi', 'juvt4m81ld' // The API Gateway ID we found earlier
        );
        // Add webhook endpoint to existing API
        const webhooksResource = existingApi.root.addResource('webhooks');
        const cashfreeResource = webhooksResource.addResource('cashfree');
        const subscriptionsResource = cashfreeResource.addResource('subscriptions');
        subscriptionsResource.addMethod('POST', new apigateway.LambdaIntegration(cashfreeWebhookFunction), {
            authorizationType: apigateway.AuthorizationType.NONE,
        });
        // Output the webhook URL
        new cdk.CfnOutput(this, 'CashfreeWebhookUrl', {
            value: `https://${existingApi.restApiId}.execute-api.${this.region}.amazonaws.com/prod/webhooks/cashfree/subscriptions`,
            description: 'Cashfree subscription webhook URL',
        });
    }
}
exports.WebhookStack = WebhookStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViaG9vay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYmhvb2stc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQWtDO0FBQ2xDLCtEQUFnRDtBQUNoRCx1RUFBd0Q7QUFDeEQsbUVBQW9EO0FBR3BELE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3pDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFdkIsb0NBQW9DO1FBQ3BDLE1BQU0sNkJBQTZCLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQ2hFLElBQUksRUFDSix1Q0FBdUMsRUFDdkMsd0NBQXdDLENBQ3pDLENBQUE7UUFFRCwwQ0FBMEM7UUFDMUMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ25GLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLHVDQUF1QztZQUNoRCxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUM7WUFDOUMsV0FBVyxFQUFFO2dCQUNYLGdDQUFnQyxFQUFFLDZCQUE2QixDQUFDLFNBQVM7YUFDMUU7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQ2xDLENBQUMsQ0FBQTtRQUVGLDJDQUEyQztRQUMzQyw2QkFBNkIsQ0FBQyxrQkFBa0IsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBRXpFLGlDQUFpQztRQUNqQyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FDbEQsSUFBSSxFQUNKLHdCQUF3QixFQUN4QixZQUFZLENBQUMsc0NBQXNDO1NBQ3BELENBQUE7UUFFRCx1Q0FBdUM7UUFDdkMsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNqRSxNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNqRSxNQUFNLHFCQUFxQixHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUUzRSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLEVBQUU7WUFDakcsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUk7U0FDckQsQ0FBQyxDQUFBO1FBRUYseUJBQXlCO1FBQ3pCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLFdBQVcsV0FBVyxDQUFDLFNBQVMsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLHFEQUFxRDtZQUN2SCxXQUFXLEVBQUUsbUNBQW1DO1NBQ2pELENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQS9DRCxvQ0ErQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5leHBvcnQgY2xhc3MgV2ViaG9va1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpXG5cbiAgICAvLyBSZWZlcmVuY2UgZXhpc3RpbmcgRHluYW1vREIgdGFibGVcbiAgICBjb25zdCB1c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUoXG4gICAgICB0aGlzLFxuICAgICAgJ0V4aXN0aW5nVXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUnLFxuICAgICAgJ21hcmtldHBsYWNlLXVzZXItc29sdXRpb24tZW50aXRsZW1lbnRzJ1xuICAgIClcblxuICAgIC8vIENyZWF0ZSBDYXNoZnJlZSB3ZWJob29rIExhbWJkYSBmdW5jdGlvblxuICAgIGNvbnN0IGNhc2hmcmVlV2ViaG9va0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ2FzaGZyZWVXZWJob29rRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdjYXNoZnJlZS1zdWJzY3JpcHRpb24td2ViaG9vay5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL3dlYmhvb2tzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1NPTFVUSU9OX0VOVElUTEVNRU5UU19UQUJMRTogdXNlclNvbHV0aW9uRW50aXRsZW1lbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gdGhlIExhbWJkYSBmdW5jdGlvblxuICAgIHVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjYXNoZnJlZVdlYmhvb2tGdW5jdGlvbilcblxuICAgIC8vIFJlZmVyZW5jZSBleGlzdGluZyBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGV4aXN0aW5nQXBpID0gYXBpZ2F0ZXdheS5SZXN0QXBpLmZyb21SZXN0QXBpSWQoXG4gICAgICB0aGlzLFxuICAgICAgJ0V4aXN0aW5nTWFya2V0cGxhY2VBcGknLFxuICAgICAgJ2p1dnQ0bTgxbGQnIC8vIFRoZSBBUEkgR2F0ZXdheSBJRCB3ZSBmb3VuZCBlYXJsaWVyXG4gICAgKVxuXG4gICAgLy8gQWRkIHdlYmhvb2sgZW5kcG9pbnQgdG8gZXhpc3RpbmcgQVBJXG4gICAgY29uc3Qgd2ViaG9va3NSZXNvdXJjZSA9IGV4aXN0aW5nQXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3dlYmhvb2tzJylcbiAgICBjb25zdCBjYXNoZnJlZVJlc291cmNlID0gd2ViaG9va3NSZXNvdXJjZS5hZGRSZXNvdXJjZSgnY2FzaGZyZWUnKVxuICAgIGNvbnN0IHN1YnNjcmlwdGlvbnNSZXNvdXJjZSA9IGNhc2hmcmVlUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3N1YnNjcmlwdGlvbnMnKVxuXG4gICAgc3Vic2NyaXB0aW9uc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNhc2hmcmVlV2ViaG9va0Z1bmN0aW9uKSwge1xuICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwaWdhdGV3YXkuQXV0aG9yaXphdGlvblR5cGUuTk9ORSxcbiAgICB9KVxuXG4gICAgLy8gT3V0cHV0IHRoZSB3ZWJob29rIFVSTFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDYXNoZnJlZVdlYmhvb2tVcmwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtleGlzdGluZ0FwaS5yZXN0QXBpSWR9LmV4ZWN1dGUtYXBpLiR7dGhpcy5yZWdpb259LmFtYXpvbmF3cy5jb20vcHJvZC93ZWJob29rcy9jYXNoZnJlZS9zdWJzY3JpcHRpb25zYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2FzaGZyZWUgc3Vic2NyaXB0aW9uIHdlYmhvb2sgVVJMJyxcbiAgICB9KVxuICB9XG59XG4iXX0=