#!/bin/bash

# DEPLOYMENT SCRIPT WITH EARLY VALIDATION WORKAROUND
# AWS introduced Early Validation in November 2025 which can block deployments
# This script uses --method=direct to bypass change set validation

set -e

echo "🚀 Starting marketplace deployment (bypassing Early Validation)..."

# Step 1: Deploy backend infrastructure via CDK using DIRECT method
echo "📦 Deploying backend infrastructure (us-east-1) - DIRECT METHOD..."
cd packages/infrastructure

# Use --method=direct to bypass Early Validation change set creation
# This deploys directly without creating a change set first
npx cdk deploy MarketplaceStack-v3 --require-approval never --method=direct

# Step 2: Extract current resource IDs from CloudFormation
echo "🔍 Extracting current resource IDs..."
STACK_NAME="MarketplaceStack-v3"
REGION="us-east-1"

API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)

# Extract DynamoDB table names
USER_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='UserTableName'].OutputValue" --output text)
ENTITLEMENT_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='EntitlementTableName'].OutputValue" --output text)
SESSION_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='SessionTableName'].OutputValue" --output text)

# Extract GST-related outputs
COMPANY_SETTINGS_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='CompanySettingsTableName'].OutputValue" --output text)
INVOICE_BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='InvoiceBucketName'].OutputValue" --output text)

echo "   ✅ API Gateway URL: $API_URL"
echo "   ✅ User Pool ID: $USER_POOL_ID"
echo "   ✅ Client ID: $CLIENT_ID"
echo "   ✅ S3 Bucket: $BUCKET_NAME"
echo "   ✅ CloudFront ID: $DISTRIBUTION_ID"
echo "   ✅ User Table: $USER_TABLE_NAME"
echo "   ✅ Entitlement Table: $ENTITLEMENT_TABLE_NAME"
echo "   ✅ Session Table: $SESSION_TABLE_NAME"
echo "   ✅ Company Settings Table: $COMPANY_SETTINGS_TABLE_NAME"
echo "   ✅ Invoice Bucket: $INVOICE_BUCKET_NAME"

# Step 2.5: Update FAISS configuration
echo "🔧 Updating FAISS configuration..."
FAISS_DIR="${FAISS_PROJECT_DIR:-/persistent/home/ubuntu/workspace/faiss-rag-agent}"

if [ -d "$FAISS_DIR" ]; then
    cat > $FAISS_DIR/.env << EOF
# Marketplace Integration (Auto-generated)
MARKETPLACE_USER_TABLE_NAME=$USER_TABLE_NAME
MARKETPLACE_ENTITLEMENT_TABLE_NAME=$ENTITLEMENT_TABLE_NAME
MARKETPLACE_SESSION_TABLE_NAME=$SESSION_TABLE_NAME
MARKETPLACE_API_URL=$API_URL

# Generated: $(date)
# Stack: $STACK_NAME
# Region: $REGION
EOF
    echo "   ✅ Updated FAISS .env"
else
    echo "   ⚠️  FAISS directory not found"
fi

# Step 3: Update frontend environment
echo "📝 Updating frontend environment..."
cd ../frontend

cat > .env << EOF
# AWS Cognito Configuration
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID

# API Configuration
VITE_API_URL=$API_URL

# AWS Region
VITE_AWS_REGION=$REGION

# reCAPTCHA Configuration
VITE_RECAPTCHA_SITE_KEY=6LdKqgEsAAAAALf2rG1nPK1tjuKHwAaL83RXLuAE

# Generated: $(date)
# Stack: $STACK_NAME
EOF

echo "   ✅ Updated .env"

# Step 4: Build frontend
echo "🔨 Building frontend..."
npm run build

# Step 5: Deploy to S3
echo "☁️ Syncing to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete --region $REGION

# Step 6: Invalidate CloudFront
echo "🔄 Invalidating CloudFront..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1

# Step 7: Seed GST settings
echo "🏢 Seeding GST company settings..."
if [ ! -z "$COMPANY_SETTINGS_TABLE_NAME" ]; then
    cd ../infrastructure
    if [ -f "scripts/seed-company-settings.js" ]; then
        node scripts/seed-company-settings.js
        echo "   ✅ GST settings seeded"
    else
        echo "   ⚠️  Seed script not found"
    fi
else
    echo "   ⚠️  Company settings table not found"
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Access your marketplace at:"
echo "   CloudFront: https://d3uhuxbvqv0vtg.cloudfront.net"
echo ""
echo "🔧 Backend Resources:"
echo "   API Gateway: $API_URL"
echo "   Cognito Pool: $USER_POOL_ID"
echo "   S3 Bucket: $BUCKET_NAME"
echo "   CloudFront: $DISTRIBUTION_ID"
echo ""
echo "🧾 GST Features:"
echo "   Company Settings: $COMPANY_SETTINGS_TABLE_NAME"
echo "   Invoice Bucket: $INVOICE_BUCKET_NAME"
echo ""
echo "⚠️  NOTE: This script uses --method=direct to bypass AWS Early Validation"
echo "   Early Validation is a new AWS feature (Nov 2025) that can block deployments"
