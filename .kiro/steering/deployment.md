# Deployment Guide & Infrastructure Status

## Current Deployment Status

### Backend Infrastructure ✅
- **Stack Name**: `MP-1759859484941`
- **API Gateway**: `https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/`
- **Cognito User Pool**: `us-east-1_5EpprbR5R`
- **Client ID**: `58u72aor8kf4f93pf93pdnqecu`
- **Assets Bucket**: `marketplace-assets-1759859485186`
- **User Table**: `marketplace-users-1759859485186`
- **Solution Table**: `marketplace-solutions-1759859485186`

### Frontend Deployment ✅
- **Website Bucket**: `marketplace-frontend-20251007232833`
- **Website URL**: `http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com`
- **Status**: Live and accessible
- **Last Updated**: 2025-10-08

## Deployment Commands

### Backend Deployment
```bash
cd packages/infrastructure
npm run deploy
```

### Frontend Deployment
```bash
cd packages/frontend
npm run build
aws s3 sync dist/ s3://marketplace-frontend-20251007232833/ --delete
```

## Discovery Commands

### Find Current Stack
```bash
# List all marketplace stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE | grep -i marketplace

# Get stack outputs
aws cloudformation describe-stacks --stack-name MP-1759859484941 --query "Stacks[0].Outputs"
```

### Find Frontend Bucket
```bash
# List all S3 buckets
aws s3 ls | grep marketplace-frontend

# Check website configuration
aws s3api get-bucket-website --bucket marketplace-frontend-20251007232833
```

### Test API Endpoints
```bash
# Test catalog endpoint
curl https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/catalog

# Test categories
curl https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod/catalog/categories
```

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://1d98dlxxhh.execute-api.us-east-1.amazonaws.com/prod
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_5EpprbR5R
VITE_USER_POOL_CLIENT_ID=58u72aor8kf4f93pf93pdnqecu
VITE_ASSETS_BUCKET=marketplace-assets-1759859485186
```

## Troubleshooting

### If Frontend Bucket is Missing
1. Check for existing buckets: `aws s3 ls | grep marketplace`
2. Create new bucket with website hosting:
```bash
BUCKET_NAME="marketplace-frontend-$(date +%Y%m%d%H%M%S)"
aws s3 mb s3://$BUCKET_NAME
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html
```

### If Stack Name is Unknown
```bash
# Find marketplace stacks
aws cloudformation list-stacks --query "StackSummaries[?contains(StackName, 'MP-') || contains(TemplateDescription, 'Marketplace')].{Name:StackName,Status:StackStatus,Description:TemplateDescription}"
```

### If API Endpoints Fail
1. Check stack outputs for correct API Gateway URL
2. Verify Lambda functions are deployed
3. Test with curl for basic connectivity

## Critical Infrastructure Components

### Must Exist for System to Work
- ✅ CloudFormation Stack (MP-1759859484941)
- ✅ API Gateway with all endpoints
- ✅ Cognito User Pool for authentication
- ✅ DynamoDB tables with sample data
- ✅ Lambda functions for all operations
- ✅ S3 bucket for frontend hosting
- ✅ S3 bucket for assets storage

### Sample Data Status
- **Users**: 17 users (customers, partners, admins)
- **Solutions**: 6 approved solutions in catalog
- **Categories**: Business Software, Analytics, Developer Tools, etc.

## Next Steps for Production

### Missing Components
- [ ] CloudFront distribution for frontend
- [ ] Custom domain configuration
- [ ] SSL certificate setup
- [ ] Proper CI/CD pipeline
- [ ] Monitoring and logging setup

### Security Improvements Needed
- [ ] Remove public S3 access (use CloudFront)
- [ ] Add WAF protection
- [ ] Implement proper CORS policies
- [ ] Add API rate limiting
