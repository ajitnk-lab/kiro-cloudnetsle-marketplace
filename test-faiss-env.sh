#!/bin/bash

echo "Testing FAISS .env creation..."

# Simulate the deploy script's FAISS configuration section
FAISS_DIR="${FAISS_PROJECT_DIR:-../../faiss-rag-agent}"

# Mock CloudFormation outputs (use actual values from previous deployment)
USER_TABLE_NAME="marketplace-users"
ENTITLEMENT_TABLE_NAME="marketplace-user-solution-entitlements"
SESSION_TABLE_NAME="marketplace-sessions"
API_URL="https://api.example.com"
STACK_NAME="MP-test"

if [ -d "$FAISS_DIR" ]; then
    # Create environment file for FAISS Lambda
    cat > $FAISS_DIR/.env << EOF
# Marketplace Integration (Auto-generated from CloudFormation)
MARKETPLACE_USER_TABLE_NAME=$USER_TABLE_NAME
MARKETPLACE_ENTITLEMENT_TABLE_NAME=$ENTITLEMENT_TABLE_NAME
MARKETPLACE_SESSION_TABLE_NAME=$SESSION_TABLE_NAME
MARKETPLACE_API_URL=$API_URL

# Generated on: $(date)
# Stack: $STACK_NAME
EOF
    echo "✅ FAISS .env created successfully"
    echo "📁 Location: $FAISS_DIR/.env"
    echo "📄 Contents:"
    cat $FAISS_DIR/.env
else
    echo "❌ FAISS directory not found at $FAISS_DIR"
    exit 1
fi
