#!/bin/bash

# Safe deployment script to prevent infrastructure duplication
set -e

echo "🔍 Checking for existing marketplace stacks..."

# Check for existing stacks
EXISTING_STACKS=$(aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName, 'MP-')].StackName" \
  --output text)

if [ ! -z "$EXISTING_STACKS" ]; then
  echo "⚠️  Found existing marketplace stacks:"
  echo "$EXISTING_STACKS"
  echo ""
  read -p "Do you want to update the existing stack? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
  fi
fi

echo "🚀 Starting deployment..."

cd packages/infrastructure

# Bootstrap CDK if needed
echo "📦 Bootstrapping CDK..."
npm run bootstrap

# Deploy infrastructure
echo "🏗️  Deploying infrastructure..."
npm run deploy

# Update frontend environment
echo "🔧 Updating frontend configuration..."
cd ../frontend

# Get stack outputs
STACK_NAME=$(aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName, 'MP-')].StackName" \
  --output text | head -1)

if [ -z "$STACK_NAME" ]; then
  echo "❌ No marketplace stack found"
  exit 1
fi

echo "📋 Using stack: $STACK_NAME"

# Get outputs
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text)

API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
  --output text)

# Update .env file
cat > .env << EOF
# AWS Cognito Configuration (Auto-generated from CloudFormation)
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID

# API Configuration (Auto-generated from CloudFormation)
VITE_API_URL=$API_URL

# AWS Region
VITE_AWS_REGION=us-east-1

# Generated on: $(date -u)
# Stack: $STACK_NAME
EOF

echo "✅ Deployment completed successfully!"
echo "📝 Frontend configuration updated:"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $CLIENT_ID"
echo "   API URL: $API_URL"
