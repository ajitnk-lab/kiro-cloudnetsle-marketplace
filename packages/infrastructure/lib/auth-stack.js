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
                SUBSCRIPTION_HISTORY_TABLE: props.subscriptionHistoryTableName,
                TOKEN_SECRET: props.tokenSecret,
            },
        });
        // Create Cognito User Pool
        this.userPool = new cognito.UserPool(this, 'MarketplaceUserPool', {
            userPoolName: 'marketplace-users-v2',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQWtDO0FBQ2xDLGlFQUFrRDtBQUNsRCwrREFBZ0Q7QUFDaEQsMkNBQXNDO0FBRXRDLE1BQWEsU0FBVSxTQUFRLHNCQUFTO0lBTXRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FLekM7UUFDQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLDJDQUEyQztRQUMzQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNwRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSwyQkFBMkI7WUFDcEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQztZQUMxQyxXQUFXLEVBQUU7Z0JBQ1gsZUFBZSxFQUFFLEtBQUssQ0FBQyxhQUFhO2dCQUNwQyxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsaUNBQWlDO2dCQUN6RSwwQkFBMEIsRUFBRSxLQUFLLENBQUMsNEJBQTRCO2dCQUM5RCxZQUFZLEVBQUUsS0FBSyxDQUFDLFdBQVc7YUFDaEM7U0FDRixDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ2hFLFlBQVksRUFBRSxzQkFBc0I7WUFDcEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUSxFQUFFLEtBQUs7YUFDaEI7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFF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WUFDdkIsYUFBYSxFQUFFO2dCQUNiLFlBQVksRUFBRSxlQUFlLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEVBQUUsMEJBQTBCO2FBQzlFO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUMvRSxnQkFBZ0IsRUFBRSwyQkFBMkI7WUFDN0MsOEJBQThCLEVBQUUsS0FBSztZQUNyQyx3QkFBd0IsRUFBRTtnQkFDeEI7b0JBQ0UsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO29CQUM5QyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0I7aUJBQ2pEO2FBQ0Y7U0FDRixDQUFDLENBQUE7UUFFRiwyQkFBMkI7UUFDM0IsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsV0FBVyxjQUFjLENBQUMsVUFBVSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxzQ0FBc0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsaUdBQWlHO1lBQzdPLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBaExELDhCQWdMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSdcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXG5cbmV4cG9ydCBjbGFzcyBBdXRoU3RhY2sgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2xcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50XG4gIHB1YmxpYyByZWFkb25seSBpZGVudGl0eVBvb2w6IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sXG4gIHB1YmxpYyByZWFkb25seSBwb3N0Q29uZmlybWF0aW9uRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvblxuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiB7IFxuICAgIHVzZXJUYWJsZU5hbWU6IHN0cmluZ1xuICAgIHVzZXJTb2x1dGlvbkVudGl0bGVtZW50c1RhYmxlTmFtZTogc3RyaW5nXG4gICAgc3Vic2NyaXB0aW9uSGlzdG9yeVRhYmxlTmFtZTogc3RyaW5nXG4gICAgdG9rZW5TZWNyZXQ6IHN0cmluZ1xuICB9KSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKVxuXG4gICAgLy8gQ3JlYXRlIHBvc3QtY29uZmlybWF0aW9uIExhbWJkYSBmdW5jdGlvblxuICAgIHRoaXMucG9zdENvbmZpcm1hdGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUG9zdENvbmZpcm1hdGlvbkZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAncG9zdC1jb25maXJtYXRpb24uaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2xhbWJkYS9hdXRoJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSX1RBQkxFX05BTUU6IHByb3BzLnVzZXJUYWJsZU5hbWUsXG4gICAgICAgIFVTRVJfU09MVVRJT05fRU5USVRMRU1FTlRTX1RBQkxFOiBwcm9wcy51c2VyU29sdXRpb25FbnRpdGxlbWVudHNUYWJsZU5hbWUsXG4gICAgICAgIFNVQlNDUklQVElPTl9ISVNUT1JZX1RBQkxFOiBwcm9wcy5zdWJzY3JpcHRpb25IaXN0b3J5VGFibGVOYW1lLFxuICAgICAgICBUT0tFTl9TRUNSRVQ6IHByb3BzLnRva2VuU2VjcmV0LFxuICAgICAgfSxcbiAgICB9KVxuXG4gICAgLy8gQ3JlYXRlIENvZ25pdG8gVXNlciBQb29sXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdNYXJrZXRwbGFjZVVzZXJQb29sJywge1xuICAgICAgdXNlclBvb2xOYW1lOiAnbWFya2V0cGxhY2UtdXNlcnMtdjInLFxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgICB1c2VybmFtZTogZmFsc2UsXG4gICAgICB9LFxuICAgICAgYXV0b1ZlcmlmeToge1xuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBsYW1iZGFUcmlnZ2Vyczoge1xuICAgICAgICBwb3N0Q29uZmlybWF0aW9uOiB0aGlzLnBvc3RDb25maXJtYXRpb25GdW5jdGlvbixcbiAgICAgIH0sXG4gICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcbiAgICAgICAgZW1haWw6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBnaXZlbk5hbWU6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBmYW1pbHlOYW1lOiB7XG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XG4gICAgICAgIHJvbGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XG4gICAgICAgICAgbWluTGVuOiAxLFxuICAgICAgICAgIG1heExlbjogMjAsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgICAgIGNvbXBhbnk6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7XG4gICAgICAgICAgbWluTGVuOiAwLFxuICAgICAgICAgIG1heExlbjogMTAwLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0pLFxuICAgICAgICBwYXJ0bmVyU3RhdHVzOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoe1xuICAgICAgICAgIG1pbkxlbjogMCxcbiAgICAgICAgICBtYXhMZW46IDIwLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICAgIHBhc3N3b3JkUG9saWN5OiB7XG4gICAgICAgIG1pbkxlbmd0aDogOCxcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IHRydWUsXG4gICAgICB9LFxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgVXNlciBQb29sIENsaWVudFxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnTWFya2V0cGxhY2VVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgICAgdXNlclBvb2xDbGllbnROYW1lOiAnbWFya2V0cGxhY2Utd2ViLWNsaWVudCcsXG4gICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXG4gICAgICBhdXRoRmxvd3M6IHtcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLCAvLyBFbmFibGUgVVNFUl9QQVNTV09SRF9BVVRIXG4gICAgICAgIGFkbWluVXNlclBhc3N3b3JkOiB0cnVlLCAvLyBFbmFibGUgQURNSU5fVVNFUl9QQVNTV09SRF9BVVRIXG4gICAgICB9LFxuICAgICAgb0F1dGg6IHtcbiAgICAgICAgZmxvd3M6IHtcbiAgICAgICAgICBhdXRob3JpemF0aW9uQ29kZUdyYW50OiB0cnVlLFxuICAgICAgICAgIGltcGxpY2l0Q29kZUdyYW50OiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGVzOiBbXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLFxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5PUEVOSUQsXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEUsXG4gICAgICAgIF0sXG4gICAgICAgIGNhbGxiYWNrVXJsczogW1xuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXV0aC9jYWxsYmFjaycsXG4gICAgICAgICAgJ2h0dHBzOi8vbWFya2V0cGxhY2UuZXhhbXBsZS5jb20vYXV0aC9jYWxsYmFjaycsIC8vIFVwZGF0ZSB3aXRoIGFjdHVhbCBkb21haW5cbiAgICAgICAgXSxcbiAgICAgICAgbG9nb3V0VXJsczogW1xuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgICdodHRwczovL21hcmtldHBsYWNlLmV4YW1wbGUuY29tJywgLy8gVXBkYXRlIHdpdGggYWN0dWFsIGRvbWFpblxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxuICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcbiAgICAgIGFjY2Vzc1Rva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgLy8gQ29uZmlndXJlIHJlYWQvd3JpdGUgYXR0cmlidXRlcyBmb3IgSUQgdG9rZW5cbiAgICAgIHJlYWRBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xuICAgICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcbiAgICAgICAgICBmYW1pbHlOYW1lOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ3JvbGUnLCAnY29tcGFueScpLFxuICAgICAgd3JpdGVBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xuICAgICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcbiAgICAgICAgICBmYW1pbHlOYW1lOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ3JvbGUnLCAnY29tcGFueScpLFxuICAgIH0pXG5cbiAgICAvLyBBZGQgR29vZ2xlIElkZW50aXR5IFByb3ZpZGVyXG4gICAgY29uc3QgZ29vZ2xlUHJvdmlkZXIgPSBuZXcgY29nbml0by5Vc2VyUG9vbElkZW50aXR5UHJvdmlkZXJHb29nbGUodGhpcywgJ0dvb2dsZVByb3ZpZGVyJywge1xuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgICBjbGllbnRJZDogJ0dPT0dMRV9DTElFTlRfSUQnLCAvLyBSZXBsYWNlIHdpdGggYWN0dWFsIEdvb2dsZSBPQXV0aCBjbGllbnQgSURcbiAgICAgIGNsaWVudFNlY3JldDogJ0dPT0dMRV9DTElFTlRfU0VDUkVUJywgLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCBHb29nbGUgT0F1dGggY2xpZW50IHNlY3JldFxuICAgICAgc2NvcGVzOiBbJ2VtYWlsJywgJ3Byb2ZpbGUnLCAnb3BlbmlkJ10sXG4gICAgICBhdHRyaWJ1dGVNYXBwaW5nOiB7XG4gICAgICAgIGVtYWlsOiBjb2duaXRvLlByb3ZpZGVyQXR0cmlidXRlLkdPT0dMRV9FTUFJTCxcbiAgICAgICAgZ2l2ZW5OYW1lOiBjb2duaXRvLlByb3ZpZGVyQXR0cmlidXRlLkdPT0dMRV9HSVZFTl9OQU1FLFxuICAgICAgICBmYW1pbHlOYW1lOiBjb2duaXRvLlByb3ZpZGVyQXR0cmlidXRlLkdPT0dMRV9GQU1JTFlfTkFNRSxcbiAgICAgICAgcHJvZmlsZVBpY3R1cmU6IGNvZ25pdG8uUHJvdmlkZXJBdHRyaWJ1dGUuR09PR0xFX1BJQ1RVUkUsXG4gICAgICB9LFxuICAgIH0pXG5cbiAgICAvLyBDb25maWd1cmUgdGhlIGNsaWVudCB0byB1c2UgdGhlIGlkZW50aXR5IHByb3ZpZGVyc1xuICAgIHRoaXMudXNlclBvb2xDbGllbnQubm9kZS5hZGREZXBlbmRlbmN5KGdvb2dsZVByb3ZpZGVyKVxuXG4gICAgLy8gQ3JlYXRlIFVzZXIgUG9vbCBEb21haW5cbiAgICBjb25zdCB1c2VyUG9vbERvbWFpbiA9IG5ldyBjb2duaXRvLlVzZXJQb29sRG9tYWluKHRoaXMsICdNYXJrZXRwbGFjZVVzZXJQb29sRG9tYWluJywge1xuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgICBjb2duaXRvRG9tYWluOiB7XG4gICAgICAgIGRvbWFpblByZWZpeDogYG1hcmtldHBsYWNlLSR7Y2RrLkF3cy5BQ0NPVU5UX0lEfWAsIC8vIE11c3QgYmUgZ2xvYmFsbHkgdW5pcXVlXG4gICAgICB9LFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgSWRlbnRpdHkgUG9vbCBmb3IgQVdTIHJlc291cmNlIGFjY2Vzc1xuICAgIHRoaXMuaWRlbnRpdHlQb29sID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKHRoaXMsICdNYXJrZXRwbGFjZUlkZW50aXR5UG9vbCcsIHtcbiAgICAgIGlkZW50aXR5UG9vbE5hbWU6ICdtYXJrZXRwbGFjZS1pZGVudGl0eS1wb29sJyxcbiAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXG4gICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNsaWVudElkOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KVxuXG4gICAgLy8gT3V0cHV0IHRoZSBob3N0ZWQgVUkgVVJMXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvZ25pdG9Ib3N0ZWRVSVVybCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3VzZXJQb29sRG9tYWluLmRvbWFpbk5hbWV9LmF1dGguJHtjZGsuQXdzLlJFR0lPTn0uYW1hem9uY29nbml0by5jb20vbG9naW4/Y2xpZW50X2lkPSR7dGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkfSZyZXNwb25zZV90eXBlPWNvZGUmc2NvcGU9ZW1haWwrb3BlbmlkK3Byb2ZpbGUmcmVkaXJlY3RfdXJpPWh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2NhbGxiYWNrYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBIb3N0ZWQgVUkgVVJMIGZvciB0ZXN0aW5nJyxcbiAgICB9KVxuICB9XG59Il19