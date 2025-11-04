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
aws s3 sync dist/ s3://marketplace-frontend-1762237441732 --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id E3U4YKY2P0VVP7 --paths "/*" --region us-east-1 2>/dev/null || echo "CloudFront invalidation skipped (distribution ID needed)"

echo "✅ Frontend deployed successfully!"
echo ""
echo "🌐 Access your frontend at:"
echo "   CloudFront: https://d3uhuxbvqv0vtg.cloudfront.net"
echo "   S3 Direct: http://marketplace-frontend-1762237441732.s3-website-us-east-1.amazonaws.com"
echo ""
echo "📝 Note: If CloudFront shows 403, the distribution may need configuration updates."
