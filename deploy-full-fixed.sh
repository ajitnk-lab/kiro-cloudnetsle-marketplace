#!/bin/bash

# FIXED DEPLOYMENT SCRIPT - Dynamic stack naming and error handling
# This ensures consistent environment variables and resource references

set -e

echo "🚀 Starting marketplace deployment..."

# Generate dynamic stack name based on timestamp
TIMESTAMP=$(date +%s)
STACK_NAME="MP-${TIMESTAMP}"

echo "📝 Using stack name: $STACK_NAME"

# Step 1: Deploy backend infrastructure via CDK
echo "📦 Deploying backend infrastructure..."
cd packages/infrastructure

# Update CDK context to use new stack name
export CDK_STACK_NAME="$STACK_NAME"
npm run deploy

# Step 2: Wait for stack to be ready and extract resource IDs
echo "⏳ Waiting for stack deployment to complete..."
aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region us-east-1 || \
aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region us-east-1

echo "🔍 Extracting resource IDs from new stack..."

# Function to safely get stack output
get_stack_output() {
    local output_key=$1
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text \
        --region us-east-1 2>/dev/null || echo ""
}

API_URL=$(get_stack_output "ApiGatewayUrl")
USER_POOL_ID=$(get_stack_output "UserPoolId")
CLIENT_ID=$(get_stack_output "UserPoolClientId")
BUCKET_NAME=$(get_stack_output "WebsiteBucketName")
DISTRIBUTION_ID=$(get_stack_output "CloudFrontDistributionId")

# Validate required outputs
if [[ -z "$API_URL" || -z "$USER_POOL_ID" || -z "$CLIENT_ID" ]]; then
    echo "❌ Failed to extract required stack outputs"
    echo "   API_URL: $API_URL"
    echo "   USER_POOL_ID: $USER_POOL_ID"
    echo "   CLIENT_ID: $CLIENT_ID"
    exit 1
fi

echo "   ✅ API Gateway URL: $API_URL"
echo "   ✅ User Pool ID: $USER_POOL_ID"
echo "   ✅ Client ID: $CLIENT_ID"
echo "   ✅ S3 Bucket: $BUCKET_NAME"
echo "   ✅ CloudFront ID: $DISTRIBUTION_ID"

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
VITE_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI

# Generated on: $(date)
# Stack: $STACK_NAME
EOF

echo "   ✅ Updated .env with current resource IDs"

# Step 4: Build frontend with correct environment variables
echo "🔨 Building frontend with updated configuration..."
npm run build

# Step 5: Deploy to S3 bucket (if available)
if [[ -n "$BUCKET_NAME" ]]; then
    echo "☁️ Syncing frontend to S3 bucket..."
    aws s3 sync dist/ s3://$BUCKET_NAME --delete
else
    echo "⚠️  No S3 bucket found in stack outputs"
fi

# Step 6: Deploy to production bucket (if exists)
if aws s3 ls s3://marketplace.cloudnestle.com >/dev/null 2>&1; then
    echo "☁️ Syncing frontend to production bucket (marketplace.cloudnestle.com)..."
    aws s3 sync dist/ s3://marketplace.cloudnestle.com --delete
else
    echo "ℹ️  Production bucket not found, skipping production sync"
fi

# Step 7: Invalidate CloudFront distributions
if [[ -n "$DISTRIBUTION_ID" ]]; then
    echo "🔄 Invalidating CDK CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1
fi

echo "🔄 Checking for production CloudFront distribution..."
PROD_DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[0].DomainName=='marketplace.cloudnestle.com.s3.amazonaws.com'].Id" \
    --output text 2>/dev/null || echo "")

if [[ -n "$PROD_DISTRIBUTION_ID" && "$PROD_DISTRIBUTION_ID" != "None" ]]; then
    aws cloudfront create-invalidation --distribution-id $PROD_DISTRIBUTION_ID --paths "/*" --region us-east-1
    echo "   ✅ Production CloudFront invalidated: $PROD_DISTRIBUTION_ID"
else
    echo "   ℹ️  No production CloudFront distribution found"
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Access your marketplace at:"
if [[ -n "$DISTRIBUTION_ID" ]]; then
    CLOUDFRONT_URL=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.DomainName' --output text 2>/dev/null || echo "")
    if [[ -n "$CLOUDFRONT_URL" ]]; then
        echo "   New CDK CloudFront: https://$CLOUDFRONT_URL"
    fi
fi
echo "   Production: https://marketplace.cloudnestle.com"
echo ""
echo "🔧 Backend Resources:"
echo "   Stack Name: $STACK_NAME"
echo "   API Gateway: $API_URL"
echo "   Cognito Pool: $USER_POOL_ID"
echo "   S3 Bucket: $BUCKET_NAME"
echo "   CloudFront: $DISTRIBUTION_ID"
echo ""
echo "📝 Environment file updated: packages/frontend/.env"
echo ""
echo "⚠️  IMPORTANT: Save this stack name for future operations: $STACK_NAME"
