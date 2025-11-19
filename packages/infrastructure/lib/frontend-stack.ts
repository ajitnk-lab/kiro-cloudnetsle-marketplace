import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export class FrontendStack extends Construct {
  public readonly websiteBucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution
  public readonly websiteUrl: string

  constructor(scope: Construct, id: string) {
    super(scope, id)

    // S3 Bucket for hosting the React app
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `marketplace-frontend-${Date.now()}`,
      publicReadAccess: false, // We'll use CloudFront OAI
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

    // Origin Request Policy for geographic headers
    const geoOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'GeoOriginRequestPolicy', {
      originRequestPolicyName: `marketplace-geo-policy-${Date.now()}`,
      comment: 'Policy to forward geographic headers for location tracking',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
        'CloudFront-Viewer-Country',
        'CloudFront-Viewer-Country-Name',
        'CloudFront-Viewer-City',
        'CloudFront-Viewer-Time-Zone',
        'User-Agent'
      ),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
    })

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.websiteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: geoOriginRequestPolicy, // Add geographic headers
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin('api.marketplace.com'), // This will be updated with actual API Gateway domain
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: geoOriginRequestPolicy, // Use same policy for API calls
        },
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

    // Deploy the frontend build to S3 (this will be done manually or via CI/CD)
    // Deploy frontend build to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../frontend/dist')],
      destinationBucket: this.websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    })
  }
}