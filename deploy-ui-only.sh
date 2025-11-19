#!/bin/bash

# UI-only deployment script for marketplace.cloudnestle.com
# Builds frontend and syncs to existing S3 bucket + invalidates CloudFront

set -e

echo "🎯 Building and deploying UI only to marketplace.cloudnestle.com..."

# Configuration (discovered from existing infrastructure)
S3_BUCKET="marketplace.cloudnestle.com"
CLOUDFRONT_ID="E2BR0JDEJSV4VN"
FRONTEND_DIR="packages/frontend"

# Step 1: Build frontend
echo "📦 Building frontend..."
cd $FRONTEND_DIR
npm install
npm run build

# Step 2: Sync to S3
echo "☁️ Syncing to S3 bucket: $S3_BUCKET"
aws s3 sync dist/ s3://$S3_BUCKET --delete

# Step 3: Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache: $CLOUDFRONT_ID"
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*" --query 'Invalidation.Id' --output text)

# Step 4: Wait for invalidation to complete
echo "⏳ Waiting for invalidation $INVALIDATION_ID to complete..."
aws cloudfront wait invalidation-completed --distribution-id $CLOUDFRONT_ID --id $INVALIDATION_ID

echo "✅ UI deployment complete!"
echo "🌐 Visit: https://marketplace.cloudnestle.com"
