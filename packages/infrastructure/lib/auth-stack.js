"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
class AuthStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create Post Confirmation Lambda Function
        const postConfirmationFunction = new lambda.Function(this, 'PostConfirmationFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'post-confirmation.handler',
            code: lambda.Code.fromAsset('lambda/auth'),
            environment: {
                USER_TABLE_NAME: props.userTableName,
            },
            timeout: cdk.Duration.seconds(30),
        });
        // Grant DynamoDB permissions to the Lambda function
        postConfirmationFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:PutItem'],
            resources: [`arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${props.userTableName}`],
        }));
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
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            lambdaTriggers: {
                postConfirmation: postConfirmationFunction,
            },
        });
        // Create User Pool Client
        this.userPoolClient = new cognito.UserPoolClient(this, 'MarketplaceUserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: 'marketplace-web-client',
            generateSecret: false,
            authFlows: {
                userSrp: true,
                userPassword: false,
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
        });
        // Google Identity Provider - Disabled for now (requires real credentials)
        // Uncomment and configure when ready to use social login
        /*
        const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
          userPool: this.userPool,
          clientId: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
          scopes: ['email', 'profile', 'openid'],
          attributeMapping: {
            email: cognito.ProviderAttribute.GOOGLE_EMAIL,
            givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
            familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
            profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
          },
        })
        */
        // GitHub Identity Provider - temporarily disabled due to AWS timeout issues
        // Will be re-enabled after initial deployment
        /*
        const githubProvider = new cognito.UserPoolIdentityProviderOidc(this, 'GitHubProvider', {
          userPool: this.userPool,
          name: 'GitHub',
          clientId: 'GITHUB_CLIENT_ID', // Replace with actual GitHub OAuth app client ID
          clientSecret: 'GITHUB_CLIENT_SECRET', // Replace with actual GitHub OAuth app client secret
          issuerUrl: 'https://github.com',
          scopes: ['user:email', 'read:user'],
          attributeMapping: {
            email: cognito.ProviderAttribute.other('email'),
            givenName: cognito.ProviderAttribute.other('name'),
            familyName: cognito.ProviderAttribute.other('name'), // GitHub doesn't separate first/last names
            profilePicture: cognito.ProviderAttribute.other('avatar_url'),
          },
        })
        */
        // Configure the client to use the identity providers (when enabled)
        // this.userPoolClient.node.addDependency(googleProvider)
        // this.userPoolClient.node.addDependency(githubProvider)
        // Create User Pool Domain
        const userPoolDomain = new cognito.UserPoolDomain(this, 'MarketplaceUserPoolDomain', {
            userPool: this.userPool,
            cognitoDomain: {
                domainPrefix: `marketplace-${cdk.Aws.ACCOUNT_ID}`, // Must be globally unique
            },
        });
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
        });
        // Output the hosted UI URL
        new cdk.CfnOutput(this, 'CognitoHostedUIUrl', {
            value: `https://${userPoolDomain.domainName}.auth.${cdk.Aws.REGION}.amazoncognito.com/login?client_id=${this.userPoolClient.userPoolClientId}&response_type=code&scope=email+openid+profile&redirect_uri=http://localhost:3000/auth/callback`,
            description: 'Cognito Hosted UI URL for testing',
        });
    }
}
exports.AuthStack = AuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQWtDO0FBQ2xDLGlFQUFrRDtBQUNsRCwrREFBZ0Q7QUFDaEQseURBQTBDO0FBQzFDLDJDQUFzQztBQUV0QyxNQUFhLFNBQVUsU0FBUSxzQkFBUztJQUt0QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsMkNBQTJDO1FBQzNDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNyRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSwyQkFBMkI7WUFDcEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQztZQUMxQyxXQUFXLEVBQUU7Z0JBQ1gsZUFBZSxFQUFFLEtBQUssQ0FBQyxhQUFhO2FBQ3JDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUNsQyxDQUFDLENBQUE7UUFFRixvREFBb0Q7UUFDcEQsd0JBQXdCLENBQUMsZUFBZSxDQUN0QyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztZQUM3QixTQUFTLEVBQUUsQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLFVBQVUsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1NBQ3JHLENBQUMsQ0FDSCxDQUFBO1FBRUQsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNoRSxZQUFZLEVBQUUsbUJBQW1CO1lBQ2pDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2dCQUNYLFFBQVEsRUFBRSxLQUFLO2FBQ2hCO1lBQ0QsVUFBVSxFQUFFO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxrQkFBa0IsRUFBRTtnQkFDbEIsS0FBSyxFQUFFO29CQUNMLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1YsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7YUFDRjtZQUNELGdCQUFnQixFQUFFO2dCQUNoQixJQUFJLEVBQUUsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO29CQUNoQyxNQUFNLEVBQUUsQ0FBQztvQkFDVCxNQUFNLEVBQUUsRUFBRTtvQkFDVixPQUFPLEVBQUUsSUFBSTtpQkFDZCxDQUFDO2dCQUNGLE9BQU8sRUFBRSxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7b0JBQ25DLE1BQU0sRUFBRSxDQUFDO29CQUNULE1BQU0sRUFBRSxHQUFHO29CQUNYLE9BQU8sRUFBRSxJQUFJO2lCQUNkLENBQUM7Z0JBQ0YsYUFBYSxFQUFFLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQztvQkFDekMsTUFBTSxFQUFFLENBQUM7b0JBQ1QsTUFBTSxFQUFFLEVBQUU7b0JBQ1YsT0FBTyxFQUFFLElBQUk7aUJBQ2QsQ0FBQzthQUNIO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixjQUFjLEVBQUUsSUFBSTthQUNyQjtZQUNELGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLFVBQVU7WUFDbkQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxjQUFjLEVBQUU7Z0JBQ2QsZ0JBQWdCLEVBQUUsd0JBQXdCO2FBQzNDO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUNsRixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsa0JBQWtCLEVBQUUsd0JBQXdCO1lBQzVDLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUUsSUFBSTtnQkFDYixZQUFZLEVBQUUsS0FBSztnQkFDbkIsaUJBQWlCLEVBQUUsS0FBSzthQUN6QjtZQUNELEtBQUssRUFBRTtnQkFDTCxLQUFLLEVBQUU7b0JBQ0wsc0JBQXNCLEVBQUUsSUFBSTtvQkFDNUIsaUJBQWlCLEVBQUUsS0FBSztpQkFDekI7Z0JBQ0QsTUFBTSxFQUFFO29CQUNOLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSztvQkFDeEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNO29CQUN6QixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU87aUJBQzNCO2dCQUNELFlBQVksRUFBRTtvQkFDWixxQ0FBcUM7b0JBQ3JDLCtDQUErQyxFQUFFLDRCQUE0QjtpQkFDOUU7Z0JBQ0QsVUFBVSxFQUFFO29CQUNWLHVCQUF1QjtvQkFDdkIsaUNBQWlDLEVBQUUsNEJBQTRCO2lCQUNoRTthQUNGO1lBQ0QsMEJBQTBCLEVBQUUsSUFBSTtZQUNoQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDM0MsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzFDLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDdkMsQ0FBQyxDQUFBO1FBRUYsMEVBQTBFO1FBQzFFLHlEQUF5RDtRQUN6RDs7Ozs7Ozs7Ozs7OztVQWFFO1FBRUYsNEVBQTRFO1FBQzVFLDhDQUE4QztRQUM5Qzs7Ozs7Ozs7Ozs7Ozs7O1VBZUU7UUFFRixvRUFBb0U7UUFDcEUseURBQXlEO1FBQ3pELHlEQUF5RDtRQUV6RCwwQkFBMEI7UUFDMUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUNuRixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsYUFBYSxFQUFFO2dCQUNiLFlBQVksRUFBRSxlQUFlLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEVBQUUsMEJBQTBCO2FBQzlFO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUMvRSxnQkFBZ0IsRUFBRSwyQkFBMkI7WUFDN0MsOEJBQThCLEVBQUUsS0FBSztZQUNyQyx3QkFBd0IsRUFBRTtnQkFDeEI7b0JBQ0UsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO29CQUM5QyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0I7aUJBQ2pEO2FBQ0Y7U0FDRixDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsV0FBVyxjQUFjLENBQUMsVUFBVSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxzQ0FBc0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsaUdBQWlHO1lBQzdPLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBekxELDhCQXlMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0bydcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnXHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJ1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xyXG5cclxuZXhwb3J0IGNsYXNzIEF1dGhTdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sXHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50XHJcbiAgcHVibGljIHJlYWRvbmx5IGlkZW50aXR5UG9vbDogY29nbml0by5DZm5JZGVudGl0eVBvb2xcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IHsgdXNlclRhYmxlTmFtZTogc3RyaW5nIH0pIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZClcclxuXHJcbiAgICAvLyBDcmVhdGUgUG9zdCBDb25maXJtYXRpb24gTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCBwb3N0Q29uZmlybWF0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdQb3N0Q29uZmlybWF0aW9uRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxyXG4gICAgICBoYW5kbGVyOiAncG9zdC1jb25maXJtYXRpb24uaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2F1dGgnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gR3JhbnQgRHluYW1vREIgcGVybWlzc2lvbnMgdG8gdGhlIExhbWJkYSBmdW5jdGlvblxyXG4gICAgcG9zdENvbmZpcm1hdGlvbkZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlB1dEl0ZW0nXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpkeW5hbW9kYjoke2Nkay5Bd3MuUkVHSU9OfToke2Nkay5Bd3MuQUNDT1VOVF9JRH06dGFibGUvJHtwcm9wcy51c2VyVGFibGVOYW1lfWBdLFxyXG4gICAgICB9KVxyXG4gICAgKVxyXG5cclxuICAgIC8vIENyZWF0ZSBDb2duaXRvIFVzZXIgUG9vbFxyXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdNYXJrZXRwbGFjZVVzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6ICdtYXJrZXRwbGFjZS11c2VycycsXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgdXNlcm5hbWU6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgICBhdXRvVmVyaWZ5OiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgIGVtYWlsOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnaXZlbk5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZhbWlseU5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgcm9sZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMSxcclxuICAgICAgICAgIG1heExlbjogMjAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGNvbXBhbnk6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XHJcbiAgICAgICAgICBtaW5MZW46IDAsXHJcbiAgICAgICAgICBtYXhMZW46IDEwMCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgcGFydG5lclN0YXR1czogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMCxcclxuICAgICAgICAgIG1heExlbjogMjAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG4gICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgIG1pbkxlbmd0aDogOCxcclxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlU3ltYm9sczogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBsYW1iZGFUcmlnZ2Vyczoge1xyXG4gICAgICAgIHBvc3RDb25maXJtYXRpb246IHBvc3RDb25maXJtYXRpb25GdW5jdGlvbixcclxuICAgICAgfSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQ3JlYXRlIFVzZXIgUG9vbCBDbGllbnRcclxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnTWFya2V0cGxhY2VVc2VyUG9vbENsaWVudCcsIHtcclxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXHJcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogJ21hcmtldHBsYWNlLXdlYi1jbGllbnQnLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXHJcbiAgICAgIGF1dGhGbG93czoge1xyXG4gICAgICAgIHVzZXJTcnA6IHRydWUsXHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiBmYWxzZSxcclxuICAgICAgICBhZG1pblVzZXJQYXNzd29yZDogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICAgIG9BdXRoOiB7XHJcbiAgICAgICAgZmxvd3M6IHtcclxuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXHJcbiAgICAgICAgICBpbXBsaWNpdENvZGVHcmFudDogZmFsc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzY29wZXM6IFtcclxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5FTUFJTCxcclxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5PUEVOSUQsXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuUFJPRklMRSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGNhbGxiYWNrVXJsczogW1xyXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2NhbGxiYWNrJyxcclxuICAgICAgICAgICdodHRwczovL21hcmtldHBsYWNlLmV4YW1wbGUuY29tL2F1dGgvY2FsbGJhY2snLCAvLyBVcGRhdGUgd2l0aCBhY3R1YWwgZG9tYWluXHJcbiAgICAgICAgXSxcclxuICAgICAgICBsb2dvdXRVcmxzOiBbXHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcclxuICAgICAgICAgICdodHRwczovL21hcmtldHBsYWNlLmV4YW1wbGUuY29tJywgLy8gVXBkYXRlIHdpdGggYWN0dWFsIGRvbWFpblxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxyXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICBhY2Nlc3NUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBHb29nbGUgSWRlbnRpdHkgUHJvdmlkZXIgLSBEaXNhYmxlZCBmb3Igbm93IChyZXF1aXJlcyByZWFsIGNyZWRlbnRpYWxzKVxyXG4gICAgLy8gVW5jb21tZW50IGFuZCBjb25maWd1cmUgd2hlbiByZWFkeSB0byB1c2Ugc29jaWFsIGxvZ2luXHJcbiAgICAvKlxyXG4gICAgY29uc3QgZ29vZ2xlUHJvdmlkZXIgPSBuZXcgY29nbml0by5Vc2VyUG9vbElkZW50aXR5UHJvdmlkZXJHb29nbGUodGhpcywgJ0dvb2dsZVByb3ZpZGVyJywge1xyXG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcclxuICAgICAgY2xpZW50SWQ6IHByb2Nlc3MuZW52LkdPT0dMRV9DTElFTlRfSUQgfHwgJ0dPT0dMRV9DTElFTlRfSUQnLFxyXG4gICAgICBjbGllbnRTZWNyZXQ6IHByb2Nlc3MuZW52LkdPT0dMRV9DTElFTlRfU0VDUkVUIHx8ICdHT09HTEVfQ0xJRU5UX1NFQ1JFVCcsXHJcbiAgICAgIHNjb3BlczogWydlbWFpbCcsICdwcm9maWxlJywgJ29wZW5pZCddLFxyXG4gICAgICBhdHRyaWJ1dGVNYXBwaW5nOiB7XHJcbiAgICAgICAgZW1haWw6IGNvZ25pdG8uUHJvdmlkZXJBdHRyaWJ1dGUuR09PR0xFX0VNQUlMLFxyXG4gICAgICAgIGdpdmVuTmFtZTogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5HT09HTEVfR0lWRU5fTkFNRSxcclxuICAgICAgICBmYW1pbHlOYW1lOiBjb2duaXRvLlByb3ZpZGVyQXR0cmlidXRlLkdPT0dMRV9GQU1JTFlfTkFNRSxcclxuICAgICAgICBwcm9maWxlUGljdHVyZTogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5HT09HTEVfUElDVFVSRSxcclxuICAgICAgfSxcclxuICAgIH0pXHJcbiAgICAqL1xyXG5cclxuICAgIC8vIEdpdEh1YiBJZGVudGl0eSBQcm92aWRlciAtIHRlbXBvcmFyaWx5IGRpc2FibGVkIGR1ZSB0byBBV1MgdGltZW91dCBpc3N1ZXNcclxuICAgIC8vIFdpbGwgYmUgcmUtZW5hYmxlZCBhZnRlciBpbml0aWFsIGRlcGxveW1lbnRcclxuICAgIC8qXHJcbiAgICBjb25zdCBnaXRodWJQcm92aWRlciA9IG5ldyBjb2duaXRvLlVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGModGhpcywgJ0dpdEh1YlByb3ZpZGVyJywge1xyXG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcclxuICAgICAgbmFtZTogJ0dpdEh1YicsXHJcbiAgICAgIGNsaWVudElkOiAnR0lUSFVCX0NMSUVOVF9JRCcsIC8vIFJlcGxhY2Ugd2l0aCBhY3R1YWwgR2l0SHViIE9BdXRoIGFwcCBjbGllbnQgSURcclxuICAgICAgY2xpZW50U2VjcmV0OiAnR0lUSFVCX0NMSUVOVF9TRUNSRVQnLCAvLyBSZXBsYWNlIHdpdGggYWN0dWFsIEdpdEh1YiBPQXV0aCBhcHAgY2xpZW50IHNlY3JldFxyXG4gICAgICBpc3N1ZXJVcmw6ICdodHRwczovL2dpdGh1Yi5jb20nLFxyXG4gICAgICBzY29wZXM6IFsndXNlcjplbWFpbCcsICdyZWFkOnVzZXInXSxcclxuICAgICAgYXR0cmlidXRlTWFwcGluZzoge1xyXG4gICAgICAgIGVtYWlsOiBjb2duaXRvLlByb3ZpZGVyQXR0cmlidXRlLm90aGVyKCdlbWFpbCcpLFxyXG4gICAgICAgIGdpdmVuTmFtZTogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5vdGhlcignbmFtZScpLFxyXG4gICAgICAgIGZhbWlseU5hbWU6IGNvZ25pdG8uUHJvdmlkZXJBdHRyaWJ1dGUub3RoZXIoJ25hbWUnKSwgLy8gR2l0SHViIGRvZXNuJ3Qgc2VwYXJhdGUgZmlyc3QvbGFzdCBuYW1lc1xyXG4gICAgICAgIHByb2ZpbGVQaWN0dXJlOiBjb2duaXRvLlByb3ZpZGVyQXR0cmlidXRlLm90aGVyKCdhdmF0YXJfdXJsJyksXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG4gICAgKi9cclxuXHJcbiAgICAvLyBDb25maWd1cmUgdGhlIGNsaWVudCB0byB1c2UgdGhlIGlkZW50aXR5IHByb3ZpZGVycyAod2hlbiBlbmFibGVkKVxyXG4gICAgLy8gdGhpcy51c2VyUG9vbENsaWVudC5ub2RlLmFkZERlcGVuZGVuY3koZ29vZ2xlUHJvdmlkZXIpXHJcbiAgICAvLyB0aGlzLnVzZXJQb29sQ2xpZW50Lm5vZGUuYWRkRGVwZW5kZW5jeShnaXRodWJQcm92aWRlcilcclxuXHJcbiAgICAvLyBDcmVhdGUgVXNlciBQb29sIERvbWFpblxyXG4gICAgY29uc3QgdXNlclBvb2xEb21haW4gPSBuZXcgY29nbml0by5Vc2VyUG9vbERvbWFpbih0aGlzLCAnTWFya2V0cGxhY2VVc2VyUG9vbERvbWFpbicsIHtcclxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXHJcbiAgICAgIGNvZ25pdG9Eb21haW46IHtcclxuICAgICAgICBkb21haW5QcmVmaXg6IGBtYXJrZXRwbGFjZS0ke2Nkay5Bd3MuQUNDT1VOVF9JRH1gLCAvLyBNdXN0IGJlIGdsb2JhbGx5IHVuaXF1ZVxyXG4gICAgICB9LFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBDcmVhdGUgSWRlbnRpdHkgUG9vbCBmb3IgQVdTIHJlc291cmNlIGFjY2Vzc1xyXG4gICAgdGhpcy5pZGVudGl0eVBvb2wgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2wodGhpcywgJ01hcmtldHBsYWNlSWRlbnRpdHlQb29sJywge1xyXG4gICAgICBpZGVudGl0eVBvb2xOYW1lOiAnbWFya2V0cGxhY2UtaWRlbnRpdHktcG9vbCcsXHJcbiAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXHJcbiAgICAgIGNvZ25pdG9JZGVudGl0eVByb3ZpZGVyczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNsaWVudElkOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgICAgICBwcm92aWRlck5hbWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xQcm92aWRlck5hbWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gT3V0cHV0IHRoZSBob3N0ZWQgVUkgVVJMXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29nbml0b0hvc3RlZFVJVXJsJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHt1c2VyUG9vbERvbWFpbi5kb21haW5OYW1lfS5hdXRoLiR7Y2RrLkF3cy5SRUdJT059LmFtYXpvbmNvZ25pdG8uY29tL2xvZ2luP2NsaWVudF9pZD0ke3RoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZH0mcmVzcG9uc2VfdHlwZT1jb2RlJnNjb3BlPWVtYWlsK29wZW5pZCtwcm9maWxlJnJlZGlyZWN0X3VyaT1odHRwOi8vbG9jYWxob3N0OjMwMDAvYXV0aC9jYWxsYmFja2AsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBIb3N0ZWQgVUkgVVJMIGZvciB0ZXN0aW5nJyxcclxuICAgIH0pXHJcbiAgfVxyXG59Il19