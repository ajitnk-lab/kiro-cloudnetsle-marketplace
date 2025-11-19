# AWS SDK v3 Migration Guide

## Overview

This document details the migration from AWS SDK v2 to v3 for Node.js 18 Lambda runtime compatibility in the marketplace platform.

## Issue Identified

**Error**: `Cannot find module 'aws-sdk'`
**Root Cause**: Node.js 18 Lambda runtime does not include AWS SDK v2 by default, requiring migration to AWS SDK v3.

## Migration Steps Completed

### 1. Updated Lambda Function Code

**File**: `packages/infrastructure/lambda/auth/generate-solution-token.js`

**Before (AWS SDK v2)**:
```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Usage
await dynamodb.put({...}).promise();
```

**After (AWS SDK v3)**:
```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Usage
await docClient.send(new PutCommand({...}));
```

### 2. Fixed Timestamp Format

**Issue**: DynamoDB index expected numeric timestamp but received string
**Solution**: Changed from `new Date().toISOString()` to `Date.now()`

### 3. Aligned Database Schema

**Issue**: Lambda used camelCase fields but DynamoDB table expected snake_case with pk/sk keys
**Solution**: Updated field mapping:
- `userId` → `pk: USER#${userId}`, `user_email: userId`
- `solutionId` → `sk: SOLUTION#${solutionId}`, `solution_id: solutionId`
- `createdAt` → `created_at: new Date().toISOString()`

### 4. Updated Package Dependencies

**File**: `packages/infrastructure/lambda/auth/package.json`
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-cognito-identity-provider": "^3.400.0",
    "@aws-sdk/client-ses": "^3.400.0",
    "uuid": "^9.0.0"
  }
}
```

## Verification

**Test Command**:
```bash
curl -X POST https://y26tmcluvk.execute-api.us-east-1.amazonaws.com/prod/api/generate-solution-token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "solutionId": "faiss-solution", "tier": "registered"}'
```

**Expected Response**:
```json
{
  "success": true,
  "token": "28aa5087-d91e-4155-aaa0-e06e70a289c1",
  "userId": "test-user",
  "solutionId": "faiss-solution",
  "tier": "registered"
}
```

## Impact

- ✅ Control Plane MVP fully operational
- ✅ Marketplace token validation working
- ✅ FAISS backend integration functional
- ✅ Node.js 18 Lambda runtime compatibility achieved

## Related Files

- `packages/infrastructure/lambda/auth/generate-solution-token.js`
- `packages/infrastructure/lambda/auth/validate-token.js`
- `packages/infrastructure/lambda/tokens/solution-token-generator.js`
- `packages/infrastructure/lambda/tokens/solution-token-validator.js`

## Migration Checklist for Future Lambda Functions

- [ ] Replace `require('aws-sdk')` with specific AWS SDK v3 imports
- [ ] Update `new AWS.Service()` to `new ServiceClient({})`
- [ ] Replace `.promise()` calls with `client.send(new Command())`
- [ ] Verify timestamp formats match DynamoDB index requirements
- [ ] Align field names with actual database schema
- [ ] Update package.json dependencies to AWS SDK v3
- [ ] Test Lambda function deployment and execution
