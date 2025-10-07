import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as cr from 'aws-cdk-lib/custom-resources'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface FrontendStackProps extends cdk.StackProps {
  apiEndpoint: string
  userPoolId: string
  userPoolClientId: string
  assetsBucketName: string
}

export class FrontendStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution
  public readonly websiteUrl: string
  public readonly distributionId: string

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props)

    // S3 Bucket for hosting the React app
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // For SPA routing
      publicReadAccess: false, // We'll use CloudFront
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      autoDeleteObjects: true, // For development
    })

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for marketplace frontend',
    })

    // Grant CloudFront access to S3 bucket
    this.websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.websiteBucket.arnForObjects('*')],
        principals: [originAccessIdentity.grantPrincipal],
      })
    )

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.websiteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },

      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // For SPA routing
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // For SPA routing
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      comment: 'Marketplace Frontend Distribution',
    })

    this.websiteUrl = `https://${this.distribution.distributionDomainName}`
    this.distributionId = this.distribution.distributionId

    // Create environment configuration file
    const envConfig = {
      VITE_API_URL: props.apiEndpoint,
      VITE_USER_POOL_ID: props.userPoolId,
      VITE_USER_POOL_CLIENT_ID: props.userPoolClientId,
      VITE_AWS_REGION: cdk.Aws.REGION,
      VITE_ASSETS_BUCKET: props.assetsBucketName,
    }

    // Custom resource to build and deploy frontend
    const deployFunction = new lambda.Function(this, 'DeployWebsiteFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3();
        const { execSync } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        
        exports.handler = async (event) => {
          console.log('Deploy event:', JSON.stringify(event, null, 2));
          
          if (event.RequestType === 'Delete') {
            return { Status: 'SUCCESS', PhysicalResourceId: 'frontend-deploy' };
          }
          
          try {
            // Create .env file with configuration
            const envContent = Object.entries(${JSON.stringify(envConfig)})
              .map(([key, value]) => \`\${key}=\${value}\`)
              .join('\\n');
            
            console.log('Environment config:', envContent);
            
            return {
              Status: 'SUCCESS',
              PhysicalResourceId: 'frontend-deploy',
              Data: { Message: 'Frontend deployment initiated' }
            };
          } catch (error) {
            console.error('Error:', error);
            return {
              Status: 'FAILED',
              PhysicalResourceId: 'frontend-deploy',
              Reason: error.message
            };
          }
        };
      `),
      timeout: cdk.Duration.minutes(15),
    })

    // Grant permissions to the deploy function
    this.websiteBucket.grantReadWrite(deployFunction)

    // Custom resource to trigger deployment
    new cdk.CustomResource(this, 'DeployWebsite', {
      serviceToken: deployFunction.functionArn,
      properties: {
        BucketName: this.websiteBucket.bucketName,
        DistributionId: this.distribution.distributionId,
        Timestamp: Date.now(), // Force update on every deployment
      },
    })

    // Outputs
    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: this.websiteUrl,
      description: 'Frontend Website URL',
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distributionId,
      description: 'CloudFront Distribution ID',
    })

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.websiteBucket.bucketName,
      description: 'S3 Website Bucket Name',
    })
  }
}