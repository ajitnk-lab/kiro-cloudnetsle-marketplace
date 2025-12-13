#!/bin/bash

# IMPORT EXISTING GST RESOURCES INTO CLOUDFORMATION STACK
# Root cause: CompanySettingsTable and InvoiceBucket exist but aren't in the stack
# Solution: Use CloudFormation resource import to add them

set -e

echo "🔧 Importing existing GST resources into CloudFormation stack..."

STACK_NAME="MarketplaceStack-Clean"
REGION="us-east-1"

# Step 1: Create a change set for resource import
echo "📝 Creating import change set..."

# Create resources-to-import.json
cat > /tmp/resources-to-import.json << 'EOF'
[
  {
    "ResourceType": "AWS::DynamoDB::Table",
    "LogicalResourceId": "DataStackCompanySettingsTable691FA35F",
    "ResourceIdentifier": {
      "TableName": "marketplace-company-settings-1764183053"
    }
  },
  {
    "ResourceType": "AWS::S3::Bucket",
    "LogicalResourceId": "DataStackInvoiceBucket65FDB85F",
    "ResourceIdentifier": {
      "BucketName": "marketplace-invoices-1764183053"
    }
  }
]
EOF

echo "   ✅ Created resources-to-import.json"

# Step 2: Generate current template
echo "📦 Generating CloudFormation template..."
cd /home/ubuntu/workspace/kiro-cloudnetsle-marketplace/packages/infrastructure
npx cdk synth MarketplaceStack-Clean > /tmp/marketplace-template.yaml

echo "   ✅ Template generated"

# Step 3: Create import change set
echo "🔄 Creating import change set..."
aws cloudformation create-change-set \
  --stack-name $STACK_NAME \
  --change-set-name import-gst-resources \
  --change-set-type IMPORT \
  --resources-to-import file:///tmp/resources-to-import.json \
  --template-body file:///tmp/marketplace-template.yaml \
  --region $REGION \
  --capabilities CAPABILITY_IAM

echo "   ✅ Import change set created"

# Step 4: Wait for change set to be ready
echo "⏳ Waiting for change set to be ready..."
aws cloudformation wait change-set-create-complete \
  --stack-name $STACK_NAME \
  --change-set-name import-gst-resources \
  --region $REGION

echo "   ✅ Change set ready"

# Step 5: Execute the import
echo "🚀 Executing import..."
aws cloudformation execute-change-set \
  --stack-name $STACK_NAME \
  --change-set-name import-gst-resources \
  --region $REGION

echo "   ✅ Import initiated"

# Step 6: Wait for import to complete
echo "⏳ Waiting for import to complete..."
aws cloudformation wait stack-import-complete \
  --stack-name $STACK_NAME \
  --region $REGION

echo ""
echo "✅ GST resources successfully imported into CloudFormation stack!"
echo ""
echo "📋 Imported resources:"
echo "   - DynamoDB Table: marketplace-company-settings-1764183053"
echo "   - S3 Bucket: marketplace-invoices-1764183053"
echo ""
echo "🎯 Next step: Run deploy-full.sh to complete deployment"
