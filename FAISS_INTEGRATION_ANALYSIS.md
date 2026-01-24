# FAISS Solution Finder Integration Analysis

**Date**: January 26, 2026  
**Status**: ✅ Production Active  
**Integration Type**: Two-App Architecture (Control Plane + Data Plane)

---

## Executive Summary

The CloudNestle Marketplace operates as a **control plane** managing user authentication, payments, and entitlements, while the FAISS Solution Finder acts as a **data plane** providing AWS solution search functionality with usage-based access control. The integration is fully functional with proper token validation, quota management, and tier-based access.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKETPLACE (Control Plane)                   │
│  URL: https://marketplace.cloudnestle.com                       │
│  Stack: MarketplaceStack-v3 (us-east-1)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ User Auth    │  │ Payments     │  │ Entitlements │         │
│  │ (Cognito)    │  │ (PayU)       │  │ (DynamoDB)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  API: https://ltp1ccays5.execute-api.us-east-1.amazonaws.com   │
│  Endpoint: POST /api/validate-solution-token                    │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Token Validation
                              │ Quota Checks
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FAISS SOLUTION FINDER (Data Plane)              │
│  URL: https://awssolutionfinder.solutions.cloudnestle.com       │
│  Stack: FaissRagStack (us-east-1)                              │
│  Code: ~/workspace/vscode-workspace/faiss-rag-agent            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ FAISS Index  │  │ Nova Pro LLM │  │ Usage Track  │         │
│  │ (S3)         │  │ (Bedrock)    │  │ (Local DDB)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Journey & Access Tiers

### 1. Anonymous User (Tier: `anonymous`)
- **Quota**: 3 searches total
- **Tracking**: Local DynamoDB in FAISS stack
- **No registration required**
- **Redirect**: After 3 searches → `/register?solution_id=aws-solution-finder`

### 2. Registered User (Tier: `registered`)
- **Quota**: 10 searches/day
- **Tracking**: Marketplace entitlements table
- **Token**: Generated upon registration
- **Reset**: Daily at midnight UTC

### 3. Pro User (Tier: `pro`)
- **Quota**: Unlimited searches
- **Payment**: ₹999/month via PayU
- **Expiry**: Auto-downgrade to `registered` after `pro_expires_at`
- **Token**: Same token, tier updated in entitlements

---

## Token Validation Flow

### FAISS Request → Marketplace Validation

```javascript
// FAISS Lambda: query_handler.py (Line 22-98)
function validate_marketplace_token(token, user_id, check_only=False):
    payload = {
        'token': token,
        'action': 'search',
        'solution_id': 'aws-solution-finder-001',
        'check_only': check_only  // Prevents usage increment
    }
    
    response = requests.post(
        f'{MARKETPLACE_API_URL}api/validate-solution-token',
        json=payload,
        timeout=5
    )
    
    if response.status_code == 200:
        data = response.json()
        
        // Pro users get unlimited access
        if data.get('access_tier') == 'pro':
            return {
                'user_id': data.get('user_email'),
                'tier': 'pro',
                'usage_remaining': -1,  // Unlimited
                'allowed': True
            }
        
        // Registered users get quota info
        return {
            'user_id': data.get('user_email'),
            'tier': data.get('access_tier', 'registered'),
            'usage_remaining': data.get('quota_remaining', 10),
            'allowed': data.get('allowed', False)
        }
    
    elif response.status_code == 429:
        // Quota exceeded
        return {
            'allowed': False,
            'quota_exceeded': True
        }
```

### Marketplace Validation Logic

```javascript
// Marketplace Lambda: solution-token-validator.js (Line 1-400)

// 1. Query entitlements table by email + solution_id
const pk = `user#${user_email}`
const sk = `solution#${solution_id}`

// 2. Validate token matches
if (token !== entitlement.token) {
    return 403 // Invalid token
}

