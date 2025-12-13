# Marketplace Stack Refactor Guide - Using Constructs

**Q CLI TODO ID: 1765126153627**
**Approach: Option 3 - Constructs (SAFEST)**

## Problem
Circular dependency in CloudFormation with 150+ API Gateway resources preventing GST feature deployment.

## Solution
Refactor using **Constructs** (not separate stacks):
- **DataConstruct** - All data resources and Lambda functions  
- **ApiConstruct** - API Gateway only (references DataConstruct)
- **Same stack name**: `MarketplaceStack-Clean`

## Why This Works
✅ Same stack name = no duplicate resources  
✅ Updates existing deployment in place  
✅ Works in new accounts (creates fresh)  
✅ Breaks circular dependency (Lambda before API)  
✅ FAISS integration safe (API URL unchanged)  
✅ 100% automated, zero manual steps

---

## Quick Start

```bash
# Build
cd packages/infrastructure
npm run build

# Deploy (existing or new account)
cdk deploy MarketplaceStack-Clean

# Seed GST data
node scripts/seed-company-settings.js
```

---

## Implementation Tasks

### 1. Create DataConstruct
**File:** `lib/constructs/data-construct.ts`

Move from existing code:
- All DynamoDB tables (keep SAME logical IDs)
- S3 buckets (assets + invoice)
- Cognito resources
- Lambda execution role
- ALL ~30 Lambda functions
- Export all Lambda functions as public properties

### 2. Create ApiConstruct  
**File:** `lib/constructs/api-construct.ts`

Contains:
- API Gateway RestApi (keep SAME logical ID)
- Cognito Authorizer
- All ~150 API routes
- References Lambda from DataConstruct props

### 3. Update Main Stack
**File:** `lib/marketplace-infrastructure-stack.ts`

```typescript
export class MarketplaceInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)
    
    const data = new DataConstruct(this, 'DataStack')
    const api = new ApiConstruct(this, 'ApiStack', {
      lambdas: data,
      userPool: data.userPool
    })
  }
}
```

### 4. Deploy
```bash
cdk deploy MarketplaceStack-Clean
```

### 5. Verify
- No duplicate resources
- API URL unchanged: `7kzsoygrzl`
- FAISS works
- GST payments work

---

## Key Points

**SAME Stack Name**
- Keep `MarketplaceStack-Clean` in `bin/marketplace-app.ts`
- CDK updates existing stack (no conflicts)

**SAME Logical IDs**
- Keep all resource IDs unchanged
- Example: `new dynamodb.Table(this, 'UserTable', ...)`
- CloudFormation sees existing resources, updates them

**No Duplicates**
- Same stack + same IDs = no duplication
- Safe for existing deployment

**Works Everywhere**
- Existing account: Updates in place
- New account: Creates fresh
- Same command: `cdk deploy MarketplaceStack-Clean`

---

## Files

**New:**
- `lib/constructs/data-construct.ts`
- `lib/constructs/api-construct.ts`

**Modified:**
- `lib/marketplace-infrastructure-stack.ts`

**Delete after:**
- `lib/data-stack.ts`
- `lib/api-stack.ts`

---

## Time Estimate
~3.5 hours total

---

## FAISS Integration
**No changes needed** - API URL stays the same.
