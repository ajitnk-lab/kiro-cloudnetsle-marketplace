import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

export class AuthStack extends Construct {
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient
  public readonly identityPool: cognito.CfnIdentityPool

  constructor(scope: Construct, id: string) {
    super(scope, id)

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'MarketplaceUserPool', {
      userPoolName: 'marketplace-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 20,
          mutable: true,
        }),
        company: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 100,
          mutable: true,
        }),
        partnerStatus: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 20,
          mutable: true,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Create User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'MarketplaceUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'marketplace-web-client',
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true, // Enable USER_PASSWORD_AUTH
        adminUserPassword: false,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/auth/callback',
          'https://marketplace.example.com/auth/callback', // Update with actual domain
        ],
        logoutUrls: [
          'http://localhost:3000',
          'https://marketplace.example.com', // Update with actual domain
        ],
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      // Configure read/write attributes for ID token
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('role', 'company'),
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('role', 'company'),
    })
    })

    // Add Google Identity Provider
    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
      userPool: this.userPool,
      clientId: 'GOOGLE_CLIENT_ID', // Replace with actual Google OAuth client ID
      clientSecret: 'GOOGLE_CLIENT_SECRET', // Replace with actual Google OAuth client secret
      scopes: ['email', 'profile', 'openid'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
      },
    })

    // Configure the client to use the identity providers
    this.userPoolClient.node.addDependency(googleProvider)

    // Create User Pool Domain
    const userPoolDomain = new cognito.UserPoolDomain(this, 'MarketplaceUserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `marketplace-${cdk.Aws.ACCOUNT_ID}`, // Must be globally unique
      },
    })

    // Create Identity Pool for AWS resource access
    this.identityPool = new cognito.CfnIdentityPool(this, 'MarketplaceIdentityPool', {
      identityPoolName: 'marketplace-identity-pool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    })

    // Output the hosted UI URL
    new cdk.CfnOutput(this, 'CognitoHostedUIUrl', {
      value: `https://${userPoolDomain.domainName}.auth.${cdk.Aws.REGION}.amazoncognito.com/login?client_id=${this.userPoolClient.userPoolClientId}&response_type=code&scope=email+openid+profile&redirect_uri=http://localhost:3000/auth/callback`,
      description: 'Cognito Hosted UI URL for testing',
    })
  }
}