// 3. Check pro expiry (auto-downgrade)
if (accessTier === 'pro' && entitlement.pro_expires_at) {
    const now = new Date()
    const expiryDate = new Date(entitlement.pro_expires_at)
    
    if (expiryDate <= now) {
        // Auto-downgrade to registered
        accessTier = 'registered'
        
        // Update database
        await updateTier(entitlement, 'registered')
        
        // Record in subscription history
        await recordDowngrade(user_email, solution_id)
    }
}

// 4. Pro users: unlimited access
if (accessTier === 'pro') {
    return {
        statusCode: 200,
        body: {
            allowed: true,
            access_tier: 'pro',
            quota_remaining: -1,
            quota: {
                daily_limit: -1,
                daily_used: 0,
                unlimited: true
            }
        }
    }
}

// 5. Registered users: check daily quota
const limits = { daily: 10, monthly: 300 }
const today = new Date().toISOString().split('T')[0]

// Handle both old and new entitlement formats
let todayUsage = 0
if (entitlement.dailyUsage !== undefined) {
    // New UUID-based format
    todayUsage = (entitlement.lastUsageDate === today) 
        ? entitlement.dailyUsage 
        : 0
} else {
    // Old email-based format
    todayUsage = entitlement.usage?.daily_usage?.[today] || 0
}

if (todayUsage >= limits.daily) {
    return {
        statusCode: 429,
        body: {
            error: 'Quota exceeded',
            limit: 10,
            used: todayUsage
        }
    }
}

// 6. Increment usage (unless check_only=true)
if (!check_only) {
    await incrementDailyUsage(entitlement, today)
}

return {
    statusCode: 200,
    body: {
        allowed: true,
        access_tier: 'registered',
        quota_remaining: 10 - todayUsage,
        quota: {
            daily_limit: 10,
            daily_used: todayUsage
        }
    }
}
```

---

## Database Schema

### Marketplace: `marketplace-user-solution-entitlements-prod`

#### New Format (UUID-based, recommended)
```javascript
{
    pk: "user#uuid-123",                    // Partition key
    sk: "solution#aws-solution-finder-001", // Sort key
    userId: "uuid-123",
    userEmail: "user@example.com",
    solutionId: "aws-solution-finder-001",
    token: "tok_abc123...",                 // 32-char token
    tier: "pro",                            // or "registered"
    accessTier: "pro",                      // Duplicate for compatibility
    access_tier: "pro",                     // Duplicate for compatibility
    status: "active",
    dailyUsage: 5,                          // Simple counter
    dailyLimit: -1,                         // -1 = unlimited
    lastUsageDate: "2026-01-26",           // ISO date
    pro_expires_at: "2026-02-26T10:30:00Z", // ISO timestamp
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-26T14:30:00Z"
}
```

#### Old Format (Email-based, legacy)
```javascript
{
    pk: "user#user@example.com",
    sk: "solution#aws-solution-finder-001",
    user_email: "user@example.com",
    solution_id: "aws-solution-finder-001",
    token: "tok_abc123...",
    tier: "registered",
    status: "active",
    usage: {
        daily_usage: {
            "2026-01-26": 5,
            "2026-01-25": 8
        },
        monthly_usage: {
            "2026-01": 45
        }
    },
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-26T14:30:00Z"
}
```

### FAISS: Local Anonymous Tracking
```javascript
// Table: faiss-anonymous-usage (local to FAISS stack)
{
    session_id: "sess_xyz789",
    search_count: 2,
    last_search: "2026-01-26T14:30:00Z",
    ttl: 1738000000  // 7 days
}
```

---

## Critical Integration Points

### 1. Environment Configuration

**FAISS `.env` (Auto-generated by `deploy-full.sh`)**
```bash
# /persistent/vscode-workspace/faiss-rag-agent/.env
MARKETPLACE_USER_TABLE_NAME=marketplace-users-prod
MARKETPLACE_ENTITLEMENT_TABLE_NAME=marketplace-user-solution-entitlements-prod
MARKETPLACE_SESSION_TABLE_NAME=marketplace-sessions-prod
MARKETPLACE_API_URL=https://ltp1ccays5.execute-api.us-east-1.amazonaws.com/prod/

