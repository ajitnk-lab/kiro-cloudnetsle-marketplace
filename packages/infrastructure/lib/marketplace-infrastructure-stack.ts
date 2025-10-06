import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AuthStack } from './auth-stack'
import { DataStack } from './data-stack'
import { ApiStack } from './api-stack'

export class MarketplaceInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create data layer (DynamoDB, S3, RDS)
    const dataStack = new DataStack(this, 'DataStack')

    // Create authentication layer (Cognito)
    const authStack = new AuthStack(this, 'AuthStack')

    // Create API layer (API Gateway, Lambda functions)
    const apiStack = new ApiStack(this, 'ApiStack', {
      userPool: authStack.userPool,
      userTable: dataStack.userTable,
      solutionTable: dataStack.solutionTable,
      partnerApplicationTable: dataStack.partnerApplicationTable,
      assetsBucket: dataStack.assetsBucket,
    })

    // Output important values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: authStack.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: authStack.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    })

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: apiStack.api.url,
      description: 'API Gateway URL',
    })

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: dataStack.assetsBucket.bucketName,
      description: 'S3 Assets Bucket Name',
    })
  }
}