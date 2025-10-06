#!/bin/bash

echo "🚀 Deploying Marketplace Platform..."

# Deploy backend infrastructure
echo "📦 Deploying backend infrastructure..."
cd packages/infrastructure
npm install
npm run deploy

if [ $? -eq 0 ]; then
    echo "✅ Backend deployed successfully!"
else
    echo "❌ Backend deployment failed!"
    exit 1
fi

# Build and deploy frontend
echo "🎨 Building and deploying frontend..."
cd ../frontend
npm install
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully!"
    
    # Deploy to S3
    echo "📤 Uploading to S3..."
    npm run deploy
    
    if [ $? -eq 0 ]; then
        echo "✅ Frontend deployed successfully!"
        
        # Invalidate CloudFront cache
        echo "🔄 Invalidating CloudFront cache..."
        npm run invalidate
        
        echo "🎉 Deployment complete!"
        echo ""
        echo "📋 Deployment Summary:"
        echo "Backend API: Check AWS CloudFormation outputs"
        echo "Frontend URL: Check AWS CloudFormation outputs"
        echo ""
        echo "🧪 Testing Instructions:"
        echo "1. Visit the Frontend URL from CloudFormation outputs"
        echo "2. Test user registration and login"
        echo "3. Test partner application workflow"
        echo "4. Test solution catalog functionality"
    else
        echo "❌ Frontend deployment failed!"
        exit 1
    fi
else
    echo "❌ Frontend build failed!"
    exit 1
fi