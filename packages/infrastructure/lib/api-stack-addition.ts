// Add this after the existing payment functions in api-stack.ts

    // Cashfree Subscription Webhook Function
    const cashfreeSubscriptionWebhookFunction = new lambda.Function(this, 'CashfreeSubscriptionWebhookFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cashfree-subscription-webhook.handler',
      code: lambda.Code.fromAsset('lambda/payments'),
      environment: {
        USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTable.tableName,
        SUBSCRIPTIONS_TABLE: 'marketplace-subscriptions',
        USER_TABLE: props.userTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    })

// Add this in the API routes section after the existing webhook routes:

    // Cashfree subscription webhook route (no auth required)
    const webhooksResource = this.api.root.addResource('api').addResource('webhooks')
    const cashfreeResource = webhooksResource.addResource('cashfree')
    cashfreeResource.addResource('subscription').addMethod('POST', new apigateway.LambdaIntegration(cashfreeSubscriptionWebhookFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })
