#!/bin/bash

# Simple deployment wrapper that ensures FAISS .env file is created correctly
# This calls the main deployment script which handles construct-based architecture

set -e

echo "🚀 Deploying marketplace with FAISS integration..."

# Call the main deployment script that handles everything including FAISS .env
./deploy-full.sh

echo "✅ Deployment complete! FAISS .env file updated with correct table names."
