#!/bin/bash

set -e

USER_POOL_ID="us-east-1_p1hItqB3S"
TABLE_NAME="marketplace-users-1764183053"
REGION="us-east-1"
PROFILE="member-account"

echo "🚀 Starting Cognito user sync..."
echo "📊 Syncing users from $TABLE_NAME to Cognito pool $USER_POOL_ID"

# Export users from DynamoDB
echo "📤 Exporting users from DynamoDB..."
aws dynamodb scan \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --output json > /tmp/users.json

# Count users
USER_COUNT=$(jq '.Items | length' /tmp/users.json)
echo "📋 Found $USER_COUNT users in DynamoDB"

# Count by role
echo "👥 User breakdown by role:"
jq -r '.Items[] | .role.S // "customer"' /tmp/users.json | sort | uniq -c | while read count role; do
    echo "   $role: $count users"
done

echo ""
echo "🔄 Creating Cognito users..."

created=0
skipped=0
failed=0

for i in $(seq 0 $((USER_COUNT-1))); do
    # Extract user data
    email=$(jq -r ".Items[$i].email.S // empty" /tmp/users.json)
    role=$(jq -r ".Items[$i].role.S // \"customer\"" /tmp/users.json)
    userId=$(jq -r ".Items[$i].userId.S // empty" /tmp/users.json)
    name=$(jq -r ".Items[$i].profile.M.name.S // \"User\"" /tmp/users.json)
    country=$(jq -r ".Items[$i].profile.M.country.S // .Items[$i].country.S // \"Unknown\"" /tmp/users.json)
    company=$(jq -r ".Items[$i].profile.M.company.S // empty" /tmp/users.json)
    
    if [ -z "$email" ] || [ "$email" = "null" ]; then
        echo "⚠️  Skipping user without email: $userId"
        ((skipped++))
        continue
    fi
    
    # Create user attributes
    user_attributes="Name=email,Value=$email Name=email_verified,Value=true Name=custom:role,Value=$role Name=custom:userId,Value=$userId Name=name,Value=$name Name=custom:country,Value=$country"
    
    # Add company for partners
    if [ "$role" = "partner" ] && [ -n "$company" ] && [ "$company" != "null" ]; then
        user_attributes="$user_attributes Name=custom:company,Value=$company"
    fi
    
    # Create Cognito user
    if aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$email" \
        --user-attributes $user_attributes \
        --message-action SUPPRESS \
        --temporary-password "TempPass123!" \
        --region "$REGION" \
        --profile "$PROFILE" > /dev/null 2>&1; then
        
        echo "✅ Created: $email ($role)"
        ((created++))
    else
        # Check if user already exists
        if aws cognito-idp admin-get-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "$email" \
            --region "$REGION" \
            --profile "$PROFILE" > /dev/null 2>&1; then
            echo "⚠️  Already exists: $email"
            ((skipped++))
        else
            echo "❌ Failed to create: $email"
            ((failed++))
        fi
    fi
    
    # Progress indicator
    if [ $((i % 10)) -eq 0 ]; then
        echo "   Progress: $((i+1))/$USER_COUNT users processed"
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.1
done

echo ""
echo "✅ Cognito user sync completed!"
echo "📊 Results:"
echo "   Created: $created users"
echo "   Skipped: $skipped users"
echo "   Failed: $failed users"

# Cleanup
rm -f /tmp/users.json

echo "🎉 All done!"
