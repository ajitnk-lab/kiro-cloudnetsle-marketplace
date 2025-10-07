import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AuthStack } from './auth-stack'
import { DataStack } from './data-stack'
import { ApiStack } from './api-stack'
import { FrontendStack } from './frontend-stack'
import { EmailStack } from './email-stack'

export class MarketplaceInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create data layer (DynamoDB, S3, RDS)
    const dataStack = new DataStack(this, 'DataStack')

    // Create authentication layer (Cognito)
    const authStack = new AuthStack(this, 'AuthStack', {
      userTableName: dataStack.userTable.tableName,
    })

    // Create email layer (SES)
    const emailStack = new EmailStack(this, 'EmailStack', {
      fromEmail: 'ajitnk2006+noreply@gmail.com',
      adminEmail: 'ajitnk2006+admin@gmail.com',
      replyToEmail: 'ajitnk2006+support@gmail.com'
    })

    // Create API layer (API Gateway, Lambda functions)
    const apiStack = new ApiStack(this, 'ApiStack', {
      userPool: authStack.userPool,
      userTable: dataStack.userTable,
      solutionTable: dataStack.solutionTable,
      partnerApplicationTable: dataStack.partnerApplicationTable,
      transactionTable: dataStack.transactionTable,
      userSolutionsTable: dataStack.userSolutionsTable,
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

    new cdk.CfnOutput(this, 'SESFromEmail', {
      value: emailStack.fromEmail,
      description: 'SES verified from email address',
    })

    new cdk.CfnOutput(this, 'EmailSetupInstructions', {
      value: 'Run ./setup-ses-emails.ps1 to verify email addresses for sending notifications',
      description: 'Email setup instructions',
    })
  }
}