#!/bin/bash

# Simple table migration script
SOURCE_TABLE="$1"
TARGET_TABLE="$2"

if [ -z "$SOURCE_TABLE" ] || [ -z "$TARGET_TABLE" ]; then
    echo "Usage: $0 <source_table> <target_table>"
    exit 1
fi

echo "🔄 Migrating $SOURCE_TABLE -> $TARGET_TABLE"

# Export data
echo "📤 Exporting data from $SOURCE_TABLE..."
aws dynamodb scan \
    --table-name "$SOURCE_TABLE" \
    --region us-east-1 \
    --profile default \
    --output json > /tmp/export.json

# Count items
ITEM_COUNT=$(jq '.Items | length' /tmp/export.json)
echo "📊 Found $ITEM_COUNT items"

if [ "$ITEM_COUNT" -eq 0 ]; then
    echo "✅ Table is empty, skipping"
    rm -f /tmp/export.json
    exit 0
fi

# Import each item individually to avoid batch issues
echo "📥 Importing items one by one..."
for i in $(seq 0 $((ITEM_COUNT-1))); do
    jq -n --argjson item "$(jq ".Items[$i]" /tmp/export.json)" \
       --arg table "$TARGET_TABLE" \
       '{
           TableName: $table,
           Item: $item
       }' > /tmp/item_$i.json
    
    aws dynamodb put-item \
        --cli-input-json file:///tmp/item_$i.json \
        --region us-east-1 \
        --profile member-account > /dev/null
    
    rm -f /tmp/item_$i.json
    
    if [ $((i % 10)) -eq 0 ]; then
        echo "   ✅ Imported $((i+1))/$ITEM_COUNT items"
    fi
done

echo "✅ Successfully migrated $ITEM_COUNT items from $SOURCE_TABLE to $TARGET_TABLE"
rm -f /tmp/export.json
