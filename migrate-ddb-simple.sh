#!/bin/bash

set -e

echo "🚀 Starting DynamoDB data migration..."
echo "📊 Migrating from original account (default) to member account (member-account)"

# Table mappings
declare -A TABLE_MAPPINGS=(
    ["marketplace-users"]="marketplace-users-1764183053"
    ["marketplace-solutions"]="marketplace-solutions-1764183053"
    ["marketplace-sessions"]="marketplace-sessions-1764183053"
    ["marketplace-user-solution-entitlements"]="marketplace-user-solution-entitlements-1764183053"
    ["marketplace-partner-applications"]="marketplace-partner-applications-1764183053"
    ["marketplace-payment-transactions"]="marketplace-payment-transactions-1764183053"
    ["marketplace-tokens"]="marketplace-tokens-1764183053"
    ["marketplace-user-sessions"]="marketplace-user-sessions-1764183053"
    ["marketplace-api-metrics"]="marketplace-api-metrics-1764183053"
)

REGION="us-east-1"
TEMP_DIR="/tmp/ddb-migration"
mkdir -p "$TEMP_DIR"

migrate_table() {
    local source_table="$1"
    local target_table="$2"
    local temp_file="$TEMP_DIR/${source_table}.json"
    
    echo ""
    echo "🔄 Migrating $source_table -> $target_table"
    
    # Export data from source table
    echo "📤 Exporting data from $source_table..."
    aws dynamodb scan \
        --table-name "$source_table" \
        --region "$REGION" \
        --profile default \
        --output json > "$temp_file"
    
    # Check if table has data
    local item_count=$(jq '.Items | length' "$temp_file")
    echo "📊 Found $item_count items in $source_table"
    
    if [ "$item_count" -eq 0 ]; then
        echo "✅ $source_table is empty, skipping"
        rm -f "$temp_file"
        return 0
    fi
    
    # Import data to target table in batches
    echo "📥 Importing $item_count items to $target_table..."
    
    # Split items into batches of 25 (DynamoDB batch limit)
    local batch_size=25
    local total_batches=$(( (item_count + batch_size - 1) / batch_size ))
    
    for ((batch=0; batch<total_batches; batch++)); do
        local start_index=$((batch * batch_size))
        local batch_file="$TEMP_DIR/${source_table}_batch_${batch}.json"
        
        # Create batch request
        jq --argjson start "$start_index" --argjson size "$batch_size" \
           --arg target_table "$target_table" \
           '{
               RequestItems: {
                   ($target_table): [
                       .Items[$start:$start+$size][] | {
                           PutRequest: {
                               Item: .
                           }
                       }
                   ]
               }
           }' "$temp_file" > "$batch_file"
        
        # Execute batch write
        aws dynamodb batch-write-item \
            --request-items file://"$batch_file" \
            --region "$REGION" \
            --profile member-account > /dev/null
        
        echo "   ✅ Batch $((batch + 1))/$total_batches completed"
        rm -f "$batch_file"
    done
    
    echo "✅ Successfully migrated $item_count items from $source_table to $target_table"
    rm -f "$temp_file"
}

# Migrate all tables
total_migrated=0
total_tables=${#TABLE_MAPPINGS[@]}

for source_table in "${!TABLE_MAPPINGS[@]}"; do
    target_table="${TABLE_MAPPINGS[$source_table]}"
    
    if migrate_table "$source_table" "$target_table"; then
        ((total_migrated++))
    else
        echo "❌ Failed to migrate $source_table, continuing..."
    fi
done

echo ""
echo "✅ Migration completed! Successfully migrated $total_migrated/$total_tables tables"
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"
echo "🎉 All done!"
