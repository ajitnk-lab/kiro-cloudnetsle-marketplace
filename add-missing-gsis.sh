#!/bin/bash

TABLE_NAME="marketplace-solutions-1765187391128"
REGION="us-east-1"

echo "Waiting for StatusIndex to become ACTIVE..."
while true; do
  STATUS=$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --query 'Table.GlobalSecondaryIndexes[?IndexName==`StatusIndex`].IndexStatus' --output text 2>/dev/null)
  echo "StatusIndex status: $STATUS"
  if [ "$STATUS" = "ACTIVE" ]; then
    echo "StatusIndex is ACTIVE!"
    break
  fi
  sleep 10
done

echo ""
echo "Adding PartnerIndex GSI..."
aws dynamodb update-table \
  --table-name $TABLE_NAME \
  --region $REGION \
  --attribute-definitions \
    AttributeName=solutionId,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=updatedAt,AttributeType=S \
    AttributeName=partnerId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"PartnerIndex\",\"KeySchema\":[{\"AttributeName\":\"partnerId\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]"

echo ""
echo "Waiting for PartnerIndex to become ACTIVE..."
while true; do
  STATUS=$(aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --query 'Table.GlobalSecondaryIndexes[?IndexName==`PartnerIndex`].IndexStatus' --output text 2>/dev/null)
  echo "PartnerIndex status: $STATUS"
  if [ "$STATUS" = "ACTIVE" ]; then
    echo "PartnerIndex is ACTIVE!"
    break
  fi
  sleep 10
done

echo ""
echo "Adding CategoryIndex GSI..."
aws dynamodb update-table \
  --table-name $TABLE_NAME \
  --region $REGION \
  --attribute-definitions \
    AttributeName=solutionId,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=updatedAt,AttributeType=S \
    AttributeName=partnerId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
    AttributeName=category,AttributeType=S \
    AttributeName=name,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"CategoryIndex\",\"KeySchema\":[{\"AttributeName\":\"category\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"name\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]"

echo ""
echo "All GSIs added successfully!"
echo "Run 'aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION' to check status"
