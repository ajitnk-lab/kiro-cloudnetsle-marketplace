import * as cdk from 'aws-cdk-lib'
import * as ses from 'aws-cdk-lib/aws-ses'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as cr from 'aws-cdk-lib/custom-resources'
import { Construct } from 'constructs'

export interface EmailStackProps {
  fromEmail: string
  adminEmail: string
  replyToEmail?: string
}

export class EmailStack extends Construct {
  public readonly sesIdentityArn: string
  public readonly fromEmail: string

  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id)

    // Create SES Email Identity for the from email
    const fromEmailIdentity = new ses.EmailIdentity(this, 'FromEmailIdentity', {
      identity: ses.Identity.email(props.fromEmail),
      mailFromDomain: undefined, // Use default amazonses.com domain
    })

    // Create SES Email Identity for admin email (if different)
    if (props.adminEmail !== props.fromEmail) {
      new ses.EmailIdentity(this, 'AdminEmailIdentity', {
        identity: ses.Identity.email(props.adminEmail),
      })
    }

    // Create SES Email Identity for reply-to email (if provided and different)
    if (props.replyToEmail && props.replyToEmail !== props.fromEmail && props.replyToEmail !== props.adminEmail) {
      new ses.EmailIdentity(this, 'ReplyToEmailIdentity', {
        identity: ses.Identity.email(props.replyToEmail),
      })
    }

    // Create a configuration set for tracking
    const configurationSet = new ses.ConfigurationSet(this, 'MarketplaceConfigSet', {
      configurationSetName: 'marketplace-emails',
    })

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
    })

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
    }))

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
    })

    // Ensure the verification happens after the Lambda function is created
    emailVerificationResource.node.addDependency(verificationFunction)

    // Store values for use by other stacks
    this.sesIdentityArn = fromEmailIdentity.emailIdentityArn
    this.fromEmail = props.fromEmail

    // Output important information
    new cdk.CfnOutput(this, 'SESFromEmail', {
      value: props.fromEmail,
      description: 'SES verified from email address'
    })

    new cdk.CfnOutput(this, 'SESConfigurationSet', {
      value: configurationSet.configurationSetName,
      description: 'SES configuration set for email tracking'
    })

    new cdk.CfnOutput(this, 'EmailVerificationInstructions', {
      value: `Check your email (${props.fromEmail}) for AWS SES verification link and click it to complete verification`,
      description: 'Next steps for email verification'
    })
  }
}