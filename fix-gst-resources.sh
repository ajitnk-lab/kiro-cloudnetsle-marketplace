#!/bin/bash

# FIX GST RESOURCES - Remove existing resources so CloudFormation can create them
# Root cause: Resources exist outside CloudFormation, blocking stack updates
# Solution: Backup data, delete resources, let CloudFormation recreate them

set -e

echo "🔧 Fixing GST resource conflict..."

REGION="us-east-1"
TABLE_NAME="marketplace-company-settings-1764183053"
BUCKET_NAME="marketplace-invoices-1764183053"

# Step 1: Backup company settings table data
echo "💾 Backing up company settings table..."
aws dynamodb scan \
  --table-name $TABLE_NAME \
  --region $REGION \
  --output json > /tmp/company-settings-backup.json

ITEM_COUNT=$(jq '.Items | length' /tmp/company-settings-backup.json)
echo "   ✅ Backed up $ITEM_COUNT items"

# Step 2: Backup invoice bucket (if it has any files)
echo "💾 Checking invoice bucket..."
FILE_COUNT=$(aws s3 ls s3://$BUCKET_NAME --recursive --region $REGION | wc -l)

if [ $FILE_COUNT -gt 0 ]; then
    echo "   📦 Backing up $FILE_COUNT files from invoice bucket..."
    aws s3 sync s3://$BUCKET_NAME /tmp/invoice-backup/ --region $REGION
    echo "   ✅ Backed up invoice files"
else
    echo "   ✅ Invoice bucket is empty, no backup needed"
fi

# Step 3: Delete the DynamoDB table
echo "🗑️  Deleting company settings table..."
aws dynamodb delete-table \
  --table-name $TABLE_NAME \
  --region $REGION

echo "   ⏳ Waiting for table deletion..."
aws dynamodb wait table-not-exists \
  --table-name $TABLE_NAME \
  --region $REGION

echo "   ✅ Table deleted"

# Step 4: Delete the S3 bucket
echo "🗑️  Deleting invoice bucket..."
# Empty the bucket first
aws s3 rm s3://$BUCKET_NAME --recursive --region $REGION 2>/dev/null || true

# Delete the bucket
aws s3 rb s3://$BUCKET_NAME --region $REGION

echo "   ✅ Bucket deleted"

echo ""
echo "✅ GST resources removed successfully!"
echo ""
echo "📋 Backup locations:"
echo "   - Table data: /tmp/company-settings-backup.json"
if [ $FILE_COUNT -gt 0 ]; then
    echo "   - Invoice files: /tmp/invoice-backup/"
fi
echo ""
echo "🎯 Next step: Run deploy-full-fixed-validation.sh to redeploy"
echo ""
echo "📝 Note: After deployment, restore data using:"
echo "   - Company settings will be reseeded automatically"
if [ $FILE_COUNT -gt 0 ]; then
    echo "   - Restore invoices: aws s3 sync /tmp/invoice-backup/ s3://$BUCKET_NAME"
fi