# Generated on: Sat Jan 24 05:22:34 UTC 2026
# Stack: MarketplaceStack-v3 (Account: 637423202175)
# Region: us-east-1
```

**Marketplace `deploy-full.sh` (Lines 50-80)**
```bash
# Extract table names from CloudFormation
USER_TABLE_NAME=$(aws cloudformation describe-stacks \
    --stack-name MarketplaceStack-v3 \
    --query 'Stacks[0].Outputs[?OutputKey==`UserTableName`].OutputValue' \
    --output text)

ENTITLEMENT_TABLE_NAME=$(aws cloudformation describe-stacks \
    --stack-name MarketplaceStack-v3 \
    --query 'Stacks[0].Outputs[?OutputKey==`EntitlementTableName`].OutputValue' \
    --output text)

# Update FAISS .env
cat > ~/workspace/vscode-workspace/faiss-rag-agent/.env << EOF
MARKETPLACE_USER_TABLE_NAME=$USER_TABLE_NAME
MARKETPLACE_ENTITLEMENT_TABLE_NAME=$ENTITLEMENT_TABLE_NAME
MARKETPLACE_SESSION_TABLE_NAME=$SESSION_TABLE_NAME
MARKETPLACE_API_URL=$API_URL
EOF
```

### 2. Token Generation

**Marketplace: `solution-token-generator.js`**
```javascript
// Generate 32-character secure token
const token = crypto.randomBytes(16).toString('hex')

// Store in entitlements table
await docClient.send(new PutCommand({
    TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
    Item: {
        pk: `user#${userId}`,
        sk: `solution#${solutionId}`,
        token: token,
        tier: 'registered',
        dailyUsage: 0,
        dailyLimit: 10,
        status: 'active',
        createdAt: new Date().toISOString()
    }
}))
```

### 3. Payment Success → Pro Upgrade

**Marketplace: `payment-success-handler.js`**
```javascript
// After PayU payment verification
const proExpiresAt = new Date()
proExpiresAt.setMonth(proExpiresAt.getMonth() + 1)

await docClient.send(new UpdateCommand({
    TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
    Key: { 
        pk: `user#${userId}`, 
        sk: `solution#${solutionId}` 
    },
    UpdateExpression: 'SET tier = :tier, accessTier = :tier, access_tier = :tier, dailyLimit = :limit, pro_expires_at = :expires',
    ExpressionAttributeValues: {
        ':tier': 'pro',
        ':limit': -1,  // Unlimited
        ':expires': proExpiresAt.toISOString()
    }
}))
```

---

## Quota Management

### Daily Reset Logic

**Marketplace Validator**
```javascript
const today = new Date().toISOString().split('T')[0]  // "2026-01-26"

// New format: Simple comparison
if (entitlement.lastUsageDate !== today) {
    // New day → reset counter
    todayUsage = 0
} else {
    todayUsage = entitlement.dailyUsage
}

// Old format: Check nested object
const dailyUsage = entitlement.usage?.daily_usage || {}
todayUsage = dailyUsage[today] || 0
```

### Usage Increment

**With `check_only=false` (default)**
```javascript
// Increment usage after validation
const newUsage = todayUsage + 1

await docClient.send(new UpdateCommand({
    TableName: USER_SOLUTION_ENTITLEMENTS_TABLE,
    Key: { pk: entitlement.pk, sk: entitlement.sk },
    UpdateExpression: 'SET dailyUsage = :usage, lastUsageDate = :today, updatedAt = :now',
    ExpressionAttributeValues: {
        ':usage': newUsage,
        ':today': today,
        ':now': new Date().toISOString()
    }
}))
```

**With `check_only=true`**
```javascript
// Only validate, don't increment
// Used for UI display of remaining quota
return {
    allowed: true,
    quota_remaining: 10 - todayUsage
}
```

---

## Error Handling

### FAISS Side

```python
# query_handler.py (Line 88-98)
try:
    response = requests.post(marketplace_api_url, json=payload, timeout=5)
    
    if response.status_code == 200:
        return validation_result
    elif response.status_code == 429:
        return {'allowed': False, 'quota_exceeded': True}
    else:
        print(f"❌ Validation failed: {response.status_code}")
        return None
        
