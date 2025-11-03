#!/bin/bash

# Create Default Admin User Script
set -e

# Configuration
ADMIN_EMAIL="admin@marketplace.com"
ADMIN_PASSWORD="Admin123!"
USER_POOL_ID="us-east-1_lKhnKTI2O"
REGION="us-east-1"

echo "🔧 Creating default admin user..."

# Check if admin user already exists
EXISTING_USER=$(aws cognito-idp list-users \
  --user-pool-id $USER_POOL_ID \
  --region $REGION \
  --filter "email = \"$ADMIN_EMAIL\"" \
  --query "Users[0].Username" \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_USER" != "None" ] && [ "$EXISTING_USER" != "" ]; then
  echo "⚠️  Admin user already exists: $ADMIN_EMAIL"
  echo "🔄 Updating user attributes..."
  
  # Update existing user role to admin
  aws cognito-idp admin-update-user-attributes \
    --user-pool-id $USER_POOL_ID \
    --username $EXISTING_USER \
    --user-attributes Name=custom:role,Value=admin \
    --region $REGION
    
  echo "✅ Updated existing user role to admin"
else
  echo "👤 Creating new admin user..."
  
  # Create admin user
  aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username $ADMIN_EMAIL \
    --user-attributes \
      Name=email,Value=$ADMIN_EMAIL \
      Name=given_name,Value=Admin \
      Name=family_name,Value=User \
      Name=custom:role,Value=admin \
      Name=email_verified,Value=true \
    --temporary-password $ADMIN_PASSWORD \
    --message-action SUPPRESS \
    --region $REGION

  echo "🔑 Setting permanent password..."
  
  # Set permanent password
  aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username $ADMIN_EMAIL \
    --password $ADMIN_PASSWORD \
    --permanent \
    --region $REGION
    
  echo "✅ Created admin user successfully"
fi

echo ""
echo "🎯 Admin User Credentials:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
echo "   Role: admin"
echo ""
echo "🌐 Login at: http://marketplace-frontend-20251007232833.s3-website-us-east-1.amazonaws.com"
echo ""
echo "📝 Note: Change the password after first login for security!"
