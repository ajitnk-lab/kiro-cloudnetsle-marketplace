# FAISS Integration Quick Reference

## 🔄 Complete User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: Anonymous User (3 searches)                                 │
└─────────────────────────────────────────────────────────────────────┘
    User visits: https://awssolutionfinder.solutions.cloudnestle.com
    ↓
    FAISS tracks locally (no marketplace call)
    ↓
    After 3 searches → Redirect to marketplace registration


┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Registration (10 searches/day)                              │
└─────────────────────────────────────────────────────────────────────┘
    User clicks: Register → marketplace.cloudnestle.com/register?solution_id=aws-solution-finder-001
    ↓
    Marketplace creates:
    - User account (marketplace-users-prod)
    - Entitlement (marketplace-user-solution-entitlements-prod)
    - Token (32-char hex)
    ↓
    User receives token → Can search 10 times/day


┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Search with Token                                           │
└─────────────────────────────────────────────────────────────────────┘
    FAISS receives search request with token
    ↓
    FAISS → POST /api/validate-solution-token
    {
        "token": "abc123...",
        "user_email": "user@example.com",
        "solution_id": "aws-solution-finder-001"
    }
    ↓
    Marketplace validates:
    1. Token exists? ✓
    2. Token matches? ✓
    3. Pro expired? Check pro_expires_at
    4. Quota remaining? Check dailyUsage
    ↓
    Response:
    {
        "allowed": true,
        "access_tier": "registered",
        "quota_remaining": 7
    }
    ↓
    FAISS executes search


┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Upgrade to Pro (Unlimited)                                  │
└─────────────────────────────────────────────────────────────────────┘
    User clicks: Upgrade to Pro → ₹999/month
    ↓
    PayU payment gateway
    ↓
    Payment success → Marketplace updates entitlement:
    {
        "tier": "pro",
        "dailyLimit": -1,
        "pro_expires_at": "2026-02-26T10:30:00Z"
    }
    ↓
    Next search → Unlimited access


┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: Pro Expiry (Auto-downgrade)                                 │
└─────────────────────────────────────────────────────────────────────┘
    30 days later → pro_expires_at reached
    ↓
    Next validation → Marketplace checks expiry
    ↓
    Expired? → Auto-downgrade:
    {
        "tier": "registered",
        "dailyLimit": 10,
        "dailyUsage": 0
    }
    ↓
    User back to 10 searches/day
```

---

## 🔑 Key Endpoints

### Marketplace API
```
Base URL: https://ltp1ccays5.execute-api.us-east-1.amazonaws.com/prod/

POST /api/validate-solution-token
- Validates token
- Checks quota
- Increments usage (unless check_only=true)
- Auto-downgrades expired pro users

POST /api/register
- Creates user account
- Generates entitlement + token
- Returns token to user

POST /api/payment/success
- Verifies PayU payment
- Upgrades user to pro
- Sets pro_expires_at
```

### FAISS API
```
Base URL: https://awssolutionfinder.solutions.cloudnestle.com/

POST /search
- Accepts marketplace_token
- Validates with marketplace
- Executes FAISS search
- Returns AWS solutions
```

---

## 📊 Database Queries

### Get User Entitlement (Email)
```bash
aws dynamodb query \
    --table-name marketplace-user-solution-entitlements-prod \
    --key-condition-expression "pk = :pk AND sk = :sk" \
    --expression-attribute-values '{
        ":pk": {"S": "user#test@example.com"},
        ":sk": {"S": "solution#aws-solution-finder-001"}
    }'
```

### Get User Entitlement (UUID)
```bash
aws dynamodb query \
    --table-name marketplace-user-solution-entitlements-prod \
    --key-condition-expression "pk = :pk AND sk = :sk" \
    --expression-attribute-values '{
        ":pk": {"S": "user#uuid-123"},
        ":sk": {"S": "solution#aws-solution-finder-001"}
    }'
```

### Update Tier to Pro
```bash
aws dynamodb update-item \
    --table-name marketplace-user-solution-entitlements-prod \
    --key '{"pk":{"S":"user#test@example.com"},"sk":{"S":"solution#aws-solution-finder-001"}}' \
    --update-expression "SET tier = :tier, accessTier = :tier, access_tier = :tier, dailyLimit = :limit, pro_expires_at = :expires" \
    --expression-attribute-values '{
        ":tier": {"S": "pro"},
        ":limit": {"N": "-1"},
        ":expires": {"S": "2026-02-26T10:30:00Z"}
    }'
```

### Check Daily Usage
```bash
aws dynamodb get-item \
    --table-name marketplace-user-solution-entitlements-prod \
    --key '{"pk":{"S":"user#test@example.com"},"sk":{"S":"solution#aws-solution-finder-001"}}' \
    --query 'Item.{usage:dailyUsage.N,date:lastUsageDate.S,tier:tier.S}'
