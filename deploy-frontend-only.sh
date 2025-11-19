#!/bin/bash

echo "🚀 Building and deploying frontend only..."

cd packages/frontend

# Build the frontend
echo "📦 Building frontend..."
npm run build

# Get the S3 bucket name from CloudFormation
echo "🔍 Getting S3 bucket name..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name MP-1762926799834 \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
  --output text)

if [ -z "$BUCKET_NAME" ]; then
  echo "❌ Could not find S3 bucket name"
  exit 1
fi

echo "📤 Uploading to S3 bucket: $BUCKET_NAME"
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Get CloudFront distribution ID
echo "🔍 Getting CloudFront distribution ID..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name MP-1762926799834 \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "❌ Could not find CloudFront distribution ID"
  exit 1
fi

echo "🔄 Invalidating CloudFront cache: $DISTRIBUTION_ID"
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "✅ Frontend deployment complete!"
echo "🌐 Your site will be updated at: https://marketplace.cloudnestle.com/"
echo "⏱️  Cache invalidation may take 5-15 minutes to propagate globally"
