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
exports.FrontendStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const constructs_1 = require("constructs");
class FrontendStack extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        // S3 Bucket for hosting the React app
        this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
            bucketName: `marketplace-frontend-${Date.now()}`,
            publicReadAccess: false, // We'll use CloudFront OAI
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
            autoDeleteObjects: true, // For development
        });
        // Origin Access Identity for CloudFront
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
            comment: 'OAI for marketplace frontend',
        });
        // Grant CloudFront access to S3 bucket
        this.websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [this.websiteBucket.arnForObjects('*')],
            principals: [originAccessIdentity.grantPrincipal],
        }));
        // Origin Request Policy for geographic headers
        const geoOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'GeoOriginRequestPolicy', {
            originRequestPolicyName: `marketplace-geo-policy-${Date.now()}`,
            comment: 'Policy to forward geographic headers for location tracking',
            headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('CloudFront-Viewer-Country', 'CloudFront-Viewer-Country-Name', 'CloudFront-Viewer-City', 'CloudFront-Viewer-Time-Zone', 'User-Agent'),
            queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
            cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
        });
        // Import existing SSL certificate for marketplace.cloudnestle.com
        const certificate = acm.Certificate.fromCertificateArn(this, 'MarketplaceCertificate', 'arn:aws:acm:us-east-1:637423202175:certificate/a60be722-3639-412d-80d9-c6b8e13199f8');
        // CloudFront Distribution
        this.distribution = new cloudfront.Distribution(this, 'Distribution', {
            domainNames: ['marketplace.cloudnestle.com'],
            certificate: certificate,
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
            // additionalBehaviors: {
            //   '/api/*': {
            //     origin: new origins.HttpOrigin('api.marketplace.com'), // This will be updated with actual API Gateway domain
            //     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            //     allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            //     cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            //     originRequestPolicy: geoOriginRequestPolicy, // Use same policy for API calls
            //   },
            // },
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
        });
        this.websiteUrl = `https://${this.distribution.distributionDomainName}`;
        // Deploy the frontend build to S3 (this will be done manually or via CI/CD)
        // Deploy frontend build to S3
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset('../frontend/dist')],
            destinationBucket: this.websiteBucket,
            distribution: this.distribution,
            distributionPaths: ['/*'],
        });
    }
}
exports.FrontendStack = FrontendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRlbmQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmcm9udGVuZC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFDbEMsdURBQXdDO0FBQ3hDLHVFQUF3RDtBQUN4RCw0RUFBNkQ7QUFDN0Qsd0VBQXlEO0FBQ3pELHlEQUEwQztBQUMxQyx3RUFBeUQ7QUFDekQsMkNBQXNDO0FBRXRDLE1BQWEsYUFBYyxTQUFRLHNCQUFTO0lBSzFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDeEQsVUFBVSxFQUFFLHdCQUF3QixJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDaEQsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLDJCQUEyQjtZQUNwRCxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCO1lBQzVELGlCQUFpQixFQUFFLElBQUksRUFBRSxrQkFBa0I7U0FDNUMsQ0FBQyxDQUFBO1FBRUYsd0NBQXdDO1FBQ3hDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUM1RSxPQUFPLEVBQUUsOEJBQThCO1NBQ3hDLENBQUMsQ0FBQTtRQUVGLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUNwQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDO1lBQ3pCLFNBQVMs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QUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNwRCxpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNyQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUM7U0FDMUIsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBM0dELHNDQTJHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYidcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMydcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnXG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnXG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCdcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJ1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xuXG5leHBvcnQgY2xhc3MgRnJvbnRlbmRTdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSB3ZWJzaXRlQnVja2V0OiBzMy5CdWNrZXRcbiAgcHVibGljIHJlYWRvbmx5IGRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb25cbiAgcHVibGljIHJlYWRvbmx5IHdlYnNpdGVVcmw6IHN0cmluZ1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpXG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIGhvc3RpbmcgdGhlIFJlYWN0IGFwcFxuICAgIHRoaXMud2Vic2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1dlYnNpdGVCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgbWFya2V0cGxhY2UtZnJvbnRlbmQtJHtEYXRlLm5vdygpfWAsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSwgLy8gV2UnbGwgdXNlIENsb3VkRnJvbnQgT0FJXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSwgLy8gRm9yIGRldmVsb3BtZW50XG4gICAgfSlcblxuICAgIC8vIE9yaWdpbiBBY2Nlc3MgSWRlbnRpdHkgZm9yIENsb3VkRnJvbnRcbiAgICBjb25zdCBvcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG5ldyBjbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsICdPQUknLCB7XG4gICAgICBjb21tZW50OiAnT0FJIGZvciBtYXJrZXRwbGFjZSBmcm9udGVuZCcsXG4gICAgfSlcblxuICAgIC8vIEdyYW50IENsb3VkRnJvbnQgYWNjZXNzIHRvIFMzIGJ1Y2tldFxuICAgIHRoaXMud2Vic2l0ZUJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgICByZXNvdXJjZXM6IFt0aGlzLndlYnNpdGVCdWNrZXQuYXJuRm9yT2JqZWN0cygnKicpXSxcbiAgICAgICAgcHJpbmNpcGFsczogW29yaWdpbkFjY2Vzc0lkZW50aXR5LmdyYW50UHJpbmNpcGFsXSxcbiAgICAgIH0pXG4gICAgKVxuXG4gICAgLy8gT3JpZ2luIFJlcXVlc3QgUG9saWN5IGZvciBnZW9ncmFwaGljIGhlYWRlcnNcbiAgICBjb25zdCBnZW9PcmlnaW5SZXF1ZXN0UG9saWN5ID0gbmV3IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeSh0aGlzLCAnR2VvT3JpZ2luUmVxdWVzdFBvbGljeScsIHtcbiAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3lOYW1lOiBgbWFya2V0cGxhY2UtZ2VvLXBvbGljeS0ke0RhdGUubm93KCl9YCxcbiAgICAgIGNvbW1lbnQ6ICdQb2xpY3kgdG8gZm9yd2FyZCBnZW9ncmFwaGljIGhlYWRlcnMgZm9yIGxvY2F0aW9uIHRyYWNraW5nJyxcbiAgICAgIGhlYWRlckJlaGF2aW9yOiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RIZWFkZXJCZWhhdmlvci5hbGxvd0xpc3QoXG4gICAgICAgICdDbG91ZEZyb250LVZpZXdlci1Db3VudHJ5JyxcbiAgICAgICAgJ0Nsb3VkRnJvbnQtVmlld2VyLUNvdW50cnktTmFtZScsXG4gICAgICAgICdDbG91ZEZyb250LVZpZXdlci1DaXR5JyxcbiAgICAgICAgJ0Nsb3VkRnJvbnQtVmlld2VyLVRpbWUtWm9uZScsXG4gICAgICAgICdVc2VyLUFnZW50J1xuICAgICAgKSxcbiAgICAgIHF1ZXJ5U3RyaW5nQmVoYXZpb3I6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFF1ZXJ5U3RyaW5nQmVoYXZpb3IuYWxsKCksXG4gICAgICBjb29raWVCZWhhdmlvcjogY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0Q29va2llQmVoYXZpb3Iubm9uZSgpLFxuICAgIH0pXG5cbiAgICAvLyBJbXBvcnQgZXhpc3RpbmcgU1NMIGNlcnRpZmljYXRlIGZvciBtYXJrZXRwbGFjZS5jbG91ZG5lc3RsZS5jb21cbiAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IGFjbS5DZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oXG4gICAgICB0aGlzLFxuICAgICAgJ01hcmtldHBsYWNlQ2VydGlmaWNhdGUnLFxuICAgICAgJ2Fybjphd3M6YWNtOnVzLWVhc3QtMTo2Mzc0MjMyMDIxNzU6Y2VydGlmaWNhdGUvYTYwYmU3MjItMzYzOS00MTJkLTgwZDktYzZiOGUxMzE5OWY4J1xuICAgIClcblxuICAgIC8vIENsb3VkRnJvbnQgRGlzdHJpYnV0aW9uXG4gICAgdGhpcy5kaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIHtcbiAgICAgIGRvbWFpbk5hbWVzOiBbJ21hcmtldHBsYWNlLmNsb3VkbmVzdGxlLmNvbSddLFxuICAgICAgY2VydGlmaWNhdGU6IGNlcnRpZmljYXRlLFxuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy53ZWJzaXRlQnVja2V0LCB7XG4gICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICAgIH0pLFxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcbiAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgIGNvbXByZXNzOiB0cnVlLFxuICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgb3JpZ2luUmVxdWVzdFBvbGljeTogZ2VvT3JpZ2luUmVxdWVzdFBvbGljeSwgLy8gQWRkIGdlb2dyYXBoaWMgaGVhZGVyc1xuICAgICAgfSxcbiAgICAgIC8vIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgIC8vICAgJy9hcGkvKic6IHtcbiAgICAgIC8vICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLkh0dHBPcmlnaW4oJ2FwaS5tYXJrZXRwbGFjZS5jb20nKSwgLy8gVGhpcyB3aWxsIGJlIHVwZGF0ZWQgd2l0aCBhY3R1YWwgQVBJIEdhdGV3YXkgZG9tYWluXG4gICAgICAvLyAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAvLyAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxuICAgICAgLy8gICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfRElTQUJMRUQsXG4gICAgICAvLyAgICAgb3JpZ2luUmVxdWVzdFBvbGljeTogZ2VvT3JpZ2luUmVxdWVzdFBvbGljeSwgLy8gVXNlIHNhbWUgcG9saWN5IGZvciBBUEkgY2FsbHNcbiAgICAgIC8vICAgfSxcbiAgICAgIC8vIH0sXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLCAvLyBGb3IgU1BBIHJvdXRpbmdcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsIC8vIEZvciBTUEEgcm91dGluZ1xuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcHJpY2VDbGFzczogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCwgLy8gVXNlIG9ubHkgTm9ydGggQW1lcmljYSBhbmQgRXVyb3BlXG4gICAgICBjb21tZW50OiAnTWFya2V0cGxhY2UgRnJvbnRlbmQgRGlzdHJpYnV0aW9uJyxcbiAgICB9KVxuXG4gICAgdGhpcy53ZWJzaXRlVXJsID0gYGh0dHBzOi8vJHt0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWBcblxuICAgIC8vIERlcGxveSB0aGUgZnJvbnRlbmQgYnVpbGQgdG8gUzMgKHRoaXMgd2lsbCBiZSBkb25lIG1hbnVhbGx5IG9yIHZpYSBDSS9DRClcbiAgICAvLyBEZXBsb3kgZnJvbnRlbmQgYnVpbGQgdG8gUzNcbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95V2Vic2l0ZScsIHtcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQoJy4uL2Zyb250ZW5kL2Rpc3QnKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogdGhpcy53ZWJzaXRlQnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uOiB0aGlzLmRpc3RyaWJ1dGlvbixcbiAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbJy8qJ10sXG4gICAgfSlcbiAgfVxufSJdfQ==