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
exports.EmailStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ses = __importStar(require("aws-cdk-lib/aws-ses"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
class EmailStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create SES Email Identity for the from email
        const fromEmailIdentity = new ses.EmailIdentity(this, 'FromEmailIdentity', {
            identity: ses.Identity.email(props.fromEmail),
            mailFromDomain: undefined, // Use default amazonses.com domain
        });
        // Create SES Email Identity for admin email (if different)
        if (props.adminEmail !== props.fromEmail) {
            new ses.EmailIdentity(this, 'AdminEmailIdentity', {
                identity: ses.Identity.email(props.adminEmail),
            });
        }
        // Create SES Email Identity for reply-to email (if provided and different)
        if (props.replyToEmail && props.replyToEmail !== props.fromEmail && props.replyToEmail !== props.adminEmail) {
            new ses.EmailIdentity(this, 'ReplyToEmailIdentity', {
                identity: ses.Identity.email(props.replyToEmail),
            });
        }
        // Create a configuration set for tracking
        const configurationSet = new ses.ConfigurationSet(this, 'MarketplaceConfigSet', {
            configurationSetName: 'marketplace-emails',
        });
        // Lambda function to send verification emails automatically
        const verificationFunction = new lambda.Function(this, 'EmailVerificationFunction', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'email-verification.handler',
            code: lambda.Code.fromInline(`
        const { SESClient, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand } = require('@aws-sdk/client-ses');
        
        const ses = new SESClient({});
        
        exports.handler = async (event) => {
          console.log('Email verification event:', JSON.stringify(event, null, 2));
          
          const { RequestType, ResourceProperties } = event;
          const { EmailAddress } = ResourceProperties;
          
          try {
            if (RequestType === 'Create' || RequestType === 'Update') {
              // Check if email is already verified
              const getAttributesResponse = await ses.send(new GetIdentityVerificationAttributesCommand({
                Identities: [EmailAddress]
              }));
              
              const attributes = getAttributesResponse.VerificationAttributes[EmailAddress];
              
              if (!attributes || attributes.VerificationStatus !== 'Success') {
                console.log(\`Sending verification email to: \${EmailAddress}\`);
                
                // Send verification email
                await ses.send(new VerifyEmailIdentityCommand({
                  EmailAddress: EmailAddress
                }));
                
                console.log(\`Verification email sent to: \${EmailAddress}\`);
              } else {
                console.log(\`Email already verified: \${EmailAddress}\`);
              }
            }
            
            return {
              Status: 'SUCCESS',
              PhysicalResourceId: \`email-verification-\${EmailAddress}\`,
              Data: {
                EmailAddress: EmailAddress,
                Message: 'Verification email sent successfully'
              }
            };
          } catch (error) {
            console.error('Error:', error);
            return {
              Status: 'FAILED',
              PhysicalResourceId: \`email-verification-\${EmailAddress}\`,
              Reason: error.message
            };
          }
        };
      `),
            timeout: cdk.Duration.minutes(5),
        });
        // Grant SES permissions to the verification function
        verificationFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ses:VerifyEmailIdentity',
                'ses:GetIdentityVerificationAttributes',
                'ses:SendEmail',
                'ses:SendRawEmail'
            ],
            resources: ['*']
        }));
        // Custom resource to trigger email verification
        const emailVerificationResource = new cr.AwsCustomResource(this, 'EmailVerificationResource', {
            onCreate: {
                service: 'Lambda',
                action: 'invoke',
                parameters: {
                    FunctionName: verificationFunction.functionName,
                    Payload: JSON.stringify({
                        RequestType: 'Create',
                        ResourceProperties: {
                            EmailAddress: props.fromEmail
                        }
                    })
                },
                physicalResourceId: cr.PhysicalResourceId.of('email-verification-trigger')
            },
            policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
                resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
            })
        });
        // Ensure the verification happens after the Lambda function is created
        emailVerificationResource.node.addDependency(verificationFunction);
        // Store values for use by other stacks
        this.sesIdentityArn = fromEmailIdentity.emailIdentityArn;
        this.fromEmail = props.fromEmail;
        // Output important information
        new cdk.CfnOutput(this, 'SESFromEmail', {
            value: props.fromEmail,
            description: 'SES verified from email address'
        });
        new cdk.CfnOutput(this, 'SESConfigurationSet', {
            value: configurationSet.configurationSetName,
            description: 'SES configuration set for email tracking'
        });
        new cdk.CfnOutput(this, 'EmailVerificationInstructions', {
            value: `Check your email (${props.fromEmail}) for AWS SES verification link and click it to complete verification`,
            description: 'Next steps for email verification'
        });
    }
}
exports.EmailStack = EmailStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1haWwtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbWFpbC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFDbEMseURBQTBDO0FBQzFDLHlEQUEwQztBQUMxQywrREFBZ0Q7QUFDaEQsaUVBQWtEO0FBQ2xELDJDQUFzQztBQVF0QyxNQUFhLFVBQVcsU0FBUSxzQkFBUztJQUl2QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsK0NBQStDO1FBQy9DLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUN6RSxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUM3QyxjQUFjLEVBQUUsU0FBUyxFQUFFLG1DQUFtQztTQUMvRCxDQUFDLENBQUE7UUFFRiwyREFBMkQ7UUFDM0QsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO2dCQUNoRCxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQzthQUMvQyxDQUFDLENBQUE7UUFDSixDQUFDO1FBRUQsMkVBQTJFO1FBQzNFLElBQUksS0FBSyxDQUFDLFlBQVksSUFBSSxLQUFLLENBQUMsWUFBWSxLQUFLLEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLFlBQVksS0FBSyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDNUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUks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SyxFQUFFLHFCQUFxQixLQUFLLENBQUMsU0FBUyx1RUFBdUU7WUFDbEgsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUFuSkQsZ0NBbUpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xyXG5pbXBvcnQgKiBhcyBzZXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlcydcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nXHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJ1xyXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJ1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbWFpbFN0YWNrUHJvcHMge1xyXG4gIGZyb21FbWFpbDogc3RyaW5nXHJcbiAgYWRtaW5FbWFpbDogc3RyaW5nXHJcbiAgcmVwbHlUb0VtYWlsPzogc3RyaW5nXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBFbWFpbFN0YWNrIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgc2VzSWRlbnRpdHlBcm46IHN0cmluZ1xyXG4gIHB1YmxpYyByZWFkb25seSBmcm9tRW1haWw6IHN0cmluZ1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRW1haWxTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpXHJcblxyXG4gICAgLy8gQ3JlYXRlIFNFUyBFbWFpbCBJZGVudGl0eSBmb3IgdGhlIGZyb20gZW1haWxcclxuICAgIGNvbnN0IGZyb21FbWFpbElkZW50aXR5ID0gbmV3IHNlcy5FbWFpbElkZW50aXR5KHRoaXMsICdGcm9tRW1haWxJZGVudGl0eScsIHtcclxuICAgICAgaWRlbnRpdHk6IHNlcy5JZGVudGl0eS5lbWFpbChwcm9wcy5mcm9tRW1haWwpLFxyXG4gICAgICBtYWlsRnJvbURvbWFpbjogdW5kZWZpbmVkLCAvLyBVc2UgZGVmYXVsdCBhbWF6b25zZXMuY29tIGRvbWFpblxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBDcmVhdGUgU0VTIEVtYWlsIElkZW50aXR5IGZvciBhZG1pbiBlbWFpbCAoaWYgZGlmZmVyZW50KVxyXG4gICAgaWYgKHByb3BzLmFkbWluRW1haWwgIT09IHByb3BzLmZyb21FbWFpbCkge1xyXG4gICAgICBuZXcgc2VzLkVtYWlsSWRlbnRpdHkodGhpcywgJ0FkbWluRW1haWxJZGVudGl0eScsIHtcclxuICAgICAgICBpZGVudGl0eTogc2VzLklkZW50aXR5LmVtYWlsKHByb3BzLmFkbWluRW1haWwpLFxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBTRVMgRW1haWwgSWRlbnRpdHkgZm9yIHJlcGx5LXRvIGVtYWlsIChpZiBwcm92aWRlZCBhbmQgZGlmZmVyZW50KVxyXG4gICAgaWYgKHByb3BzLnJlcGx5VG9FbWFpbCAmJiBwcm9wcy5yZXBseVRvRW1haWwgIT09IHByb3BzLmZyb21FbWFpbCAmJiBwcm9wcy5yZXBseVRvRW1haWwgIT09IHByb3BzLmFkbWluRW1haWwpIHtcclxuICAgICAgbmV3IHNlcy5FbWFpbElkZW50aXR5KHRoaXMsICdSZXBseVRvRW1haWxJZGVudGl0eScsIHtcclxuICAgICAgICBpZGVudGl0eTogc2VzLklkZW50aXR5LmVtYWlsKHByb3BzLnJlcGx5VG9FbWFpbCksXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgY29uZmlndXJhdGlvbiBzZXQgZm9yIHRyYWNraW5nXHJcbiAgICBjb25zdCBjb25maWd1cmF0aW9uU2V0ID0gbmV3IHNlcy5Db25maWd1cmF0aW9uU2V0KHRoaXMsICdNYXJrZXRwbGFjZUNvbmZpZ1NldCcsIHtcclxuICAgICAgY29uZmlndXJhdGlvblNldE5hbWU6ICdtYXJrZXRwbGFjZS1lbWFpbHMnLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gdG8gc2VuZCB2ZXJpZmljYXRpb24gZW1haWxzIGF1dG9tYXRpY2FsbHlcclxuICAgIGNvbnN0IHZlcmlmaWNhdGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRW1haWxWZXJpZmljYXRpb25GdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGhhbmRsZXI6ICdlbWFpbC12ZXJpZmljYXRpb24uaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxyXG4gICAgICAgIGNvbnN0IHsgU0VTQ2xpZW50LCBHZXRJZGVudGl0eVZlcmlmaWNhdGlvbkF0dHJpYnV0ZXNDb21tYW5kLCBWZXJpZnlFbWFpbElkZW50aXR5Q29tbWFuZCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvY2xpZW50LXNlcycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHNlcyA9IG5ldyBTRVNDbGllbnQoe30pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGV4cG9ydHMuaGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ0VtYWlsIHZlcmlmaWNhdGlvbiBldmVudDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb25zdCB7IFJlcXVlc3RUeXBlLCBSZXNvdXJjZVByb3BlcnRpZXMgfSA9IGV2ZW50O1xyXG4gICAgICAgICAgY29uc3QgeyBFbWFpbEFkZHJlc3MgfSA9IFJlc291cmNlUHJvcGVydGllcztcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKFJlcXVlc3RUeXBlID09PSAnQ3JlYXRlJyB8fCBSZXF1ZXN0VHlwZSA9PT0gJ1VwZGF0ZScpIHtcclxuICAgICAgICAgICAgICAvLyBDaGVjayBpZiBlbWFpbCBpcyBhbHJlYWR5IHZlcmlmaWVkXHJcbiAgICAgICAgICAgICAgY29uc3QgZ2V0QXR0cmlidXRlc1Jlc3BvbnNlID0gYXdhaXQgc2VzLnNlbmQobmV3IEdldElkZW50aXR5VmVyaWZpY2F0aW9uQXR0cmlidXRlc0NvbW1hbmQoe1xyXG4gICAgICAgICAgICAgICAgSWRlbnRpdGllczogW0VtYWlsQWRkcmVzc11cclxuICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlcyA9IGdldEF0dHJpYnV0ZXNSZXNwb25zZS5WZXJpZmljYXRpb25BdHRyaWJ1dGVzW0VtYWlsQWRkcmVzc107XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgaWYgKCFhdHRyaWJ1dGVzIHx8IGF0dHJpYnV0ZXMuVmVyaWZpY2F0aW9uU3RhdHVzICE9PSAnU3VjY2VzcycpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxcYFNlbmRpbmcgdmVyaWZpY2F0aW9uIGVtYWlsIHRvOiBcXCR7RW1haWxBZGRyZXNzfVxcYCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFNlbmQgdmVyaWZpY2F0aW9uIGVtYWlsXHJcbiAgICAgICAgICAgICAgICBhd2FpdCBzZXMuc2VuZChuZXcgVmVyaWZ5RW1haWxJZGVudGl0eUNvbW1hbmQoe1xyXG4gICAgICAgICAgICAgICAgICBFbWFpbEFkZHJlc3M6IEVtYWlsQWRkcmVzc1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcXGBWZXJpZmljYXRpb24gZW1haWwgc2VudCB0bzogXFwke0VtYWlsQWRkcmVzc31cXGApO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcXGBFbWFpbCBhbHJlYWR5IHZlcmlmaWVkOiBcXCR7RW1haWxBZGRyZXNzfVxcYCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgIFN0YXR1czogJ1NVQ0NFU1MnLFxyXG4gICAgICAgICAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogXFxgZW1haWwtdmVyaWZpY2F0aW9uLVxcJHtFbWFpbEFkZHJlc3N9XFxgLFxyXG4gICAgICAgICAgICAgIERhdGE6IHtcclxuICAgICAgICAgICAgICAgIEVtYWlsQWRkcmVzczogRW1haWxBZGRyZXNzLFxyXG4gICAgICAgICAgICAgICAgTWVzc2FnZTogJ1ZlcmlmaWNhdGlvbiBlbWFpbCBzZW50IHN1Y2Nlc3NmdWxseSdcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgU3RhdHVzOiAnRkFJTEVEJyxcclxuICAgICAgICAgICAgICBQaHlzaWNhbFJlc291cmNlSWQ6IFxcYGVtYWlsLXZlcmlmaWNhdGlvbi1cXCR7RW1haWxBZGRyZXNzfVxcYCxcclxuICAgICAgICAgICAgICBSZWFzb246IGVycm9yLm1lc3NhZ2VcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICBgKSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEdyYW50IFNFUyBwZXJtaXNzaW9ucyB0byB0aGUgdmVyaWZpY2F0aW9uIGZ1bmN0aW9uXHJcbiAgICB2ZXJpZmljYXRpb25GdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnc2VzOlZlcmlmeUVtYWlsSWRlbnRpdHknLFxyXG4gICAgICAgICdzZXM6R2V0SWRlbnRpdHlWZXJpZmljYXRpb25BdHRyaWJ1dGVzJyxcclxuICAgICAgICAnc2VzOlNlbmRFbWFpbCcsXHJcbiAgICAgICAgJ3NlczpTZW5kUmF3RW1haWwnXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ11cclxuICAgIH0pKVxyXG5cclxuICAgIC8vIEN1c3RvbSByZXNvdXJjZSB0byB0cmlnZ2VyIGVtYWlsIHZlcmlmaWNhdGlvblxyXG4gICAgY29uc3QgZW1haWxWZXJpZmljYXRpb25SZXNvdXJjZSA9IG5ldyBjci5Bd3NDdXN0b21SZXNvdXJjZSh0aGlzLCAnRW1haWxWZXJpZmljYXRpb25SZXNvdXJjZScsIHtcclxuICAgICAgb25DcmVhdGU6IHtcclxuICAgICAgICBzZXJ2aWNlOiAnTGFtYmRhJyxcclxuICAgICAgICBhY3Rpb246ICdpbnZva2UnLFxyXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgIEZ1bmN0aW9uTmFtZTogdmVyaWZpY2F0aW9uRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICAgICAgUGF5bG9hZDogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBSZXF1ZXN0VHlwZTogJ0NyZWF0ZScsXHJcbiAgICAgICAgICAgIFJlc291cmNlUHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgIEVtYWlsQWRkcmVzczogcHJvcHMuZnJvbUVtYWlsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwaHlzaWNhbFJlc291cmNlSWQ6IGNyLlBoeXNpY2FsUmVzb3VyY2VJZC5vZignZW1haWwtdmVyaWZpY2F0aW9uLXRyaWdnZXInKVxyXG4gICAgICB9LFxyXG4gICAgICBwb2xpY3k6IGNyLkF3c0N1c3RvbVJlc291cmNlUG9saWN5LmZyb21TZGtDYWxscyh7XHJcbiAgICAgICAgcmVzb3VyY2VzOiBjci5Bd3NDdXN0b21SZXNvdXJjZVBvbGljeS5BTllfUkVTT1VSQ0VcclxuICAgICAgfSlcclxuICAgIH0pXHJcblxyXG4gICAgLy8gRW5zdXJlIHRoZSB2ZXJpZmljYXRpb24gaGFwcGVucyBhZnRlciB0aGUgTGFtYmRhIGZ1bmN0aW9uIGlzIGNyZWF0ZWRcclxuICAgIGVtYWlsVmVyaWZpY2F0aW9uUmVzb3VyY2Uubm9kZS5hZGREZXBlbmRlbmN5KHZlcmlmaWNhdGlvbkZ1bmN0aW9uKVxyXG5cclxuICAgIC8vIFN0b3JlIHZhbHVlcyBmb3IgdXNlIGJ5IG90aGVyIHN0YWNrc1xyXG4gICAgdGhpcy5zZXNJZGVudGl0eUFybiA9IGZyb21FbWFpbElkZW50aXR5LmVtYWlsSWRlbnRpdHlBcm5cclxuICAgIHRoaXMuZnJvbUVtYWlsID0gcHJvcHMuZnJvbUVtYWlsXHJcblxyXG4gICAgLy8gT3V0cHV0IGltcG9ydGFudCBpbmZvcm1hdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NFU0Zyb21FbWFpbCcsIHtcclxuICAgICAgdmFsdWU6IHByb3BzLmZyb21FbWFpbCxcclxuICAgICAgZGVzY3JpcHRpb246ICdTRVMgdmVyaWZpZWQgZnJvbSBlbWFpbCBhZGRyZXNzJ1xyXG4gICAgfSlcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU0VTQ29uZmlndXJhdGlvblNldCcsIHtcclxuICAgICAgdmFsdWU6IGNvbmZpZ3VyYXRpb25TZXQuY29uZmlndXJhdGlvblNldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU0VTIGNvbmZpZ3VyYXRpb24gc2V0IGZvciBlbWFpbCB0cmFja2luZydcclxuICAgIH0pXHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VtYWlsVmVyaWZpY2F0aW9uSW5zdHJ1Y3Rpb25zJywge1xyXG4gICAgICB2YWx1ZTogYENoZWNrIHlvdXIgZW1haWwgKCR7cHJvcHMuZnJvbUVtYWlsfSkgZm9yIEFXUyBTRVMgdmVyaWZpY2F0aW9uIGxpbmsgYW5kIGNsaWNrIGl0IHRvIGNvbXBsZXRlIHZlcmlmaWNhdGlvbmAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTmV4dCBzdGVwcyBmb3IgZW1haWwgdmVyaWZpY2F0aW9uJ1xyXG4gICAgfSlcclxuICB9XHJcbn0iXX0=