#!/bin/bash

echo "🚀 Building and deploying to CDN..."

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
        
        # Invalidate CloudFront cache
        echo "🔄 Invalidating CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id E2BR0JDEJSV4VN --paths "/*"
        
        if [ $? -eq 0 ]; then
            echo "✅ CloudFront cache invalidated!"
            echo ""
            echo "🎉 Deployment complete!"
            echo "🌐 Live at: https://marketplace.cloudnestle.com"
            echo ""
            echo "📋 Deployment Summary:"
            echo "- Built: packages/frontend/dist/"
            echo "- Synced to: s3://marketplace.cloudnestle.com"
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
