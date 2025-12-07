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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRlbmQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmcm9udGVuZC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFDbEMsdURBQXdDO0FBQ3hDLHVFQUF3RDtBQUN4RCw0RUFBNkQ7QUFDN0Qsd0VBQXlEO0FBQ3pELHlEQUEwQztBQUMxQyx3RUFBeUQ7QUFDekQsMkNBQXNDO0FBRXRDLE1BQWEsYUFBYyxTQUFRLHNCQUFTO0lBSzFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDeEQsVUFBVSxFQUFFLHdCQUF3QixJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDaEQsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLDJCQUEyQjtZQUNwRCxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCO1lBQzVELGlCQUFpQixFQUFFLElBQUksRUFBRSxrQkFBa0I7U0FDNUMsQ0FBQyxDQUFBO1FBRUYsd0NBQXdDO1FBQ3hDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUM1RSxPQUFPLEVBQUUsOEJBQThCO1NBQ3hDLENBQUMsQ0FBQTtRQUVGLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUNwQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDO1lBQ3pCLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xELFVBQVUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQztTQUNsRCxDQUFDLENBQ0gsQ0FBQTtRQUVELCtDQUErQztRQUMvQyxNQUFNLHNCQUFzQixHQUFHLElBQUksVUFBVSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNoRyx1QkFBdUIsRUFBRSwwQkFBMEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQy9ELE9BQU8sRUFBRSw0REFBNEQ7WUFDckUsY0FBYyxFQUFFLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQzlELDJCQUEyQixFQUMzQixnQ0FBZ0MsRUFDaEMsd0JBQXdCLEVBQ3hCLDZCQUE2QixFQUM3QixZQUFZLENBQ2I7WUFDRCxtQkFBbUIsRUFBRSxVQUFVLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxFQUFFO1lBQ3RFLGNBQWMsRUFBRSxVQUFVLENBQUMsMkJBQTJCLENBQUMsSUFBSSxFQUFFO1NBQzlELENBQUMsQ0FBQTtRQUVGLGtFQUFrRTtRQUNsRSxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUNwRCxJQUFJLEVBQ0osd0JBQXdCLEVBQ3hCLHFGQUFxRixDQUN0RixDQUFBO1FBRUQsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDcEUsV0FBVyxFQUFFLENBQUMsNkJBQTZCLENBQUM7WUFDNUMsV0FBVyxFQUFFLFdBQVc7WUFDeEIsZUFBZSxFQUFFO2dCQUNmLE1BQU0sRUFBRSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTtvQkFDL0Msb0JBQW9CO2lCQUNyQixDQUFDO2dCQUNGLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUI7Z0JBQ3ZFLGNBQWMsRUFBRSxVQUFVLENBQUMsY0FBYyxDQUFDLHNCQUFzQjtnQkFDaEUsYUFBYSxFQUFFLFVBQVUsQ0FBQyxhQUFhLENBQUMsc0JBQXNCO2dCQUM5RCxRQUFRLEVBQUUsSUFBSTtnQkFDZCxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUI7Z0JBQ3JELG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLHlCQUF5QjthQUN2RTtZQUNELG1CQUFtQixFQUFFO2dCQUNuQixRQUFRLEVBQUU7b0JBQ1IsTUFBTSxFQUFFLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLHNEQUFzRDtvQkFDN0csb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQjtvQkFDdkUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsU0FBUztvQkFDbkQsV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCO29CQUNwRCxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxnQ0FBZ0M7aUJBQzlFO2FBQ0Y7WUFDRCxpQkFBaUIsRUFBRSxZQUFZO1lBQy9CLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxVQUFVLEVBQUUsR0FBRztvQkFDZixrQkFBa0IsRUFBRSxHQUFHO29CQUN2QixnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsa0JBQWtCO29CQUNuRCxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUM3QjtnQkFDRDtvQkFDRSxVQUFVLEVBQUUsR0FBRztvQkFDZixrQkFBa0IsRUFBRSxHQUFHO29CQUN2QixnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsa0JBQWtCO29CQUNuRCxHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUM3QjthQUNGO1lBQ0QsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLG9DQUFvQztZQUN2RixPQUFPLEVBQUUsbUNBQW1DO1NBQzdDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxVQUFVLEdBQUcsV0FBVyxJQUFJLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFFdkUsNEVBQTRFO1FBQzVFLDhCQUE4QjtRQUM5QixJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ25ELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDcEQsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDckMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDO1NBQzFCLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQTNHRCxzQ0EyR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250J1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJ1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSdcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJ1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcblxuZXhwb3J0IGNsYXNzIEZyb250ZW5kU3RhY2sgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgd2Vic2l0ZUJ1Y2tldDogczMuQnVja2V0XG4gIHB1YmxpYyByZWFkb25seSBkaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uXG4gIHB1YmxpYyByZWFkb25seSB3ZWJzaXRlVXJsOiBzdHJpbmdcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKVxuXG4gICAgLy8gUzMgQnVja2V0IGZvciBob3N0aW5nIHRoZSBSZWFjdCBhcHBcbiAgICB0aGlzLndlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWJzaXRlQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYG1hcmtldHBsYWNlLWZyb250ZW5kLSR7RGF0ZS5ub3coKX1gLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsIC8vIFdlJ2xsIHVzZSBDbG91ZEZyb250IE9BSVxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsIC8vIEZvciBkZXZlbG9wbWVudFxuICAgIH0pXG5cbiAgICAvLyBPcmlnaW4gQWNjZXNzIElkZW50aXR5IGZvciBDbG91ZEZyb250XG4gICAgY29uc3Qgb3JpZ2luQWNjZXNzSWRlbnRpdHkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCAnT0FJJywge1xuICAgICAgY29tbWVudDogJ09BSSBmb3IgbWFya2V0cGxhY2UgZnJvbnRlbmQnLFxuICAgIH0pXG5cbiAgICAvLyBHcmFudCBDbG91ZEZyb250IGFjY2VzcyB0byBTMyBidWNrZXRcbiAgICB0aGlzLndlYnNpdGVCdWNrZXQuYWRkVG9SZXNvdXJjZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy53ZWJzaXRlQnVja2V0LmFybkZvck9iamVjdHMoJyonKV0sXG4gICAgICAgIHByaW5jaXBhbHM6IFtvcmlnaW5BY2Nlc3NJZGVudGl0eS5ncmFudFByaW5jaXBhbF0sXG4gICAgICB9KVxuICAgIClcblxuICAgIC8vIE9yaWdpbiBSZXF1ZXN0IFBvbGljeSBmb3IgZ2VvZ3JhcGhpYyBoZWFkZXJzXG4gICAgY29uc3QgZ2VvT3JpZ2luUmVxdWVzdFBvbGljeSA9IG5ldyBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kodGhpcywgJ0dlb09yaWdpblJlcXVlc3RQb2xpY3knLCB7XG4gICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5TmFtZTogYG1hcmtldHBsYWNlLWdlby1wb2xpY3ktJHtEYXRlLm5vdygpfWAsXG4gICAgICBjb21tZW50OiAnUG9saWN5IHRvIGZvcndhcmQgZ2VvZ3JhcGhpYyBoZWFkZXJzIGZvciBsb2NhdGlvbiB0cmFja2luZycsXG4gICAgICBoZWFkZXJCZWhhdmlvcjogY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0SGVhZGVyQmVoYXZpb3IuYWxsb3dMaXN0KFxuICAgICAgICAnQ2xvdWRGcm9udC1WaWV3ZXItQ291bnRyeScsXG4gICAgICAgICdDbG91ZEZyb250LVZpZXdlci1Db3VudHJ5LU5hbWUnLFxuICAgICAgICAnQ2xvdWRGcm9udC1WaWV3ZXItQ2l0eScsXG4gICAgICAgICdDbG91ZEZyb250LVZpZXdlci1UaW1lLVpvbmUnLFxuICAgICAgICAnVXNlci1BZ2VudCdcbiAgICAgICksXG4gICAgICBxdWVyeVN0cmluZ0JlaGF2aW9yOiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RRdWVyeVN0cmluZ0JlaGF2aW9yLmFsbCgpLFxuICAgICAgY29va2llQmVoYXZpb3I6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdENvb2tpZUJlaGF2aW9yLm5vbmUoKSxcbiAgICB9KVxuXG4gICAgLy8gSW1wb3J0IGV4aXN0aW5nIFNTTCBjZXJ0aWZpY2F0ZSBmb3IgbWFya2V0cGxhY2UuY2xvdWRuZXN0bGUuY29tXG4gICAgY29uc3QgY2VydGlmaWNhdGUgPSBhY20uQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKFxuICAgICAgdGhpcyxcbiAgICAgICdNYXJrZXRwbGFjZUNlcnRpZmljYXRlJyxcbiAgICAgICdhcm46YXdzOmFjbTp1cy1lYXN0LTE6NjM3NDIzMjAyMTc1OmNlcnRpZmljYXRlL2E2MGJlNzIyLTM2MzktNDEyZC04MGQ5LWM2YjhlMTMxOTlmOCdcbiAgICApXG5cbiAgICAvLyBDbG91ZEZyb250IERpc3RyaWJ1dGlvblxuICAgIHRoaXMuZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCB7XG4gICAgICBkb21haW5OYW1lczogWydtYXJrZXRwbGFjZS5jbG91ZG5lc3RsZS5jb20nXSxcbiAgICAgIGNlcnRpZmljYXRlOiBjZXJ0aWZpY2F0ZSxcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMud2Vic2l0ZUJ1Y2tldCwge1xuICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgICB9KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGdlb09yaWdpblJlcXVlc3RQb2xpY3ksIC8vIEFkZCBnZW9ncmFwaGljIGhlYWRlcnNcbiAgICAgIH0sXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XG4gICAgICAgICcvYXBpLyonOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5IdHRwT3JpZ2luKCdhcGkubWFya2V0cGxhY2UuY29tJyksIC8vIFRoaXMgd2lsbCBiZSB1cGRhdGVkIHdpdGggYWN0dWFsIEFQSSBHYXRld2F5IGRvbWFpblxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGdlb09yaWdpblJlcXVlc3RQb2xpY3ksIC8vIFVzZSBzYW1lIHBvbGljeSBmb3IgQVBJIGNhbGxzXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJywgLy8gRm9yIFNQQSByb3V0aW5nXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLCAvLyBGb3IgU1BBIHJvdXRpbmdcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHByaWNlQ2xhc3M6IGNsb3VkZnJvbnQuUHJpY2VDbGFzcy5QUklDRV9DTEFTU18xMDAsIC8vIFVzZSBvbmx5IE5vcnRoIEFtZXJpY2EgYW5kIEV1cm9wZVxuICAgICAgY29tbWVudDogJ01hcmtldHBsYWNlIEZyb250ZW5kIERpc3RyaWJ1dGlvbicsXG4gICAgfSlcblxuICAgIHRoaXMud2Vic2l0ZVVybCA9IGBodHRwczovLyR7dGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gXG5cbiAgICAvLyBEZXBsb3kgdGhlIGZyb250ZW5kIGJ1aWxkIHRvIFMzICh0aGlzIHdpbGwgYmUgZG9uZSBtYW51YWxseSBvciB2aWEgQ0kvQ0QpXG4gICAgLy8gRGVwbG95IGZyb250ZW5kIGJ1aWxkIHRvIFMzXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveVdlYnNpdGUnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KCcuLi9mcm9udGVuZC9kaXN0JyldLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHRoaXMud2Vic2l0ZUJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbjogdGhpcy5kaXN0cmlidXRpb24sXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLFxuICAgIH0pXG4gIH1cbn0iXX0=