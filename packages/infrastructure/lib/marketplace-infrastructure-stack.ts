import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { AuthStack } from './auth-stack'
import { DataConstruct } from './constructs/data-construct'
import { ApiConstruct } from './constructs/api-construct'
import { FrontendStack } from './frontend-stack'

export class MarketplaceInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create authentication layer first (Cognito with custom attributes)
    const authStack = new AuthStack(this, 'AuthStack', {
      userTableName: '', // Will be set after DataConstruct creation
      userSolutionEntitlementsTableName: '',
      subscriptionHistoryTableName: '',
      tokenSecret: 'marketplace-secret-key-2024',
    })

    // Create data layer (DynamoDB, S3, Lambda functions) - pass AuthStack's UserPool
    const dataConstruct = new DataConstruct(this, 'DataStack', {
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
    })

    // Grant permissions to auth functions
    dataConstruct.userTable.grantWriteData(authStack.postConfirmationFunction)
    dataConstruct.userSolutionEntitlementsTable.grantWriteData(authStack.postConfirmationFunction)
    dataConstruct.subscriptionHistoryTable.grantWriteData(authStack.postConfirmationFunction)
    
    // Update AuthStack Lambda environment variables with table names
    authStack.postConfirmationFunction.addEnvironment('USER_TABLE_NAME', dataConstruct.userTable.tableName)
    authStack.postConfirmationFunction.addEnvironment('USER_SOLUTION_ENTITLEMENTS_TABLE', dataConstruct.userSolutionEntitlementsTable.tableName)
    authStack.postConfirmationFunction.addEnvironment('SUBSCRIPTION_HISTORY_TABLE_NAME', dataConstruct.subscriptionHistoryTable.tableName)

    // Create API layer (API Gateway only - references Lambda from DataConstruct)
    const apiConstruct = new ApiConstruct(this, 'ApiStack', {
      // Pass all Lambda functions from DataConstruct
      paymentInitiateFunction: dataConstruct.paymentInitiateFunction,
      paymentStatusFunction: dataConstruct.paymentStatusFunction,
      upgradeToProFunction: dataConstruct.upgradeToProFunction,
      paymentCallbackFunction: dataConstruct.paymentCallbackFunction,
      cashfreeWebhookFunction: dataConstruct.cashfreeWebhookFunction,
      payuWebhookFunction: dataConstruct.payuWebhookFunction,
      phonepeWebhookFunction: dataConstruct.phonepeWebhookFunction,
      phonepeReconciliationFunction: dataConstruct.phonepeReconciliationFunction,
      invoiceGenerationFunction: dataConstruct.invoiceGenerationFunction,
      catalogFunction: dataConstruct.catalogFunction,
      solutionManagementFunction: dataConstruct.solutionManagementFunction,
      partnerApplicationFunction: dataConstruct.partnerApplicationFunction,
      adminFunction: dataConstruct.adminFunction,
      userManagementFunction: dataConstruct.userManagementFunction,
      profileFunction: dataConstruct.profileFunction,
      registerFunction: dataConstruct.registerFunction,
      tokenManagerFunction: dataConstruct.tokenManagerFunction,
      solutionTokenGeneratorFunction: dataConstruct.solutionTokenGeneratorFunction,
      generateSolutionTokenFunction: dataConstruct.generateSolutionTokenFunction,
      solutionTokenValidatorFunction: dataConstruct.solutionTokenValidatorFunction,
      checkUserLimitsFunction: dataConstruct.checkUserLimitsFunction,
      incrementUsageFunctionCF29C1F7: dataConstruct.incrementUsageFunctionCF29C1F7,
      usageAnalyticsFunction: dataConstruct.usageAnalyticsFunction,
      businessMetricsFunction: dataConstruct.businessMetricsFunction,
      geographicAnalyticsFunction: dataConstruct.geographicAnalyticsFunction,
      msmeKpiFunction: dataConstruct.msmeKpiFunction,
      paymentReconciliationFunction: dataConstruct.paymentReconciliationFunction,
      
      // Pass Cognito User Pool from AuthStack
      userPool: authStack.userPool,
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
      value: apiConstruct.api.url,
      description: 'API Gateway URL',
    })

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: dataConstruct.assetsBucket.bucketName,
      description: 'S3 Assets Bucket Name',
    })

    new cdk.CfnOutput(this, 'InvoiceBucketName', {
      value: dataConstruct.invoiceBucket.bucketName,
      description: 'S3 Invoice Bucket Name',
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
      value: dataConstruct.userTable.tableName,
      description: 'DynamoDB User Table Name',
    })

    new cdk.CfnOutput(this, 'EntitlementTableName', {
      value: dataConstruct.userSolutionEntitlementsTable.tableName,
      description: 'DynamoDB User Solution Entitlements Table Name',
    })

    new cdk.CfnOutput(this, 'SessionTableName', {
      value: dataConstruct.sessionTable.tableName,
      description: 'DynamoDB Session Table Name',
    })

    new cdk.CfnOutput(this, 'CompanySettingsTableName', {
      value: dataConstruct.companySettingsTable.tableName,
      description: 'DynamoDB Company Settings Table Name (GST)',
    })
  }
}