```

---

## 🧪 Testing Commands

### Test Token Validation (Check Only)
```bash
curl -X POST https://ltp1ccays5.execute-api.us-east-1.amazonaws.com/prod/api/validate-solution-token \
    -H "Content-Type: application/json" \
    -d '{
        "token": "YOUR_TOKEN_HERE",
        "user_email": "test@example.com",
        "solution_id": "aws-solution-finder-001",
        "check_only": true
    }'
```

### Test Token Validation (Increment Usage)
```bash
curl -X POST https://ltp1ccays5.execute-api.us-east-1.amazonaws.com/prod/api/validate-solution-token \
    -H "Content-Type: application/json" \
    -d '{
        "token": "YOUR_TOKEN_HERE",
        "user_email": "test@example.com",
        "solution_id": "aws-solution-finder-001"
    }'
```

### Test FAISS Search
```bash
curl -X POST https://awssolutionfinder.solutions.cloudnestle.com/search \
    -H "Content-Type: application/json" \
    -d '{
        "query": "serverless architecture best practices",
        "marketplace_token": "YOUR_TOKEN_HERE",
        "marketplace_user_id": "test@example.com"
    }'
```

---

## 🚨 Common Issues

### Issue: "No valid entitlement found"
**Cause**: User not registered or wrong email format  
**Fix**: Check both email and UUID formats in database

### Issue: "Quota exceeded" for pro user
**Cause**: Pro subscription expired  
**Fix**: Check `pro_expires_at` field (auto-downgrade is working)

### Issue: FAISS can't reach marketplace
**Cause**: Wrong API URL in FAISS .env  
**Fix**: Run `deploy-full.sh` to regenerate .env

### Issue: Daily usage not resetting
**Cause**: `lastUsageDate` not updated  
**Fix**: Already fixed in validator (updates on every increment)

---

## 📁 File Locations

### Marketplace
```
/persistent/vscode-workspace/kiro-cloudnetsle-marketplace/
├── deploy-full.sh                                    # Master deployment
├── packages/infrastructure/lambda/tokens/
│   ├── solution-token-validator.js                  # Token validation
│   └── solution-token-generator.js                  # Token generation
└── packages/infrastructure/lambda/payments/
    └── payment-success-handler.js                   # Pro upgrade
```

### FAISS
```
/persistent/vscode-workspace/faiss-rag-agent/
├── .env                                             # Marketplace config (auto-generated)
├── lambda/query_handler.py                          # Search + validation
└── deploy.sh                                        # FAISS deployment
```

---

## 🔧 Deployment

### Marketplace (Always use this!)
```bash
cd ~/workspace/vscode-workspace/kiro-cloudnetsle-marketplace
./deploy-full.sh
```

**What it does:**
1. Deploy CDK stack
2. Extract CloudFormation outputs
3. **Update FAISS .env** ← Critical!
4. Build + deploy frontend
5. Invalidate CloudFront
6. Seed company settings

### FAISS
```bash
cd ~/workspace/vscode-workspace/faiss-rag-agent
./deploy.sh
```

**What it does:**
1. Read .env (marketplace integration)
2. Deploy CDK stack
3. Package Lambda
4. Upload FAISS index

---

## 📈 Access Tiers Summary

| Tier | Quota | Cost | Token Required | Tracking |
|------|-------|------|----------------|----------|
| **Anonymous** | 3 total | Free | No | FAISS local DDB |
| **Registered** | 10/day | Free | Yes | Marketplace entitlements |
| **Pro** | Unlimited | ₹999/month | Yes | Marketplace entitlements |

---

## 🔐 Security Notes

- **Token Length**: 32 characters (16 bytes hex)
- **Token Storage**: DynamoDB encrypted at rest
- **API**: HTTPS only, CORS restricted
- **IP Tracking**: Hashed with salt (optional)
- **Session TTL**: 30 days auto-expiry

---

## 📞 Quick Help

**Check marketplace stack outputs:**
```bash
aws cloudformation describe-stacks --stack-name MarketplaceStack-v3 --query 'Stacks[0].Outputs'
```

**Check FAISS .env:**
```bash
cat ~/workspace/vscode-workspace/faiss-rag-agent/.env
```

**View Lambda logs (Marketplace):**
```bash
aws logs tail /aws/lambda/MarketplaceStack-v3-SolutionTokenValidator --follow
```

**View Lambda logs (FAISS):**
```bash
aws logs tail /aws/lambda/FaissRagStack-QueryHandler --follow
```

---

**Last Updated**: January 26, 2026  
**Status**: ✅ Production Active
