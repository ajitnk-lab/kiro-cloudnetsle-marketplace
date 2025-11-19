#!/bin/bash

# Fix DynamoDB Table Deletion Protection
# Enables deletion protection on tables that are missing it

set -e

echo "🔒 Enabling deletion protection on marketplace tables..."

# Tables that need deletion protection enabled
TABLES=(
    "marketplace-tokens"
    "marketplace-sessions"
)

# Enable deletion protection on each table
for table in "${TABLES[@]}"; do
    echo "   🔧 Enabling deletion protection for: $table"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name "$table" >/dev/null 2>&1; then
        # Enable deletion protection
        aws dynamodb update-table \
            --table-name "$table" \
            --deletion-protection-enabled
        
        echo "   ✅ Deletion protection enabled for: $table"
    else
        echo "   ⚠️  Table not found: $table"
    fi
done

echo ""
echo "🔍 Verifying deletion protection status..."

# Verify all marketplace tables
ALL_TABLES=(
    "marketplace-users"
    "marketplace-partner-applications"
    "marketplace-solutions"
    "marketplace-payment-transactions"
    "marketplace-user-solution-entitlements"
    "marketplace-tokens"
    "marketplace-sessions"
)

for table in "${ALL_TABLES[@]}"; do
    if aws dynamodb describe-table --table-name "$table" >/dev/null 2>&1; then
        PROTECTION=$(aws dynamodb describe-table --table-name "$table" --query "Table.DeletionProtectionEnabled" --output text)
        if [ "$PROTECTION" = "True" ]; then
            echo "   ✅ $table - Deletion Protection: ENABLED"
        else
            echo "   ❌ $table - Deletion Protection: DISABLED"
        fi
    else
        echo "   ⚠️  $table - TABLE NOT FOUND"
    fi
done

echo ""
echo "✅ Deletion protection setup completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Run this script to enable protection on missing tables"
echo "   2. Deploy your CDK stack normally with: ./deploy-full.sh"
echo "   3. All tables will be protected from accidental deletion"
