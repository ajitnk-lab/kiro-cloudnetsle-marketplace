import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

interface ApiConstructProps {
  // Lambda functions
  paymentInitiateFunction: lambda.IFunction
  paymentStatusFunction: lambda.IFunction
  upgradeToProFunction: lambda.IFunction
  paymentCallbackFunction: lambda.IFunction
  cashfreeWebhookFunction: lambda.IFunction
  payuWebhookFunction: lambda.IFunction
  phonepeWebhookFunction: lambda.IFunction
  phonepeReconciliationFunction: lambda.IFunction
  invoiceGenerationFunction: lambda.IFunction
  catalogFunction: lambda.IFunction
  solutionManagementFunction: lambda.IFunction
  partnerApplicationFunction: lambda.IFunction
  adminFunction: lambda.IFunction
  userManagementFunction: lambda.IFunction
  profileFunction: lambda.IFunction
  registerFunction: lambda.IFunction
  tokenManagerFunction: lambda.IFunction
  solutionTokenGeneratorFunction: lambda.IFunction
  generateSolutionTokenFunction: lambda.IFunction
  solutionTokenValidatorFunction: lambda.IFunction
  checkUserLimitsFunction: lambda.IFunction
  incrementUsageFunctionCF29C1F7: lambda.IFunction
  usageAnalyticsFunction: lambda.IFunction
  businessMetricsFunction: lambda.IFunction
  geographicAnalyticsFunction: lambda.IFunction
  msmeKpiFunction: lambda.IFunction
  paymentReconciliationFunction: lambda.IFunction

  // Cognito
  userPool: cognito.IUserPool
}

