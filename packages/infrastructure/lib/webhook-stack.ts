import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export class WebhookStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Reference existing DynamoDB table
    const userSolutionEntitlementsTable = dynamodb.Table.fromTableName(
      this,
      'ExistingUserSolutionEntitlementsTable',
      'marketplace-user-solution-entitlements'
    )

    // Create Cashfree webhook Lambda function
    const cashfreeWebhookFunction = new lambda.Function(this, 'CashfreeWebhookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cashfree-subscription-webhook.handler',
      code: lambda.Code.fromAsset('lambda/webhooks'),
      environment: {
        USER_SOLUTION_ENTITLEMENTS_TABLE: userSolutionEntitlementsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    })

    // Grant permissions to the Lambda function
    userSolutionEntitlementsTable.grantReadWriteData(cashfreeWebhookFunction)

    // Reference existing API Gateway
    const existingApi = apigateway.RestApi.fromRestApiId(
      this,
      'ExistingMarketplaceApi',
      'juvt4m81ld' // The API Gateway ID we found earlier
    )

    // Add webhook endpoint to existing API
    const webhooksResource = existingApi.root.addResource('webhooks')
    const cashfreeResource = webhooksResource.addResource('cashfree')
    const subscriptionsResource = cashfreeResource.addResource('subscriptions')

    subscriptionsResource.addMethod('POST', new apigateway.LambdaIntegration(cashfreeWebhookFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
    })

    // Output the webhook URL
    new cdk.CfnOutput(this, 'CashfreeWebhookUrl', {
      value: `https://${existingApi.restApiId}.execute-api.${this.region}.amazonaws.com/prod/webhooks/cashfree/subscriptions`,
      description: 'Cashfree subscription webhook URL',
    })
  }
}
