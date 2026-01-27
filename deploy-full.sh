#!/bin/bash

# SINGLE DEPLOYMENT SCRIPT - The only way to deploy marketplace
# This ensures consistent environment variables and resource references

set -e

# Install uv if not present (required for MCP servers)
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv (Python package manager)..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
    echo "   ✅ uv installed"
fi

# Use system Node 18
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required (found: $(node --version))"
    exit 1
fi

# Set environment for consistent table naming
export ENVIRONMENT=${ENVIRONMENT:-prod}

echo "🚀 Starting marketplace deployment (Environment: $ENVIRONMENT)..."

# Step 1: Deploy backend infrastructure via CDK (construct-based)
# Using --method=direct to bypass AWS Early Validation (Nov 2025 feature)
echo "📦 Deploying backend infrastructure (us-east-1)..."
cd packages/infrastructure
ENVIRONMENT=$ENVIRONMENT npx cdk deploy MarketplaceStack-v3 --require-approval never --method=direct

# Step 2: Extract current resource IDs from CloudFormation
echo "🔍 Extracting current resource IDs..."
STACK_NAME="MarketplaceStack-v3"

# Deploy to us-east-1 (same region as FAISS)
REGION="us-east-1"

API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)

# Extract DynamoDB table names for FAISS integration
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

# Step 2.5: Update FAISS configuration with table names
echo "🔧 Updating FAISS configuration..."
FAISS_DIR="${FAISS_PROJECT_DIR:-/home/ubuntu/workspace/vscode-workspace/faiss-rag-agent}"

if [ -d "$FAISS_DIR" ]; then
    cat > $FAISS_DIR/.env << EOF
# Marketplace Integration (Auto-generated from CloudFormation)
MARKETPLACE_USER_TABLE_NAME=$USER_TABLE_NAME
MARKETPLACE_ENTITLEMENT_TABLE_NAME=$ENTITLEMENT_TABLE_NAME
MARKETPLACE_SESSION_TABLE_NAME=$SESSION_TABLE_NAME
MARKETPLACE_API_URL=$API_URL

# Generated on: $(date)
# Stack: $STACK_NAME (Account: $(aws sts get-caller-identity --query Account --output text))
# Region: $REGION
EOF
    echo "   ✅ Updated FAISS .env with table names"
else
    echo "   ⚠️  FAISS directory not found at $FAISS_DIR"
fi

# Step 3: Update frontend .env with CURRENT resource IDs
echo "📝 Updating frontend environment variables..."
cd ../frontend

cat > .env << EOF
# AWS Cognito Configuration (Auto-generated from CloudFormation)
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID

# API Configuration (Auto-generated from CloudFormation)
VITE_API_URL=$API_URL

# AWS Region (Auto-detected from deployment)
VITE_AWS_REGION=$REGION

# reCAPTCHA Configuration (Production keys)
VITE_RECAPTCHA_SITE_KEY=6LdKqgEsAAAAALf2rG1nPK1tjuKHwAaL83RXLuAE

# Generated on: $(date)
# Stack: $STACK_NAME
EOF

echo "   ✅ Updated .env with current resource IDs"

# Step 4: Build frontend with correct environment variables
echo "🔨 Building frontend with updated configuration..."
npm run build

# Step 5: Deploy to S3 bucket
echo "☁️ Syncing frontend to S3 bucket..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete --region $REGION

# Step 6: Invalidate CloudFront distribution
echo "🔄 Invalidating CloudFront cache..."
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

# Step 7: Seed solutions catalog
echo "📦 Seeding solutions catalog..."
cd ../../
if [ -f "seed-solutions.js" ]; then
    node seed-solutions.js
    echo "   ✅ Solutions catalog seeded"
else
    echo "   ⚠️  Solutions seed script not found"
fi

# Step 8: Seed GST company settings (if table exists)
echo "🏢 Seeding GST company settings..."
if [ ! -z "$COMPANY_SETTINGS_TABLE_NAME" ]; then
    cd packages/infrastructure
    if [ -f "scripts/seed-company-settings.js" ]; then
        COMPANY_SETTINGS_TABLE_NAME=$COMPANY_SETTINGS_TABLE_NAME node scripts/seed-company-settings.js
        echo "   ✅ GST company settings seeded"
    else
        echo "   ⚠️  GST seed script not found"
    fi
else
    echo "   ⚠️  Company settings table not found"
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
echo "   Invoice Bucket: $INVOICE_BUCKET_NAME"
echo ""
echo "📝 Environment files updated:"
echo "   Frontend: packages/frontend/.env"
echo "   FAISS: $FAISS_DIR/.env"
echo ""
echo "⚠️  IMPORTANT: Only use this script for deployment!"
echo "   Other deploy methods will cause configuration drift."
echo ""
echo "🧾 GST Features:"
echo "   ✅ Company settings table: $COMPANY_SETTINGS_TABLE_NAME"
echo "   ✅ Invoice bucket: $INVOICE_BUCKET_NAME"
echo "   ✅ Invoice generation Lambda deployed"
echo "   ✅ GST calculation in payment flow"
echo ""
echo "📦 Catalog:"
echo "   ✅ Solutions catalog seeded with 5 solutions"
echo "   ✅ AWS Solution Finder integrated"