except Exception as e:
    print(f"🚨 Marketplace validation error: {e}")
    return None
```

### Marketplace Side

```javascript
// solution-token-validator.js (Line 200-250)

// 1. Missing token or solution_id
if (!token || !solution_id) {
    return {
        statusCode: 400,
        body: { error: 'Missing required fields' }
    }
}

// 2. No entitlement found
if (!result.Items || result.Items.length === 0) {
    return {
        statusCode: 403,
        body: { error: 'No valid entitlement found' }
    }
}

// 3. Token mismatch
if (token !== entitlement.token) {
    return {
        statusCode: 403,
        body: { error: 'Invalid token' }
    }
}

// 4. Quota exceeded
if (todayUsage >= limits.daily) {
    return {
        statusCode: 429,
        body: {
            error: 'Quota exceeded',
            limit: limits.daily,
            used: todayUsage
        }
    }
}
```

---

## Deployment Process

### Marketplace Deployment

```bash
cd ~/workspace/vscode-workspace/kiro-cloudnetsle-marketplace
./deploy-full.sh

# What it does:
# 1. Deploy CDK stack (MarketplaceStack-v3)
# 2. Extract CloudFormation outputs
# 3. Update FAISS .env with table names and API URL
# 4. Build frontend (npm run build)
# 5. Sync to S3 (marketplace-frontend-1769235527854)
# 6. Invalidate CloudFront (E1SRB6DQ5H61D)
# 7. Seed company settings
```

### FAISS Deployment

```bash
cd ~/workspace/vscode-workspace/faiss-rag-agent
./deploy.sh

# What it does:
# 1. Read .env for marketplace integration
# 2. Deploy CDK stack (FaissRagStack)
# 3. Package Lambda with dependencies
# 4. Upload FAISS index to S3
# 5. Configure API Gateway
```

---

## Testing & Verification

### 1. Test Token Validation

```bash
# Get user token from marketplace
TOKEN=$(aws dynamodb get-item \
    --table-name marketplace-user-solution-entitlements-prod \
    --key '{"pk":{"S":"user#test@example.com"},"sk":{"S":"solution#aws-solution-finder-001"}}' \
    --query 'Item.token.S' \
    --output text)

# Test validation endpoint
curl -X POST https://ltp1ccays5.execute-api.us-east-1.amazonaws.com/prod/api/validate-solution-token \
    -H "Content-Type: application/json" \
    -d '{
        "token": "'$TOKEN'",
        "user_email": "test@example.com",
        "solution_id": "aws-solution-finder-001",
        "check_only": true
    }'

# Expected response (registered user):
{
    "allowed": true,
    "user_email": "test@example.com",
    "access_tier": "registered",
    "quota_remaining": 7,
    "quota": {
        "daily_limit": 10,
        "daily_used": 3
    }
}

# Expected response (pro user):
{
    "allowed": true,
    "user_email": "pro@example.com",
    "access_tier": "pro",
    "quota_remaining": -1,
    "quota": {
        "daily_limit": -1,
        "daily_used": 0,
        "unlimited": true
    }
}
```

### 2. Test FAISS Search

```bash
# Search with valid token
curl -X POST https://awssolutionfinder.solutions.cloudnestle.com/search \
    -H "Content-Type: application/json" \
    -d '{
        "query": "serverless architecture",
        "marketplace_token": "'$TOKEN'",
        "marketplace_user_id": "test@example.com"
    }'
