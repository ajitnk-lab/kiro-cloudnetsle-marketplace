#!/bin/bash

# ENHANCED DEPLOYMENT SCRIPT - Includes table protection setup
# This ensures all tables have deletion protection before deployment

set -e

echo "🚀 Starting enhanced marketplace deployment..."

# Step 1: Enable deletion protection on all tables
echo "🔒 Ensuring deletion protection on all tables..."
./fix-table-protection.sh

# Step 2: Deploy backend infrastructure via CDK
echo "📦 Deploying backend infrastructure..."
cd packages/infrastructure
npm run deploy

# Step 3: Extract current resource IDs from CloudFormation
echo "🔍 Extracting current resource IDs..."
STACK_NAME="MP-1759859484941"

API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)

echo "   ✅ API Gateway URL: $API_URL"
echo "   ✅ User Pool ID: $USER_POOL_ID"
echo "   ✅ Client ID: $CLIENT_ID"
echo "   ✅ S3 Bucket: $BUCKET_NAME"
echo "   ✅ CloudFront ID: $DISTRIBUTION_ID"

# Step 4: Update frontend .env with CURRENT resource IDs
echo "📝 Updating frontend environment variables..."
cd ../frontend

cat > .env << EOF
# AWS Cognito Configuration (Auto-generated from CloudFormation)
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID

# API Configuration (Auto-generated from CloudFormation)
VITE_API_URL=$API_URL

# AWS Region
VITE_AWS_REGION=us-east-1

# reCAPTCHA Configuration (Production keys)
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI

# Generated on: $(date)
# Stack: $STACK_NAME
EOF

echo "   ✅ Updated .env with current resource IDs"

# Step 5: Build frontend with correct environment variables
echo "🔨 Building frontend with updated configuration..."
npm run build

# Step 6: Deploy to BOTH S3 buckets (CDK + Production)
echo "☁️ Syncing frontend to CDK bucket..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete

echo "☁️ Syncing frontend to production bucket (marketplace.cloudnestle.com)..."
aws s3 sync dist/ s3://marketplace.cloudnestle.com --delete

# Step 7: Invalidate BOTH CloudFront distributions
echo "🔄 Invalidating CDK CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1

echo "🔄 Invalidating production CloudFront cache..."
# Get the distribution ID for marketplace.cloudnestle.com
PROD_DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='marketplace.cloudnestle.com.s3.amazonaws.com'].Id" --output text)
if [ ! -z "$PROD_DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $PROD_DISTRIBUTION_ID --paths "/*" --region us-east-1
    echo "   ✅ Production CloudFront invalidated: $PROD_DISTRIBUTION_ID"
else
    echo "   ⚠️  Could not find production CloudFront distribution"
fi

echo ""
echo "✅ Enhanced deployment completed successfully!"
echo ""
echo "🔒 All DynamoDB tables are now protected from deletion"
echo ""
echo "🌐 Access your marketplace at:"
echo "   Production: https://marketplace.cloudnestle.com"
echo "   CDK CloudFront: https://d3uhuxbvqv0vtg.cloudfront.net"
echo ""
echo "🔧 Backend Resources:"
echo "   API Gateway: $API_URL"
echo "   Cognito Pool: $USER_POOL_ID"
echo "   S3 Bucket: $BUCKET_NAME"
echo "   CloudFront: $DISTRIBUTION_ID"
echo ""
echo "📝 Environment file updated: packages/frontend/.env"
echo ""
echo "⚠️  IMPORTANT: Use this enhanced script for all deployments!"
