# FAISS Integration Architecture Diagram

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                          CLOUDNESTLE MARKETPLACE                                │
│                         (Control Plane - us-east-1)                            │
│                   https://marketplace.cloudnestle.com                          │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Frontend (React + Vite)                          │  │
│  │  S3: marketplace-frontend-1769235527854                                 │  │
│  │  CloudFront: E1SRB6DQ5H61D                                              │  │
│  │                                                                          │  │
│  │  Pages:                                                                  │  │
│  │  • /register?solution_id=aws-solution-finder-001                       │  │
│  │  • /catalog (Browse solutions)                                          │  │
│  │  • /checkout (Pro upgrade - ₹999/month)                                │  │
│  │  • /profile (View token & usage)                                        │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    ▲                                            │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway (REST API)                                │  │
│  │  URL: https://ltp1ccays5.execute-api.us-east-1.amazonaws.com/prod/     │  │
│  │                                                                          │  │
│  │  Endpoints:                                                              │  │
│  │  • POST /api/register                                                    │  │
│  │  • POST /api/validate-solution-token  ← FAISS calls this               │  │
│  │  • POST /api/payment/success                                            │  │
│  │  • GET  /api/user/profile                                               │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    ▲                                            │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Lambda Functions                                 │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ solution-token-validator.js                                       │  │  │
│  │  │ • Validates token                                                 │  │  │
│  │  │ • Checks quota (10/day for registered, unlimited for pro)        │  │  │
│  │  │ • Auto-downgrades expired pro users                              │  │  │
│  │  │ • Increments daily usage                                          │  │  │
│  │  │ • Tracks user location (optional)                                │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ solution-token-generator.js                                       │  │  │
│  │  │ • Generates 32-char token on registration                        │  │  │
│  │  │ • Creates entitlement record                                      │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ payment-success-handler.js                                        │  │  │
│  │  │ • Verifies PayU payment                                           │  │  │
│  │  │ • Upgrades tier to 'pro'                                          │  │  │
│  │  │ • Sets pro_expires_at (30 days)                                  │  │  │
│  │  │ • Updates dailyLimit to -1 (unlimited)                           │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    ▲                                            │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         DynamoDB Tables                                  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ marketplace-users-prod                                            │  │  │
│  │  │ PK: userId (UUID)                                                 │  │  │
│  │  │ Attributes: email, role, awsFinderTier, awsFinderApiKey          │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ marketplace-user-solution-entitlements-prod                       │  │  │
│  │  │ PK: user#{email|uuid}                                             │  │  │
│  │  │ SK: solution#{solution_id}                                        │  │  │
│  │  │                                                                   │  │  │
│  │  │ Attributes:                                                       │  │  │
│  │  │ • token (32-char hex)                                            │  │  │
│  │  │ • tier: "registered" | "pro"                                     │  │  │
│  │  │ • dailyUsage: number                                             │  │  │
│  │  │ • dailyLimit: 10 | -1                                            │  │  │
│  │  │ • lastUsageDate: "YYYY-MM-DD"                                    │  │  │
│  │  │ • pro_expires_at: ISO timestamp                                  │  │  │
│  │  │ • status: "active" | "inactive"                                  │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ marketplace-subscription-history-prod                             │  │  │
│  │  │ Tracks: upgrades, downgrades, renewals                           │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ marketplace-user-sessions-prod                                    │  │  │
│  │  │ Tracks: user location, IP hash, session data                     │  │  │
│  │  │ TTL: 30 days                                                      │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Cognito User Pool                                │  │
│  │  Pool ID: us-east-1_rR9SGi3Xe                                           │  │
│  │  Users: 40 active                                                        │  │
│  │  Auth: Email/password, Google, GitHub                                   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Payment Gateway                                  │  │
│  │  Provider: PayU                                                          │  │
│  │  Methods: Credit/Debit cards, UPI                                       │  │
│  │  Price: ₹999/month (Pro tier)                                           │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Token Validation
                                       │ POST /api/validate-solution-token
                                       │ {
                                       │   "token": "abc123...",
                                       │   "user_email": "user@example.com",
                                       │   "solution_id": "aws-solution-finder-001"
                                       │ }
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                        FAISS SOLUTION FINDER                                    │
│                         (Data Plane - us-east-1)                               │
│          https://awssolutionfinder.solutions.cloudnestle.com                   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Frontend (React)                                 │  │
│  │  S3: faiss-frontend-bucket                                              │  │
│  │  CloudFront: FAISS distribution                                         │  │
│  │                                                                          │  │
│  │  Pages:                                                                  │  │
│  │  • /search (Main search interface)                                      │  │
│  │  • /results (Search results with AWS solutions)                        │  │
│  │                                                                          │  │
│  │  Features:                                                               │  │
│  │  • Anonymous: 3 searches → Redirect to marketplace                     │  │
│  │  • Registered: Shows "X searches remaining today"                      │  │
│  │  • Pro: Shows "Unlimited searches"                                      │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    ▲                                            │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway (REST API)                                │  │
│  │  URL: https://faiss-api.execute-api.us-east-1.amazonaws.com/prod/      │  │
│  │                                                                          │  │
│  │  Endpoints:                                                              │  │
│  │  • POST /search                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    ▲                                            │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Lambda Function                                  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ query_handler.py                                                  │  │  │
│  │  │                                                                   │  │  │
│  │  │ Flow:                                                             │  │  │
│  │  │ 1. Receive search request                                        │  │  │
│  │  │ 2. Check if token provided                                       │  │  │
│  │  │    • No token → Anonymous (check local DDB)                     │  │  │
│  │  │    • Has token → Validate with marketplace                      │  │  │
│  │  │ 3. Call validate_marketplace_token()                            │  │  │
│  │  │    • POST to marketplace API                                     │  │  │
│  │  │    • Get tier and quota info                                     │  │  │
│  │  │ 4. If allowed:                                                   │  │  │
│  │  │    • Generate embeddings (Bedrock Titan)                        │  │  │
│  │  │    • Search FAISS index                                          │  │  │
│  │  │    • Get top K results                                           │  │  │
│  │  │    • Generate response (Nova Pro)                               │  │  │
│  │  │ 5. Return results                                                │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    ▲                                            │
│                                    │                                            │
│                                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         AWS Services                                     │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ S3 Bucket: FAISS Index Storage                                    │  │  │
│  │  │ • faiss_index.bin (Vector index)                                 │  │  │
│  │  │ • metadata.json (Solution metadata)                              │  │  │
│  │  │ • Indexed: AWS documentation, blogs, whitepapers                │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Amazon Bedrock                                                    │  │  │
│  │  │ • Titan Embeddings v2 (Generate query embeddings)               │  │  │
│  │  │ • Nova Pro (Generate natural language responses)                │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ DynamoDB: faiss-anonymous-usage                                   │  │  │
│  │  │ PK: session_id                                                    │  │  │
│  │  │ Attributes: search_count, last_search                            │  │  │
│  │  │ TTL: 7 days                                                       │  │  │
│  │  │ Purpose: Track anonymous users (3 search limit)                  │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Environment Variables                            │  │
│  │  (Auto-generated by marketplace deploy-full.sh)                         │  │
│  │                                                                          │  │
│  │  MARKETPLACE_USER_TABLE_NAME=marketplace-users-prod                     │  │
│  │  MARKETPLACE_ENTITLEMENT_TABLE_NAME=marketplace-user-solution-...       │  │
│  │  MARKETPLACE_SESSION_TABLE_NAME=marketplace-sessions-prod               │  │
│  │  MARKETPLACE_API_URL=https://ltp1ccays5.execute-api...                  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Token Validation Sequence Diagram