```

### 3. Check Entitlement by Email

```bash
aws dynamodb query \
    --table-name marketplace-user-solution-entitlements-prod \
    --key-condition-expression "pk = :pk AND sk = :sk" \
    --expression-attribute-values '{
        ":pk": {"S": "user#test@example.com"},
        ":sk": {"S": "solution#aws-solution-finder-001"}
    }'
```

### 4. Check Entitlement by UUID

```bash
aws dynamodb query \
    --table-name marketplace-user-solution-entitlements-prod \
    --key-condition-expression "pk = :pk AND sk = :sk" \
    --expression-attribute-values '{
        ":pk": {"S": "user#uuid-123"},
        ":sk": {"S": "solution#aws-solution-finder-001"}
    }'
```

---

## Known Issues & Solutions

### Issue 1: Entitlement Not Found (Email vs UUID)

**Problem**: FAISS passes email, but entitlement uses UUID as pk

**Solution**: Always check both formats
```javascript
// Try email first
let entitlement = await queryByEmail(user_email)

// Fallback to UUID lookup
if (!entitlement) {
    const user = await getUserByEmail(user_email)
    entitlement = await queryByUUID(user.userId)
}
```

### Issue 2: Daily Usage Not Resetting

**Problem**: `lastUsageDate` not updated, causing stale counts

**Solution**: Always update `lastUsageDate` on increment
```javascript
UpdateExpression: 'SET dailyUsage = :usage, lastUsageDate = :today'
```

### Issue 3: Pro Expiry Not Auto-Downgrading

**Problem**: Users retain pro access after expiry

**Solution**: Check `pro_expires_at` on every validation (already implemented)
```javascript
if (accessTier === 'pro' && entitlement.pro_expires_at) {
    if (new Date(entitlement.pro_expires_at) <= new Date()) {
        accessTier = 'registered'
        await updateTier(entitlement, 'registered')
    }
}
```

### Issue 4: FAISS .env Out of Sync

**Problem**: FAISS uses old table names after marketplace redeployment

**Solution**: Always use `deploy-full.sh` (never direct CDK)
```bash
# ❌ Wrong
cd packages/infrastructure && cdk deploy

# ✅ Correct
./deploy-full.sh
```

---

## Security Considerations

### 1. Token Security
- **Length**: 32 characters (16 bytes hex)
- **Generation**: `crypto.randomBytes(16)`
- **Storage**: DynamoDB with encryption at rest
- **Transmission**: HTTPS only
- **Expiry**: Tied to user account (no separate token expiry)

### 2. API Authentication
- **CORS**: Restricted to cloudnestle.com domains
- **Rate Limiting**: Enforced via quota system
- **Input Validation**: All parameters validated
- **Error Messages**: Generic (no sensitive info leakage)

### 3. Data Privacy
- **IP Hashing**: User IPs hashed with salt before storage
- **Location Tracking**: Optional (env var controlled)
- **Session TTL**: 30 days auto-expiry
- **PII Handling**: Email stored, but not exposed in logs

---

## Monitoring & Analytics

### CloudWatch Metrics

**Marketplace Lambda: `solution-token-validator`**
- Invocations
- Errors (4xx, 5xx)
- Duration
- Throttles

**FAISS Lambda: `query_handler`**
- Search requests
- Token validation failures
- Quota exceeded events
- LLM invocations

### DynamoDB Metrics

**Entitlements Table**
- Read capacity units
- Write capacity units
- Throttled requests
- Item count

### Custom Metrics (Future)

```javascript
// Track in marketplace-api-metrics-prod
{
    pk: "endpoint#/api/validate-solution-token",
    sk: "2026-01-26T14:30:00Z",
    endpoint: "/api/validate-solution-token",
    method: "POST",
    statusCode: 200,
    duration: 45,
    tier: "registered",
    quotaExceeded: false
}
```

---

## Future Enhancements

### 1. Caching Layer
- **Redis/ElastiCache**: Cache token validations (5-minute TTL)
- **Benefit**: Reduce DynamoDB reads by 80%
- **Invalidation**: On tier upgrade or quota reset

### 2. Webhook Notifications
- **Quota Warnings**: Email at 80% usage
- **Pro Expiry**: Email 7 days before expiry
- **Downgrade Alerts**: Email on auto-downgrade

### 3. Usage Analytics Dashboard
- **Partner View**: Search trends, popular queries
- **Admin View**: Tier distribution, revenue metrics
- **User View**: Personal usage history

### 4. Multi-Solution Support
- **Current**: Single solution (aws-solution-finder-001)
- **Future**: Multiple solutions with separate quotas
- **Schema**: Already supports via `solution_id` field

### 5. API Key Authentication
- **Alternative**: API keys instead of tokens
- **Use Case**: Programmatic access for partners
- **Implementation**: Already partially implemented in FAISS

---

## Troubleshooting Guide

### Problem: "No valid entitlement found"

**Diagnosis**
```bash
# Check if entitlement exists
aws dynamodb query \
    --table-name marketplace-user-solution-entitlements-prod \
    --key-condition-expression "pk = :pk" \
    --expression-attribute-values '{":pk": {"S": "user#test@example.com"}}'
