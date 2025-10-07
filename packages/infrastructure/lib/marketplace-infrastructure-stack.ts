import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { DataStack } from './data-stack'
import { AuthStack } from './auth-stack'
import { ApiStack } from './api-stack'

export class MarketplaceInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const uniqueSuffix = Date.now().toString()

    // Create Data Stack (DynamoDB tables, S3 buckets - NO VPC/RDS)
    const dataStack = new DataStack(this, 'DataStack', {
      uniqueSuffix,
    })

    // Create Auth Stack (Cognito User Pool - NO social providers yet)
    const authStack = new AuthStack(this, 'AuthStack', {
      userTableName: dataStack.userTable.tableName,
    })

    // Create API Stack (API Gateway + Lambda functions)
    const apiStack = new ApiStack(this, 'ApiStack', {
      userPool: authStack.userPool,
      userTable: dataStack.userTable,
      solutionTable: dataStack.solutionTable,
      partnerApplicationTable: dataStack.partnerApplicationTable,
      transactionTable: dataStack.transactionTable,
      userSolutionsTable: dataStack.userSolutionsTable,
      commissionSettingsTable: dataStack.commissionSettingsTable,
      partnerEarningsTable: dataStack.partnerEarningsTable,
      assetsBucket: dataStack.assetsBucket,
    })

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: authStack.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: authStack.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    })

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: apiStack.api.url,
      description: 'API Gateway Endpoint',
    })

    new cdk.CfnOutput(this, 'UserTableName', {
      value: dataStack.userTable.tableName,
      description: 'DynamoDB User Table Name',
    })

    new cdk.CfnOutput(this, 'SolutionTableName', {
      value: dataStack.solutionTable.tableName,
      description: 'DynamoDB Solution Table Name',
    })

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: dataStack.assetsBucket.bucketName,
      description: 'S3 Assets Bucket Name',
    })
  }
}