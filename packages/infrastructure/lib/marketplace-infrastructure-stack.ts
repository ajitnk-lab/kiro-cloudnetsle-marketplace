import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AuthStack } from './auth-stack'
import { DataStack } from './data-stack'
import { ApiStack } from './api-stack'
import { FrontendStack } from './frontend-stack'

export class MarketplaceInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create data layer (DynamoDB, S3, RDS)
    const dataStack = new DataStack(this, 'DataStack')

    // Create authentication layer (Cognito)
    const authStack = new AuthStack(this, 'AuthStack', {
      userTableName: dataStack.userTable.tableName,
      userSolutionEntitlementsTableName: dataStack.userSolutionEntitlementsTable.tableName,
      tokenSecret: 'marketplace-secret-key-2024', // In production, use AWS Secrets Manager
    })

    // Grant permissions
    dataStack.userTable.grantWriteData(authStack.postConfirmationFunction)
    dataStack.userSolutionEntitlementsTable.grantWriteData(authStack.postConfirmationFunction)

    // Create API layer (API Gateway, Lambda functions)
    const apiStack = new ApiStack(this, 'ApiStack', {
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
    })

    // Create frontend deployment (S3 + CloudFront)
    const frontendStack = new FrontendStack(this, 'FrontendStack')

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

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: frontendStack.websiteUrl,
      description: 'Frontend Website URL (CloudFront)',
    })

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: frontendStack.websiteBucket.bucketName,
      description: 'S3 Website Bucket Name',
    })

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: frontendStack.distribution.distributionId,
      description: 'CloudFront Distribution ID',
    })

    // Export DynamoDB table names for FAISS integration
    new cdk.CfnOutput(this, 'UserTableName', {
      value: dataStack.userTable.tableName,
      description: 'DynamoDB User Table Name',
    })

    new cdk.CfnOutput(this, 'EntitlementTableName', {
      value: dataStack.userSolutionEntitlementsTable.tableName,
      description: 'DynamoDB User Solution Entitlements Table Name',
    })

    new cdk.CfnOutput(this, 'SessionTableName', {
      value: dataStack.sessionTable.tableName,
      description: 'DynamoDB Session Table Name',
    })
  }
}