```
User                FAISS Frontend      FAISS Lambda        Marketplace API     DynamoDB
 │                       │                   │                     │               │
 │  1. Enter query      │                   │                     │               │
 │─────────────────────>│                   │                     │               │
 │                       │                   │                     │               │
 │                       │  2. POST /search  │                     │               │
 │                       │  + token          │                     │               │
 │                       │──────────────────>│                     │               │
 │                       │                   │                     │               │
 │                       │                   │  3. Validate token  │               │
 │                       │                   │  POST /api/validate-│               │
 │                       │                   │  solution-token     │               │
 │                       │                   │────────────────────>│               │
 │                       │                   │                     │               │
 │                       │                   │                     │  4. Query     │
 │                       │                   │                     │  entitlement  │
 │                       │                   │                     │──────────────>│
 │                       │                   │                     │               │
 │                       │                   │                     │  5. Return    │
 │                       │                   │                     │  entitlement  │
 │                       │                   │                     │<──────────────│
 │                       │                   │                     │               │
 │                       │                   │                     │  6. Check:    │
 │                       │                   │                     │  - Token match│
 │                       │                   │                     │  - Pro expiry │
 │                       │                   │                     │  - Quota      │
 │                       │                   │                     │               │
 │                       │                   │                     │  7. Increment │
 │                       │                   │                     │  dailyUsage   │
 │                       │                   │                     │──────────────>│
 │                       │                   │                     │               │
 │                       │                   │  8. Return result   │               │
 │                       │                   │  {allowed: true,    │               │
 │                       │                   │   tier: "pro",      │               │
 │                       │                   │   quota: -1}        │               │
 │                       │                   │<────────────────────│               │
 │                       │                   │                     │               │
 │                       │                   │  9. Generate        │               │
 │                       │                   │  embeddings         │               │
 │                       │                   │  (Bedrock Titan)    │               │
 │                       │                   │                     │               │
 │                       │                   │  10. Search FAISS   │               │
 │                       │                   │  index (S3)         │               │
 │                       │                   │                     │               │
 │                       │                   │  11. Generate       │               │
 │                       │                   │  response           │               │
 │                       │                   │  (Nova Pro)         │               │
 │                       │                   │                     │               │
 │                       │  12. Return       │                     │               │
 │                       │  search results   │                     │               │
 │                       │<──────────────────│                     │               │
 │                       │                   │                     │               │
 │  13. Display results  │                   │                     │               │
 │<─────────────────────│                   │                     │               │
 │                       │                   │                     │               │
```

