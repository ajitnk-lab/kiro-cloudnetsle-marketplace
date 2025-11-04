#!/bin/bash

echo "🚀 Building and deploying to CDN and S3..."

cd packages/frontend

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully!"
    
    # Deploy to CDN S3 bucket (used by marketplace.cloudnestle.com)
    echo "☁️ Syncing to CDN S3 bucket..."
    aws s3 sync dist/ s3://marketplace.cloudnestle.com --delete
    
    if [ $? -eq 0 ]; then
        echo "✅ CDN S3 sync successful!"
        
        # Deploy to original S3 bucket as backup
        echo "📦 Syncing to backup S3 bucket..."
        aws s3 sync dist/ s3://marketplace-frontend-20251007232833 --delete
        
        if [ $? -eq 0 ]; then
            echo "✅ Backup S3 sync successful!"
        else
            echo "⚠️ Backup S3 sync failed (continuing...)"
        fi
        
        # Invalidate CloudFront cache
        echo "🔄 Invalidating CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id E2BR0JDEJSV4VN --paths "/*"
        
        if [ $? -eq 0 ]; then
            echo "✅ CloudFront cache invalidated!"
            echo ""
            echo "🎉 Deployment complete!"
            echo "🌐 Primary: https://marketplace.cloudnestle.com"
            echo "🌐 Backup:  http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com"
            echo ""
            echo "📋 Deployment Summary:"
            echo "- Built: packages/frontend/dist/"
            echo "- Synced to: s3://marketplace.cloudnestle.com (CDN)"
            echo "- Synced to: s3://marketplace-frontend-20251007232833 (Backup)"
            echo "- Invalidated: CloudFront distribution E2BR0JDEJSV4VN"
        else
            echo "❌ CloudFront invalidation failed!"
            exit 1
        fi
    else
        echo "❌ CDN S3 sync failed!"
        exit 1
    fi
else
    echo "❌ Frontend build failed!"
    exit 1
fi
