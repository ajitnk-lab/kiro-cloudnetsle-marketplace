#!/bin/bash

# MARKETPLACE MIGRATION TO MEMBER ACCOUNT - us-east-1
# This deploys marketplace to member account and updates FAISS integration

set -e

echo "🚀 Starting marketplace migration to member account (us-east-1)..."

# Step 1: Deploy backend infrastructure via CDK to MEMBER ACCOUNT
echo "📦 Deploying backend infrastructure to member account..."
cd packages/infrastructure
npx cdk deploy --profile member-account --region us-east-1 --require-approval never

# Step 2: Extract resource IDs from CloudFormation in MEMBER ACCOUNT
echo "🔍 Extracting resource IDs from member account..."
STACK_NAME="MarketplaceStack-Clean"
REGION="us-east-1"
PROFILE="member-account"

API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --profile $PROFILE --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --profile $PROFILE --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --profile $PROFILE --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --profile $PROFILE --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --profile $PROFILE --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)

# Extract DynamoDB table names for FAISS integration
USER_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --profile $PROFILE --query "Stacks[0].Outputs[?OutputKey=='UserTableName'].OutputValue" --output text)
ENTITLEMENT_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --profile $PROFILE --query "Stacks[0].Outputs[?OutputKey=='EntitlementTableName'].OutputValue" --output text)
SESSION_TABLE_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --profile $PROFILE --query "Stacks[0].Outputs[?OutputKey=='SessionTableName'].OutputValue" --output text)

echo "   ✅ API Gateway URL: $API_URL"
echo "   ✅ User Pool ID: $USER_POOL_ID"
echo "   ✅ Client ID: $CLIENT_ID"
echo "   ✅ S3 Bucket: $BUCKET_NAME"
echo "   ✅ CloudFront ID: $DISTRIBUTION_ID"
echo "   ✅ User Table: $USER_TABLE_NAME"
echo "   ✅ Entitlement Table: $ENTITLEMENT_TABLE_NAME"
echo "   ✅ Session Table: $SESSION_TABLE_NAME"

# Step 2.5: Update FAISS configuration with NEW table names (member account)
echo "🔧 Updating FAISS configuration with new member account table names..."
FAISS_DIR="${FAISS_PROJECT_DIR:-../../faiss-rag-agent}"

if [ -d "$FAISS_DIR" ]; then
    cat > $FAISS_DIR/.env << EOF
# Marketplace Integration (Auto-generated from Member Account CloudFormation)
MARKETPLACE_USER_TABLE_NAME=$USER_TABLE_NAME
MARKETPLACE_ENTITLEMENT_TABLE_NAME=$ENTITLEMENT_TABLE_NAME
MARKETPLACE_SESSION_TABLE_NAME=$SESSION_TABLE_NAME
MARKETPLACE_API_URL=$API_URL

# Generated on: $(date)
# Stack: $STACK_NAME (Member Account: 637423202175)
# Region: $REGION
EOF
    echo "   ✅ Updated FAISS .env with NEW member account table names"
else
    echo "   ⚠️  FAISS directory not found at $FAISS_DIR"
fi

# Step 3: Update frontend .env with MEMBER ACCOUNT resource IDs
echo "📝 Updating frontend environment variables for member account..."
cd ../frontend

cat > .env << EOF
# AWS Cognito Configuration (Member Account - Auto-generated)
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID

# API Configuration (Member Account - Auto-generated)
VITE_API_URL=$API_URL

# AWS Region (Member Account)
VITE_AWS_REGION=$REGION

# reCAPTCHA Configuration (Production keys)
VITE_RECAPTCHA_SITE_KEY=6LdKqgEsAAAAALf2rG1nPK1tjuKHwAaL83RXLuAE

# Generated on: $(date)
# Stack: $STACK_NAME (Member Account: 637423202175)
EOF

echo "   ✅ Updated frontend .env with member account resource IDs"

# Step 4: Build frontend with correct environment variables
echo "🔨 Building frontend with updated member account configuration..."
npm run build

# Step 5: Deploy to member account S3 bucket
echo "☁️ Syncing frontend to member account bucket..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete --profile $PROFILE --region $REGION

echo "☁️ Syncing frontend to production bucket (marketplace.cloudnestle.com)..."
aws s3 sync dist/ s3://marketplace.cloudnestle.com --delete

# Step 6: Invalidate CloudFront distributions
echo "🔄 Invalidating member account CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1 --profile $PROFILE

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
echo "✅ Marketplace migration to member account completed successfully!"
echo ""
echo "🌐 Access your marketplace at:"
echo "   Production: https://marketplace.cloudnestle.com"
echo "   Member Account CloudFront: TBD after DNS update"
echo ""
echo "🔧 Member Account Backend Resources:"
echo "   Account: 637423202175"
echo "   Region: $REGION"
echo "   API Gateway: $API_URL"
echo "   Cognito Pool: $USER_POOL_ID"
echo "   S3 Bucket: $BUCKET_NAME"
echo "   CloudFront: $DISTRIBUTION_ID"
echo ""
echo "📝 Environment files updated:"
echo "   Frontend: packages/frontend/.env"
echo "   FAISS: $FAISS_DIR/.env"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Test member account marketplace functionality"
echo "   2. Migrate DynamoDB data from original account"
echo "   3. Update DNS to point to member account"
echo "   4. Redeploy FAISS with new table references"