---

## Deployment Flow

```
Developer                deploy-full.sh         CloudFormation      FAISS .env
    │                         │                       │                 │
    │  1. Run deploy          │                       │                 │
    │────────────────────────>│                       │                 │
    │                         │                       │                 │
    │                         │  2. Deploy CDK stack  │                 │
    │                         │──────────────────────>│                 │
    │                         │                       │                 │
    │                         │  3. Stack outputs     │                 │
    │                         │<──────────────────────│                 │
    │                         │  (table names, API)   │                 │
    │                         │                       │                 │
    │                         │  4. Extract outputs   │                 │
    │                         │  - USER_TABLE_NAME    │                 │
    │                         │  - ENTITLEMENT_TABLE  │                 │
    │                         │  - API_URL            │                 │
    │                         │                       │                 │
    │                         │  5. Update FAISS .env │                 │
    │                         │────────────────────────────────────────>│
    │                         │                       │                 │
    │                         │  6. Build frontend    │                 │
    │                         │  (npm run build)      │                 │
    │                         │                       │                 │
    │                         │  7. Sync to S3        │                 │
    │                         │  (marketplace-frontend)                 │
    │                         │                       │                 │
    │                         │  8. Invalidate        │                 │
    │                         │  CloudFront           │                 │
    │                         │                       │                 │
    │  9. Deployment complete │                       │                 │
    │<────────────────────────│                       │                 │
    │                         │                       │                 │
```

---

## Data Flow: Anonymous → Registered → Pro

```
┌─────────────────────────────────────────────────────────────────────┐
│ ANONYMOUS USER (No token)                                           │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  Search 1, 2, 3 → Tracked in FAISS local DDB
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ REDIRECT TO REGISTRATION                                            │
│ URL: marketplace.cloudnestle.com/register?solution_id=aws-...       │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  User fills form → Submit
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ MARKETPLACE CREATES:                                                │
│ • User account (marketplace-users-prod)                             │
│ • Entitlement (marketplace-user-solution-entitlements-prod)         │
│   {                                                                  │
│     pk: "user#user@example.com",                                    │
│     sk: "solution#aws-solution-finder-001",                         │
│     token: "abc123...",                                             │
│     tier: "registered",                                             │
│     dailyLimit: 10,                                                 │
│     dailyUsage: 0                                                   │
│   }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  User receives token
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ REGISTERED USER (10 searches/day)                                   │
│ • FAISS validates token with marketplace                            │
│ • Each search increments dailyUsage                                 │
│ • Resets at midnight UTC                                            │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  User clicks "Upgrade to Pro"
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PAYMENT FLOW                                                        │
│ • Redirect to PayU gateway                                          │
│ • User pays ₹999                                                    │
│ • PayU callback → payment-success-handler                           │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  Payment verified
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ MARKETPLACE UPDATES ENTITLEMENT:                                    │
│   {                                                                  │
│     tier: "pro",                                                    │
│     dailyLimit: -1,  // Unlimited                                   │
│     pro_expires_at: "2026-02-26T10:30:00Z"  // 30 days             │
│   }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  User now has unlimited access
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PRO USER (Unlimited searches)                                       │
│ • FAISS validates token → tier: "pro"                               │
│ • No quota checks                                                   │
│ • No usage increment                                                │
└─────────────────────────────────────────────────────────────────────┘
    │
    │  30 days later...
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PRO EXPIRY (Auto-downgrade)                                         │
│ • Next validation checks pro_expires_at                             │
│ • Expired → Update tier to "registered"                             │
│ • Record in subscription-history                                    │
│ • User back to 10 searches/day                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: January 26, 2026  
**Status**: ✅ Production Active
