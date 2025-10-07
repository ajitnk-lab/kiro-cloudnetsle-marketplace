import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

export class SimpleMarketplaceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const timestamp = Date.now()

    // Just ONE table to start
    const userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: `marketplace-users-${timestamp}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Just ONE Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `marketplace-users-${timestamp}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }),
        userId: new cognito.StringAttribute({ mutable: false }),
      },
    })

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      generateSecret: false,
    })

    // OUTPUTS
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    })

    new cdk.CfnOutput(this, 'UserTableName', {
      value: userTable.tableName,
    })
  }
}