#!/bin/bash

# SINGLE DEPLOYMENT SCRIPT - The only way to deploy marketplace
# This ensures consistent environment variables and resource references

set -e

echo "🚀 Starting marketplace deployment..."

# Step 0: Update FAISS configuration FIRST (before any deployment)
echo "🔧 Updating FAISS configuration..."
STACK_NAME="MP-1762926799834"
FAISS_DIR="${FAISS_PROJECT_DIR:-../../faiss-rag-agent}"

if [ -d "$FAISS_DIR" ]; then
    # Get current table names from existing stack
    USER_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserTableName'].OutputValue" --output text 2>/dev/null || echo "marketplace-users")
    ENTITLEMENT_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='EntitlementTableName'].OutputValue" --output text 2>/dev/null || echo "marketplace-user-solution-entitlements")
    SESSION_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='SessionTableName'].OutputValue" --output text 2>/dev/null || echo "marketplace-sessions")
    API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text 2>/dev/null || echo "https://api.marketplace.com")

    cat > $FAISS_DIR/.env << EOF
# Marketplace Integration (Auto-generated from CloudFormation)
MARKETPLACE_USER_TABLE_NAME=$USER_TABLE_NAME
MARKETPLACE_ENTITLEMENT_TABLE_NAME=$ENTITLEMENT_TABLE_NAME
MARKETPLACE_SESSION_TABLE_NAME=$SESSION_TABLE_NAME
MARKETPLACE_API_URL=$API_URL

# Generated on: $(date)
# Stack: $STACK_NAME
EOF
    echo "   ✅ Updated FAISS .env with current table names"
else
    echo "   ⚠️  FAISS directory not found at $FAISS_DIR"
fi

# Step 1: Deploy backend infrastructure via CDK
echo "📦 Deploying backend infrastructure..."
cd packages/infrastructure
npm run deploy

# Step 2: Extract current resource IDs from CloudFormation
echo "🔍 Extracting current resource IDs..."
STACK_NAME="MP-1762926799834"

API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)

# Extract DynamoDB table names for FAISS integration
USER_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserTableName'].OutputValue" --output text)
ENTITLEMENT_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='EntitlementTableName'].OutputValue" --output text)
SESSION_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='SessionTableName'].OutputValue" --output text)

echo "   ✅ API Gateway URL: $API_URL"
echo "   ✅ User Pool ID: $USER_POOL_ID"
echo "   ✅ Client ID: $CLIENT_ID"
echo "   ✅ S3 Bucket: $BUCKET_NAME"
echo "   ✅ CloudFront ID: $DISTRIBUTION_ID"
echo "   ✅ User Table: $USER_TABLE_NAME"
echo "   ✅ Entitlement Table: $ENTITLEMENT_TABLE_NAME"
echo "   ✅ Session Table: $SESSION_TABLE_NAME"

# Step 3: Update frontend .env with CURRENT resource IDs
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
VITE_RECAPTCHA_SITE_KEY=6LdKqgEsAAAAALf2rG1nPK1tjuKHwAaL83RXLuAE

# Generated on: $(date)
# Stack: $STACK_NAME
EOF

echo "   ✅ Updated .env with current resource IDs"

# Step 4: Build frontend with correct environment variables
echo "🔨 Building frontend with updated configuration..."
npm run build

# Step 5: Deploy to BOTH S3 buckets (CDK + Production)
echo "☁️ Syncing frontend to CDK bucket..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete

echo "☁️ Syncing frontend to production bucket (marketplace.cloudnestle.com)..."
aws s3 sync dist/ s3://marketplace.cloudnestle.com --delete

# Step 6: Invalidate BOTH CloudFront distributions
echo "🔄 Invalidating CDK CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1

echo "🔄 Invalidating production CloudFront cache..."
# Get the distribution ID for marketplace.cloudnestle.com
PROD_DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, 'marketplace.cloudnestle.com')].Id" --output text)
if [ ! -z "$PROD_DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $PROD_DISTRIBUTION_ID --paths "/*" --region us-east-1
    echo "   ✅ Production CloudFront invalidated: $PROD_DISTRIBUTION_ID"
else
    echo "   ⚠️  Could not find production CloudFront distribution"
fi

echo ""
echo "✅ Deployment completed successfully!"
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
echo "⚠️  IMPORTANT: Only use this script for deployment!"
echo "   Other deploy methods will cause configuration drift."
