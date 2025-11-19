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
const constructs_1 = require("constructs");
class AuthStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create post-confirmation Lambda function
        this.postConfirmationFunction = new lambda.Function(this, 'PostConfirmationFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'post-confirmation.handler',
            code: lambda.Code.fromAsset('lambda/auth'),
            environment: {
                USER_TABLE_NAME: props.userTableName,
                USER_SOLUTION_ENTITLEMENTS_TABLE: props.userSolutionEntitlementsTableName,
                TOKEN_SECRET: props.tokenSecret,
            },
        });
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
            lambdaTriggers: {
                postConfirmation: this.postConfirmationFunction,
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
        });
        // Create User Pool Client
        this.userPoolClient = new cognito.UserPoolClient(this, 'MarketplaceUserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: 'marketplace-web-client',
            generateSecret: false,
            authFlows: {
                userSrp: true,
                userPassword: true, // Enable USER_PASSWORD_AUTH
                adminUserPassword: true, // Enable ADMIN_USER_PASSWORD_AUTH
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
        });
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
        });
        // Configure the client to use the identity providers
        this.userPoolClient.node.addDependency(googleProvider);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQWtDO0FBQ2xDLGlFQUFrRDtBQUNsRCwrREFBZ0Q7QUFDaEQsMkNBQXNDO0FBRXRDLE1BQWEsU0FBVSxTQUFRLHNCQUFTO0lBTXRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FJekM7UUFDQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLDJDQUEyQztRQUMzQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNwRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSwyQkFBMkI7WUFDcEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQztZQUMxQyxXQUFXLEVBQUU7Z0JBQ1gsZUFBZSxFQUFFLEtBQUssQ0FBQyxhQUFhO2dCQUNwQyxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsaUNBQWlDO2dCQUN6RSxZQUFZLEVBQUUsS0FBSyxDQUFDLFdBQVc7YUFDaEM7U0FDRixDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ2hFLFlBQVksRUFBRSxtQkFBbUI7WUFDakMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUSxFQUFFLEtBQUs7YUFDaEI7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUNELGNBQWMsRUFBRTtnQkFDZCxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsd0JBQXdCO2FBQ2hEO1lBQ0Qsa0JBQWtCLEVBQUU7Z0JBQ2xCLEtBQUssRUFBRTtvQkFDTCxRQUFRLEVBQUUsSUFBSTtvQkFDZCxPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsVUFBVSxFQUFFO29CQUNWLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2FBQ0Y7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDaEIsSUFBSSxFQUFFLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQztvQkFDaEMsTUFBTSxFQUFFLENBQUM7b0JBQ1QsTUFBTSxFQUFFLEVBQUU7b0JBQ1YsT0FBTyxFQUFFLElBQUk7aUJBQ2QsQ0FBQztnQkFDRixPQUFPLEVBQUUsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO29CQUNuQyxNQUFNLEVBQUUsQ0FBQztvQkFDVCxNQUFNLEVBQUUsR0FBRztvQkFDWCxPQUFPLEVBQUUsSUFBSTtpQkFDZCxDQUFDO2dCQUNGLGFBQWEsRUFBRSxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUM7b0JBQ3pDLE1BQU0sRUFBRSxDQUFDO29CQUNULE1BQU0sRUFBRSxFQUFFO29CQUNWLE9BQU8sRUFBRSxJQUFJO2lCQUNkLENBQUM7YUFDSDtZQUNELGNBQWMsRUFBRTtnQkFDZCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsY0FBYyxFQUFFLElBQUk7YUFDckI7WUFDRCxlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQ25ELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07U0FDeEMsQ0FBQyxDQUFBO1FBRUYsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUNsRixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsa0JBQWtCLEVBQUUsd0JBQXdCO1lBQzVDLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUUsSUFBSTtnQkFDYixZQUFZLEVBQUUsSUFBSSxFQUFFLDRCQUE0QjtnQkFDaEQsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGtDQUFrQzthQUM1RDtZQUNELEtBQUssRUFBRTtnQkFDTCxLQUFLLEVBQUU7b0JBQ0wsc0JBQXNCLEVBQUUsSUFBSTtvQkFDNUIsaUJBQWlCLEVBQUUsS0FBSztpQkFDekI7Z0JBQ0QsTUFBTSxFQUFFO29CQUNOLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSztvQkFDeEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNO29CQUN6QixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU87aUJBQzNCO2dCQUNELFlBQVksRUFBRTtvQkFDWixxQ0FBcUM7b0JBQ3JDLCtDQUErQyxFQUFFLDRCQUE0QjtpQkFDOUU7Z0JBQ0QsVUFBVSxFQUFFO29CQUNWLHVCQUF1QjtvQkFDdkIsaUNBQWlDLEVBQUUsNEJBQTRCO2lCQUNoRTthQUNGO1lBQ0QsMEJBQTBCLEVBQUUsSUFBSTtZQUNoQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDM0MsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzFDLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDdEMsK0NBQStDO1lBQy9DLGNBQWMsRUFBRSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTtpQkFDM0Msc0JBQXNCLENBQUM7Z0JBQ3RCLEtBQUssRUFBRSxJQUFJO2dCQUNYLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFVBQVUsRUFBRSxJQUFJO2FBQ2pCLENBQUM7aUJBQ0Qsb0JBQW9CLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztZQUMxQyxlQUFlLEVBQUUsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7aUJBQzVDLHNCQUFzQixDQUFDO2dCQUN0QixLQUFLLEVBQUUsSUFBSTtnQkFDWCxTQUFTLEVBQUUsSUFBSTtnQkFDZixVQUFVLEVBQUUsSUFBSTthQUNqQixDQUFDO2lCQUNELG9CQUFvQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUM7U0FDM0MsQ0FBQyxDQUFBO1FBRUYsK0JBQStCO1FBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUksT0FBTyxDQUFDLDhCQUE4QixDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4RixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsUUFBUSxFQUFFLGtCQUFrQixFQUFFLDZDQUE2QztZQUMzRSxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsaURBQWlEO1lBQ3ZGLE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDO1lBQ3RDLGdCQUFnQixFQUFFO2dCQUNoQixLQUFLLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFlBQVk7Z0JBQzdDLFNBQVMsRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCO2dCQUN0RCxVQUFVLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQjtnQkFDeEQsY0FBYyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjO2FBQ3pEO1NBQ0YsQ0FBQyxDQUFBO1FBRUYscURBQXFEO1FBQ3JELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUV0RCwwQkFBMEI7UUFDMUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUNuRixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsYUFBYSxFQUFFO2dCQUNiLFlBQVksRUFBRSxlQUFlLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEVBQUUsMEJBQTBCO2FBQzlFO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUMvRSxnQkFBZ0IsRUFBRSwyQkFBMkI7WUFDN0MsOEJBQThCLEVBQUUsS0FBSztZQUNyQyx3QkFBd0IsRUFBRTtnQkFDeEI7b0JBQ0UsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO29CQUM5QyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0I7aUJBQ2pEO2FBQ0Y7U0FDRixDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsV0FBVyxjQUFjLENBQUMsVUFBVSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxzQ0FBc0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsaUdBQWlHO1lBQzdPLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBOUtELDhCQThLQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5cbmV4cG9ydCBjbGFzcyBBdXRoU3RhY2sgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2xcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50XG4gIHB1YmxpYyByZWFkb25seSBpZGVudGl0eVBvb2w6IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sXG4gIHB1YmxpYyByZWFkb25seSBwb3N0Q29uZmlybWF0aW9uRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvblxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiB7IFxuICAgIHVzZXJUYWJsZU5hbWU6IHN0cmluZ1xuICAgIHVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlTmFtZTogc3RyaW5nXG4gICAgdG9rZW5TZWNyZXQ6IHN0cmluZ1xuICB9KSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKVxuXG4gICAgLy8gQ3JlYXRlIHBvc3QtY29uZmlybWF0aW9uIExhbWJkYSBmdW5jdGlvblxuICAgIHRoaXMucG9zdENvbmZpcm1hdGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUG9zdENvbmZpcm1hdGlvbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncG9zdC1jb25maXJtYXRpb24uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZU5hbWUsXG4gICAgICAgIFRPS0VOX1NFQ1JFVDogcHJvcHMudG9rZW5TZWNyZXQsXG4gICAgICB9LFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgQ29nbml0byBVc2VyIFBvb2xcbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ01hcmtldHBsYWNlVXNlclBvb2wnLCB7XG4gICAgICB1c2VyUG9vbE5hbWU6ICdtYXJrZXRwbGFjZS11c2VycycsXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICAgIHVzZXJuYW1lOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBhdXRvVmVyaWZ5OiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIGxhbWJkYVRyaWdnZXJzOiB7XG4gICAgICAgIHBvc3RDb25maXJtYXRpb246IHRoaXMucG9zdENvbmZpcm1hdGlvbkZ1bmN0aW9uLFxuICAgICAgfSxcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGdpdmVuTmFtZToge1xuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGZhbWlseU5hbWU6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcbiAgICAgICAgcm9sZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcbiAgICAgICAgICBtaW5MZW46IDEsXG4gICAgICAgICAgbWF4TGVuOiAyMCxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxuICAgICAgICB9KSxcbiAgICAgICAgY29tcGFueTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcbiAgICAgICAgICBtaW5MZW46IDAsXG4gICAgICAgICAgbWF4TGVuOiAxMDAsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgICAgIHBhcnRuZXJTdGF0dXM6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XG4gICAgICAgICAgbWluTGVuOiAwLFxuICAgICAgICAgIG1heExlbjogMjAsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgICB9LFxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgbWluTGVuZ3RoOiA4LFxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxuICAgICAgICByZXF1aXJlU3ltYm9sczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBVc2VyIFBvb2wgQ2xpZW50XG4gICAgdGhpcy51c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KHRoaXMsICdNYXJrZXRwbGFjZVVzZXJQb29sQ2xpZW50Jywge1xuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgICB1c2VyUG9vbENsaWVudE5hbWU6ICdtYXJrZXRwbGFjZS13ZWItY2xpZW50JyxcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyU3JwOiB0cnVlLFxuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsIC8vIEVuYWJsZSBVU0VSX1BBU1NXT1JEX0FVVEhcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IHRydWUsIC8vIEVuYWJsZSBBRE1JTl9VU0VSX1BBU1NXT1JEX0FVVEhcbiAgICAgIH0sXG4gICAgICBvQXV0aDoge1xuICAgICAgICBmbG93czoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXG4gICAgICAgICAgaW1wbGljaXRDb2RlR3JhbnQ6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICBzY29wZXM6IFtcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuRU1BSUwsXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCxcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuUFJPRklMRSxcbiAgICAgICAgXSxcbiAgICAgICAgY2FsbGJhY2tVcmxzOiBbXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2NhbGxiYWNrJyxcbiAgICAgICAgICAnaHR0cHM6Ly9tYXJrZXRwbGFjZS5leGFtcGxlLmNvbS9hdXRoL2NhbGxiYWNrJywgLy8gVXBkYXRlIHdpdGggYWN0dWFsIGRvbWFpblxuICAgICAgICBdLFxuICAgICAgICBsb2dvdXRVcmxzOiBbXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgJ2h0dHBzOi8vbWFya2V0cGxhY2UuZXhhbXBsZS5jb20nLCAvLyBVcGRhdGUgd2l0aCBhY3R1YWwgZG9tYWluXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXG4gICAgICAvLyBDb25maWd1cmUgcmVhZC93cml0ZSBhdHRyaWJ1dGVzIGZvciBJRCB0b2tlblxuICAgICAgcmVhZEF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XG4gICAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICAgICAgZ2l2ZW5OYW1lOiB0cnVlLFxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXG4gICAgICAgIH0pXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcygncm9sZScsICdjb21wYW55JyksXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XG4gICAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICAgICAgZ2l2ZW5OYW1lOiB0cnVlLFxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXG4gICAgICAgIH0pXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcygncm9sZScsICdjb21wYW55JyksXG4gICAgfSlcblxuICAgIC8vIEFkZCBHb29nbGUgSWRlbnRpdHkgUHJvdmlkZXJcbiAgICBjb25zdCBnb29nbGVQcm92aWRlciA9IG5ldyBjb2duaXRvLlVzZXJQb29sSWRlbnRpdHlQcm92aWRlckdvb2dsZSh0aGlzLCAnR29vZ2xlUHJvdmlkZXInLCB7XG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICAgIGNsaWVudElkOiAnR09PR0xFX0NMSUVOVF9JRCcsIC8vIFJlcGxhY2Ugd2l0aCBhY3R1YWwgR29vZ2xlIE9BdXRoIGNsaWVudCBJRFxuICAgICAgY2xpZW50U2VjcmV0OiAnR09PR0xFX0NMSUVOVF9TRUNSRVQnLCAvLyBSZXBsYWNlIHdpdGggYWN0dWFsIEdvb2dsZSBPQXV0aCBjbGllbnQgc2VjcmV0XG4gICAgICBzY29wZXM6IFsnZW1haWwnLCAncHJvZmlsZScsICdvcGVuaWQnXSxcbiAgICAgIGF0dHJpYnV0ZU1hcHBpbmc6IHtcbiAgICAgICAgZW1haWw6IGNvZ25pdG8uUHJvdmlkZXJBdHRyaWJ1dGUuR09PR0xFX0VNQUlMLFxuICAgICAgICBnaXZlbk5hbWU6IGNvZ25pdG8uUHJvdmlkZXJBdHRyaWJ1dGUuR09PR0xFX0dJVkVOX05BTUUsXG4gICAgICAgIGZhbWlseU5hbWU6IGNvZ25pdG8uUHJvdmlkZXJBdHRyaWJ1dGUuR09PR0xFX0ZBTUlMWV9OQU1FLFxuICAgICAgICBwcm9maWxlUGljdHVyZTogY29nbml0by5Qcm92aWRlckF0dHJpYnV0ZS5HT09HTEVfUElDVFVSRSxcbiAgICAgIH0sXG4gICAgfSlcblxuICAgIC8vIENvbmZpZ3VyZSB0aGUgY2xpZW50IHRvIHVzZSB0aGUgaWRlbnRpdHkgcHJvdmlkZXJzXG4gICAgdGhpcy51c2VyUG9vbENsaWVudC5ub2RlLmFkZERlcGVuZGVuY3koZ29vZ2xlUHJvdmlkZXIpXG5cbiAgICAvLyBDcmVhdGUgVXNlciBQb29sIERvbWFpblxuICAgIGNvbnN0IHVzZXJQb29sRG9tYWluID0gbmV3IGNvZ25pdG8uVXNlclBvb2xEb21haW4odGhpcywgJ01hcmtldHBsYWNlVXNlclBvb2xEb21haW4nLCB7XG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICAgIGNvZ25pdG9Eb21haW46IHtcbiAgICAgICAgZG9tYWluUHJlZml4OiBgbWFya2V0cGxhY2UtJHtjZGsuQXdzLkFDQ09VTlRfSUR9YCwgLy8gTXVzdCBiZSBnbG9iYWxseSB1bmlxdWVcbiAgICAgIH0sXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBJZGVudGl0eSBQb29sIGZvciBBV1MgcmVzb3VyY2UgYWNjZXNzXG4gICAgdGhpcy5pZGVudGl0eVBvb2wgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2wodGhpcywgJ01hcmtldHBsYWNlSWRlbnRpdHlQb29sJywge1xuICAgICAgaWRlbnRpdHlQb29sTmFtZTogJ21hcmtldHBsYWNlLWlkZW50aXR5LXBvb2wnLFxuICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiBmYWxzZSxcbiAgICAgIGNvZ25pdG9JZGVudGl0eVByb3ZpZGVyczogW1xuICAgICAgICB7XG4gICAgICAgICAgY2xpZW50SWQ6IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgICBwcm92aWRlck5hbWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xQcm92aWRlck5hbWUsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pXG5cbiAgICAvLyBPdXRwdXQgdGhlIGhvc3RlZCBVSSBVUkxcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29nbml0b0hvc3RlZFVJVXJsJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7dXNlclBvb2xEb21haW4uZG9tYWluTmFtZX0uYXV0aC4ke2Nkay5Bd3MuUkVHSU9OfS5hbWF6b25jb2duaXRvLmNvbS9sb2dpbj9jbGllbnRfaWQ9JHt0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWR9JnJlc3BvbnNlX3R5cGU9Y29kZSZzY29wZT1lbWFpbCtvcGVuaWQrcHJvZmlsZSZyZWRpcmVjdF91cmk9aHR0cDovL2xvY2FsaG9zdDozMDAwL2F1dGgvY2FsbGJhY2tgLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIEhvc3RlZCBVSSBVUkwgZm9yIHRlc3RpbmcnLFxuICAgIH0pXG4gIH1cbn0iXX0=