```

**Solutions**
1. User not registered → Redirect to `/register?solution_id=aws-solution-finder`
2. Wrong email format → Check for UUID vs email in pk
3. Entitlement deleted → Re-register user

### Problem: "Quota exceeded" but user is pro

**Diagnosis**
```bash
# Check tier and expiry
aws dynamodb get-item \
    --table-name marketplace-user-solution-entitlements-prod \
    --key '{"pk":{"S":"user#test@example.com"},"sk":{"S":"solution#aws-solution-finder-001"}}' \
    --query 'Item.{tier:tier.S,expires:pro_expires_at.S}'
```

**Solutions**
1. Pro expired → User auto-downgraded (expected behavior)
2. Tier not updated → Force update via payment handler
3. Cache issue → Clear CloudFront cache

### Problem: FAISS can't reach marketplace API

**Diagnosis**
```bash
# Check FAISS .env
cat ~/workspace/vscode-workspace/faiss-rag-agent/.env

# Test API from FAISS Lambda
aws lambda invoke \
    --function-name FaissRagStack-QueryHandler \
    --payload '{"test": true}' \
    response.json
```

**Solutions**
1. Wrong API URL → Run `deploy-full.sh` to regenerate .env
2. Network issue → Check VPC/security groups
3. API Gateway down → Check CloudWatch logs

---

## Contact & Support

**Marketplace Issues**
- Code: `/persistent/vscode-workspace/kiro-cloudnetsle-marketplace`
- Logs: CloudWatch → `/aws/lambda/MarketplaceStack-v3-*`
- Stack: `MarketplaceStack-v3` (us-east-1)

**FAISS Issues**
- Code: `/persistent/vscode-workspace/faiss-rag-agent`
- Logs: CloudWatch → `/aws/lambda/FaissRagStack-*`
- Stack: `FaissRagStack` (us-east-1)

**Deployment**
- Always use `deploy-full.sh` for marketplace
- Never deploy stacks independently
- Verify S3/CloudFront sync after every UI change

---

## Appendix: Key Files Reference

### Marketplace
- `deploy-full.sh` - Master deployment script
- `packages/infrastructure/lambda/tokens/solution-token-validator.js` - Token validation
- `packages/infrastructure/lambda/tokens/solution-token-generator.js` - Token generation
- `packages/infrastructure/lambda/payments/payment-success-handler.js` - Pro upgrade
- `packages/infrastructure/lib/data-stack.ts` - DynamoDB tables

### FAISS
- `.env` - Marketplace integration config (auto-generated)
- `lambda/query_handler.py` - Main search handler with token validation
- `cdk/lib/faiss-rag-stack.ts` - Infrastructure definition
- `deploy.sh` - FAISS deployment script

---

**Document Version**: 1.0  
**Last Updated**: January 26, 2026  
**Author**: Kiro AI Assistant  
**Status**: ✅ Production Ready