export class ApiConstruct extends Construct {
  public readonly api: apigateway.RestApi

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id)

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'MarketplaceApi', {
      restApiName: 'Marketplace API',
      description: 'API for marketplace platform',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
      deployOptions: {
        stageName: 'prod',
      },
    })

    // Add CORS support for 401 responses
    this.api.addGatewayResponse('Unauthorized', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    })

    // Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
    })

    // Auth routes (no auth required)
    const authApi = this.api.root.addResource('auth')
    authApi.addResource('register').addMethod('POST', new apigateway.LambdaIntegration(props.registerFunction))

    // Catalog routes (no auth required)
    const catalogApi = this.api.root.addResource('catalog')
    catalogApi.addMethod('GET', new apigateway.LambdaIntegration(props.catalogFunction))
    catalogApi.addResource('search').addMethod('GET', new apigateway.LambdaIntegration(props.catalogFunction))
    catalogApi.addResource('categories').addMethod('GET', new apigateway.LambdaIntegration(props.catalogFunction))
    catalogApi.addResource('{solutionId}').addMethod('GET', new apigateway.LambdaIntegration(props.catalogFunction))
    catalogApi.addResource('upload-image').addMethod('POST', new apigateway.LambdaIntegration(props.catalogFunction))

    // User routes (auth required)
    const userApi = this.api.root.addResource('user')
    userApi.addResource('{userId}').addMethod('GET', new apigateway.LambdaIntegration(props.userManagementFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    const profileResource = userApi.addResource('profile')
    profileResource.addMethod('GET', new apigateway.LambdaIntegration(props.profileFunction), {
      authorizer: cognitoAuthorizer,
    })
    profileResource.addMethod('PUT', new apigateway.LambdaIntegration(props.profileFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Payment routes
    const paymentsApi = this.api.root.addResource('payments')
    paymentsApi.addResource('initiate').addMethod('POST', new apigateway.LambdaIntegration(props.paymentInitiateFunction), {
      authorizer: cognitoAuthorizer,
    })
    paymentsApi.addResource('status').addResource('{transactionId}').addMethod('GET', new apigateway.LambdaIntegration(props.paymentStatusFunction))
    
    const callbackResource = paymentsApi.addResource('callback')
    callbackResource.addMethod('GET', new apigateway.LambdaIntegration(props.paymentCallbackFunction))
    callbackResource.addMethod('POST', new apigateway.LambdaIntegration(props.paymentCallbackFunction))
    
    paymentsApi.addResource('upgrade-to-pro').addMethod('POST', new apigateway.LambdaIntegration(props.upgradeToProFunction), {
      authorizer: cognitoAuthorizer,
    })
    paymentsApi.addResource('cashfree-webhook').addMethod('POST', new apigateway.LambdaIntegration(props.cashfreeWebhookFunction))
    paymentsApi.addResource('payu-webhook').addMethod('POST', new apigateway.LambdaIntegration(props.payuWebhookFunction))
    paymentsApi.addResource('phonepe-webhook').addMethod('POST', new apigateway.LambdaIntegration(props.phonepeWebhookFunction))
    paymentsApi.addResource('reconciliation').addMethod('POST', new apigateway.LambdaIntegration(props.paymentReconciliationFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Partner routes (auth required)
    const partnerApi = this.api.root.addResource('partner')
    
    const applicationsResource = partnerApi.addResource('applications')
    applicationsResource.addMethod('GET', new apigateway.LambdaIntegration(props.partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    applicationsResource.addMethod('POST', new apigateway.LambdaIntegration(props.partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    const applicationIdResource = applicationsResource.addResource('{applicationId}')
    applicationIdResource.addMethod('GET', new apigateway.LambdaIntegration(props.partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    applicationIdResource.addMethod('PUT', new apigateway.LambdaIntegration(props.partnerApplicationFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    const solutionsResource = partnerApi.addResource('solutions')
    solutionsResource.addMethod('GET', new apigateway.LambdaIntegration(props.solutionManagementFunction), {
      authorizer: cognitoAuthorizer,
    })
    solutionsResource.addMethod('POST', new apigateway.LambdaIntegration(props.solutionManagementFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    const solutionIdResource = solutionsResource.addResource('{solutionId}')
    solutionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(props.solutionManagementFunction), {
      authorizer: cognitoAuthorizer,
    })
    solutionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(props.solutionManagementFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Admin routes (auth required)
    const adminApi = this.api.root.addResource('admin')
    
    const adminUsersResource = adminApi.addResource('users')
    adminUsersResource.addMethod('GET', new apigateway.LambdaIntegration(props.adminFunction), {
      authorizer: cognitoAuthorizer,
    })
    adminUsersResource.addResource('{userId}').addMethod('PUT', new apigateway.LambdaIntegration(props.adminFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    const adminApplicationsResource = adminApi.addResource('applications')
    adminApplicationsResource.addMethod('GET', new apigateway.LambdaIntegration(props.adminFunction), {
      authorizer: cognitoAuthorizer,
    })
    adminApplicationsResource.addResource('{applicationId}').addMethod('PUT', new apigateway.LambdaIntegration(props.adminFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    const adminSolutionsResource = adminApi.addResource('solutions')
    adminSolutionsResource.addMethod('GET', new apigateway.LambdaIntegration(props.adminFunction), {
      authorizer: cognitoAuthorizer,
    })
    adminSolutionsResource.addResource('{solutionId}').addMethod('PUT', new apigateway.LambdaIntegration(props.adminFunction), {
      authorizer: cognitoAuthorizer,
    })
    
    adminApi.addResource('migrate-user-countries').addMethod('POST', new apigateway.LambdaIntegration(props.adminFunction), {
      authorizer: cognitoAuthorizer,
    })

    // API routes (for solution access)
    const apiResource = this.api.root.addResource('api')
    apiResource.addResource('generate-token').addMethod('POST', new apigateway.LambdaIntegration(props.tokenManagerFunction), {
      authorizer: cognitoAuthorizer,
    })
    apiResource.addResource('validate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(props.solutionTokenValidatorFunction))
    apiResource.addResource('generate-solution-token').addMethod('POST', new apigateway.LambdaIntegration(props.generateSolutionTokenFunction), {
      authorizer: cognitoAuthorizer,
    })
    apiResource.addResource('check-user-limits').addMethod('POST', new apigateway.LambdaIntegration(props.checkUserLimitsFunction))
    apiResource.addResource('increment-usage').addMethod('POST', new apigateway.LambdaIntegration(props.incrementUsageFunctionCF29C1F7))
    apiResource.addResource('track-usage').addMethod('POST', new apigateway.LambdaIntegration(props.incrementUsageFunctionCF29C1F7))
    apiResource.addResource('user-tokens').addResource('{userId}').addMethod('GET', new apigateway.LambdaIntegration(props.tokenManagerFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Analytics routes (auth required)
    const analyticsApi = apiResource.addResource('analytics')
    analyticsApi.addResource('business-metrics').addMethod('GET', new apigateway.LambdaIntegration(props.businessMetricsFunction), {
      authorizer: cognitoAuthorizer,
    })
    analyticsApi.addResource('geographic').addMethod('GET', new apigateway.LambdaIntegration(props.geographicAnalyticsFunction), {
      authorizer: cognitoAuthorizer,
    })
    analyticsApi.addResource('usage').addMethod('GET', new apigateway.LambdaIntegration(props.usageAnalyticsFunction), {
      authorizer: cognitoAuthorizer,
    })
    analyticsApi.addResource('msme-kpis').addMethod('GET', new apigateway.LambdaIntegration(props.msmeKpiFunction), {
      authorizer: cognitoAuthorizer,
    })

    // Founder metrics (auth required)
    const founderApi = apiResource.addResource('founder')
    founderApi.addResource('metrics').addMethod('GET', new apigateway.LambdaIntegration(props.businessMetricsFunction), {
      authorizer: cognitoAuthorizer,
    })
  }
}
