#!/bin/bash

# Frontend Deployment Script
# Builds and deploys React frontend to S3

echo "🚀 Building and deploying frontend..."

cd packages/frontend

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

echo "☁️ Syncing to S3..."
aws s3 sync dist/ s3://marketplace-frontend-20251007232833 --delete

echo "✅ Frontend deployed successfully!"
echo "🌐 Live at: http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com/"
