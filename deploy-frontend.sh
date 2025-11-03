#!/bin/bash

# Frontend Deployment Script for Marketplace Platform
set -e

echo "🚀 Starting frontend deployment..."

# Navigate to frontend directory
cd packages/frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the frontend
echo "🔨 Building frontend..."
npm run build

# Deploy to S3
echo "☁️ Deploying to S3..."
aws s3 sync dist/ s3://marketplace-frontend-20251007232833 --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id E1234567890123 --paths "/*" --region us-west-2 2>/dev/null || echo "CloudFront invalidation skipped (distribution ID needed)"

echo "✅ Frontend deployed successfully!"
echo ""
echo "🌐 Access your frontend at:"
echo "   CloudFront: https://d2o6hyhxlhxryo.cloudfront.net"
echo ""
echo "📝 Note: If CloudFront shows 403, the distribution may need configuration updates."
