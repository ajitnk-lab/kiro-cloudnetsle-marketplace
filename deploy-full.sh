#!/bin/bash

# Full Marketplace Deployment Script
# Deploys backend infrastructure and updates frontend with correct resource IDs

set -e

echo "🚀 Starting full marketplace deployment..."

# Step 1: Deploy backend infrastructure
echo "📦 Deploying backend infrastructure..."
cd packages/infrastructure
npm run deploy

# Step 2: Extract resource IDs from CloudFormation outputs
echo "🔍 Extracting resource IDs from CloudFormation..."
STACK_NAME="MP-1759859484941"

API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)

echo "   API Gateway URL: $API_URL"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $CLIENT_ID"

# Step 3: Update frontend .env file
echo "📝 Updating frontend environment variables..."
cd ../frontend

cat > .env << EOF
# AWS Cognito Configuration
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID

# API Configuration  
VITE_API_URL=$API_URL

# AWS Region
VITE_AWS_REGION=us-east-1
EOF

echo "   Updated .env file with new resource IDs"

# Step 4: Rebuild and deploy frontend
echo "🔨 Building frontend with updated configuration..."
npm run build

echo "☁️ Deploying frontend to S3..."
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Step 5: Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1 2>/dev/null || echo "CloudFront invalidation skipped"

echo ""
echo "✅ Full deployment completed successfully!"
echo ""
echo "🌐 Access your marketplace at:"
echo "   CloudFront: https://d3uhuxbvqv0vtg.cloudfront.net"
echo "   S3 Direct: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
echo ""
echo "🔧 Backend API: $API_URL"
echo "🔐 Cognito Pool: $USER_POOL_ID"
