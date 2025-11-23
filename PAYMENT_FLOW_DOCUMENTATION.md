# Payment Flow Documentation
**CloudNetsle Marketplace - PhonePe Integration**

## Overview
Complete payment system for upgrading users from Registered (10 searches/day) to Pro (unlimited) tier using PhonePe Payment Gateway.

---

## Payment Gateway: PhonePe

### Configuration
**Credentials Storage**: AWS Secrets Manager  
**Secret Name**: `marketplace/phonepe/credentials`  
**Region**: `us-east-1`

**Secret Structure**:
```json
{
  "clientId": "your-phonepe-client-id",
  "clientSecret": "your-phonepe-client-secret",
  "merchantId": "your-merchant-id",
  "saltKey": "your-salt-key",
  "saltIndex": "1"
}
```

**PhonePe API Endpoints**:
- **Auth**: `https://api.phonepe.com/apis/identity-manager/v1/oauth/token`
- **Payment**: `https://api.phonepe.com/apis/pg/checkout/v2/pay`

---

## API Endpoints

### 1. Initiate Payment
**Endpoint**: `POST /payments/upgrade-to-pro`  
**Auth**: None (public endpoint)  
**Lambda**: `phonepe-payment.js`

**Request**:
```json
{
  "userId": "uuid-123",
  "userEmail": "user@example.com",
  "tier": "pro"
}
```

**Response**:
```json
{
  "success": true,
  "transactionId": "txn_MP-uuid-123-1732356000-abc123",
  "merchantOrderId": "MP-uuid-123-1732356000-abc123",
  "phonepeOrderId": "PP_ORDER_123456",
  "redirectUrl": "https://phonepe.com/checkout/...",
  "amount": 299,
  "status": "PENDING",
  "message": "Payment initiated successfully. Redirecting to PhonePe..."
}
```

**Flow**:
1. Generate unique `merchantOrderId`: `MP-{userId}-{timestamp}-{random}`
2. Get PhonePe OAuth token from credentials
3. Create PhonePe payment request (₹299 = 29900 paisa)
4. Store transaction in DynamoDB
5. Send email notification
6. Return redirect URL to frontend

---

### 2. PhonePe Webhook
**Endpoint**: `POST /payments/phonepe-webhook`  
**Auth**: None (webhook from PhonePe)  
**Lambda**: `phonepe-webhook.js`

**PhonePe Webhook Payload**:
```json
{
  "event": "checkout.order.completed",
  "payload": {
    "merchantOrderId": "MP-uuid-123-1732356000-abc123",
    "transactionId": "PP_TXN_123456",
    "state": "COMPLETED",
    "amount": 29900,
    "timestamp": "2025-11-23T10:00:00Z",
    "paymentDetails": [{
      "paymentMode": "UPI",
      "rail": {
        "utr": "123456789012",
        "upiTransactionId": "UPI123456",
        "vpa": "user@paytm"
      }
    }]
  }
}
```

**Processing**:
1. Validate webhook payload
2. Fetch transaction from DynamoDB
3. Update transaction status
4. **If COMPLETED**:
   - Update user tier to `pro` in `marketplace-users` table
   - Update entitlement `access_tier` to `pro` in `marketplace-user-solution-entitlements` table
   - Update BOTH UUID-based AND email-based entitlement records
   - Send success email with Pro features
5. **If FAILED**:
   - Send failure email with retry link
6. Store reconciliation data

---

### 3. Payment Callback
**Endpoint**: `POST /payments/callback`  
**Auth**: None (redirect from PhonePe)  
**Lambda**: `payment-callback.js`

**Purpose**: Handle browser redirect after payment (backup to webhook)

---

### 4. Payment Reconciliation
**Endpoint**: `POST /payments/reconciliation`  
**Auth**: Cognito (admin only)  
**Lambda**: `payment-reconciliation.js`

**Purpose**: Manual reconciliation for failed webhooks or audit

---

## DynamoDB Tables

### 1. marketplace-payment-transactions

**Purpose**: Track all payment transactions

**Schema**:
```json
{
  "transactionId": "txn_MP-uuid-123-1732356000-abc123",  // PK
  "userId": "uuid-123",
  "userEmail": "user@example.com",
  "merchantOrderId": "MP-uuid-123-1732356000-abc123",
  "phonepeOrderId": "PP_ORDER_123456",
  "amount": 29900,  // in paisa
  "tier": "pro",
  "status": "COMPLETED",  // PENDING | COMPLETED | FAILED
  "paymentMethod": "phonepe",
  "redirectUrl": "https://phonepe.com/checkout/...",
  "createdAt": "2025-11-23T09:00:00Z",
  "updatedAt": "2025-11-23T10:00:00Z",
  "expiresAt": "2025-11-23T09:30:00Z",
  
  // Webhook data
  "webhookEvent": "checkout.order.completed",
  "paymentState": "COMPLETED",
  
  // Reconciliation data
  "phonepe_status": "COMPLETED",
  "phonepe_transaction_id": "PP_TXN_123456",
  "phonepe_timestamp": "2025-11-23T10:00:00Z",
  "payment_mode": "UPI",
  "utr": "123456789012",
  "upi_transaction_id": "UPI123456",
  "vpa": "user@paytm",
  "settlement_status": "ELIGIBLE",
  "settlement_date": "2025-11-25",
  "last_sync": "2025-11-23T10:00:00Z"
}
```

**Indexes**: None (query by transactionId)

---

### 2. marketplace-users

**Purpose**: User profiles and subscription status

**Updated Fields on Payment**:
```json
{
  "userId": "uuid-123",  // PK
  "email": "user@example.com",
  "subscriptionTier": "pro",  // Updated from "registered"
  "subscriptionStatus": "active",  // Updated
  "subscriptionStartDate": "2025-11-23T10:00:00Z",  // Set
  "lastPaymentDate": "2025-11-23T10:00:00Z",  // Set
  "updatedAt": "2025-11-23T10:00:00Z"
}
```

---

### 3. marketplace-user-solution-entitlements

**Purpose**: Solution access control and usage tracking

**Updated Fields on Payment**:

**UUID-based record** (new format):
```json
{
  "pk": "user#uuid-123",  // PK
  "sk": "solution#aws-solution-finder",  // SK
  "token": "tok_perm_abc123...",
  "solution_id": "aws-solution-finder",
  "tier": "pro",  // Updated from "registered"
  "access_tier": "pro",  // Updated
  "accessTier": "pro",  // Updated (multiple fields for compatibility)
  "dailyUsage": 0,  // Reset
  "lastUsageDate": "2025-11-23",
  "status": "active",
  "updatedAt": "2025-11-23T10:00:00Z"
}
```

**Email-based record** (old format - also updated for backward compatibility):
```json
{
  "pk": "user#user@example.com",  // PK
  "sk": "solution#aws-solution-finder",  // SK
  "token": "tok_perm_xyz789...",
  "solution_id": "aws-solution-finder",
  "tier": "pro",  // Updated
  "access_tier": "pro",  // Updated
  "usage": {
    "daily_usage": {
      "2025-11-23": 0
    }
  },
  "status": "active",
  "updated_at": "2025-11-23T10:00:00Z"
}
```

**Note**: Webhook updates BOTH records to ensure users with old tokens (from FAISS registration) also get Pro access.

---

## Complete Payment Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. User Clicks "Upgrade to Pro"              │
│                    (FAISS App or Marketplace)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Frontend: POST /payments/upgrade-to-pro                     │
│     Body: { userId, userEmail, tier: "pro" }                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Lambda: phonepe-payment.js                                  │
│     - Get PhonePe credentials from Secrets Manager              │
│     - Generate merchantOrderId: MP-{userId}-{timestamp}-{rand}  │
│     - Get OAuth token from PhonePe                              │
│     - Create payment request (₹299 = 29900 paisa)              │
│     - Store transaction in DynamoDB (status: PENDING)           │
│     - Send "Payment Initiated" email                            │
│     - Return redirectUrl                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Frontend: Redirect to PhonePe                               │
│     window.location.href = redirectUrl                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. User Completes Payment on PhonePe                           │
│     - UPI / Card / Net Banking                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. PhonePe: POST /payments/phonepe-webhook                     │
│     Event: checkout.order.completed                             │
│     Payload: { merchantOrderId, state: "COMPLETED", ... }       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Lambda: phonepe-webhook.js                                  │
│     - Fetch transaction from DynamoDB                           │
│     - Update transaction status to COMPLETED                    │
│     - Update reconciliation data (UTR, UPI ID, etc.)            │
│     - Update user tier to "pro" in marketplace-users            │
│     - Update entitlement access_tier to "pro" (UUID record)     │
│     - Update entitlement access_tier to "pro" (email record)    │
│     - Send "Welcome to Pro" email                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. PhonePe: Redirect user back to marketplace                  │
│     URL: https://marketplace.cloudnestle.com/payment/callback   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. User Returns to FAISS App                                   │
│     - Next search validates token                               │
│     - Marketplace API returns: access_tier = "pro"              │
│     - Quota check returns: quota_remaining = -1 (unlimited)     │
│     - User can search without limits                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Integration

### React Component (SolutionDetailPage.tsx)

```typescript
const handleUpgradeToPro = async () => {
  setIsProcessing(true)
  
  try {
    // Call payment API
    const response = await fetch(`${API_URL}/payments/upgrade-to-pro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.userId,
        userEmail: user.email,
        tier: 'pro'
      })
    })
    
    const data = await response.json()
    
    if (data.success && data.redirectUrl) {
      // Redirect to PhonePe
      window.location.href = data.redirectUrl
    } else {
      showPopup('error', 'Payment initiation failed')
    }
  } catch (error) {
    showPopup('error', 'Payment error')
  } finally {
    setIsProcessing(false)
  }
}
```

---

## Email Notifications

### 1. Payment Initiated
**Subject**: Payment Initiated - AWS Solution Finder Pro  
**Sent**: When payment is created  
**Content**:
- Order ID
- Amount: ₹299
- Status: Pending
- Instructions to complete payment

### 2. Payment Success
**Subject**: 🎉 Welcome to AWS Solution Finder Pro!  
**Sent**: When webhook receives COMPLETED status  
**Content**:
- Order ID
- Amount Paid: ₹299
- Status: Active
- Pro Features list:
  - ✅ Unlimited searches per day
  - ✅ Access to all AWS repositories
  - ✅ Saved searches and collections
  - ✅ Priority support
  - ✅ Export functionality
- CTA: Start Using Pro Features

### 3. Payment Failed
**Subject**: Payment Failed - AWS Solution Finder Pro  
**Sent**: When webhook receives FAILED status  
**Content**:
- Order ID
- Amount: ₹299
- Status: Failed
- Retry link
- Support contact

---

## Pricing

**Pro Tier**: ₹299 (one-time payment)

**Amount Handling**:
- Frontend displays: ₹299
- Backend stores: 29900 (paisa)
- PhonePe API expects: paisa (1 rupee = 100 paisa)

---

## Security

### 1. Credentials
- Stored in AWS Secrets Manager
- Never exposed in code or logs
- Rotated regularly

### 2. Webhook Validation
- Validates merchantOrderId exists in database
- Checks transaction status before processing
- Idempotent processing (handles duplicate webhooks)

### 3. Token Generation
```javascript
const generatePermanentToken = (userEmail, solutionId) => {
  const hash = crypto.createHash('sha256')
  hash.update(`${userEmail}:${solutionId}:${TOKEN_SECRET}`)
  return 'tok_perm_' + hash.digest('hex').substring(0, 32)
}
```

---

## Reconciliation Data

**Purpose**: Track payment details for accounting and settlement

**Stored Fields**:
- `phonepe_status`: Payment state from PhonePe
- `phonepe_transaction_id`: PhonePe's internal transaction ID
- `payment_mode`: UPI / Card / Net Banking
- `utr`: Unique Transaction Reference (for UPI)
- `upi_transaction_id`: UPI-specific transaction ID
- `vpa`: Virtual Payment Address (UPI ID)
- `settlement_status`: ELIGIBLE / NOT_ELIGIBLE
- `settlement_date`: Expected settlement date (T+2 days)
- `last_sync`: Last reconciliation timestamp

**Usage**:
- Financial reporting
- Settlement tracking
- Dispute resolution
- Audit trail

---

## Error Handling

### Payment Initiation Errors
- **Missing credentials**: Check Secrets Manager
- **PhonePe API error**: Log error, return user-friendly message
- **DynamoDB error**: Retry with exponential backoff

### Webhook Errors
- **Transaction not found**: Log warning, return 404
- **Duplicate webhook**: Check status, skip if already processed
- **Tier update failure**: Log error, send alert to admin

### Quota Validation Errors
- **Token not found**: User needs to re-register
- **Quota exceeded**: Show upgrade prompt
- **Pro tier not reflecting**: Check entitlement records

---

## Testing

### Test Payment Flow

1. **Initiate Payment**:
```bash
curl -X POST https://juvt4m81ld.execute-api.us-east-1.amazonaws.com/prod/payments/upgrade-to-pro \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-uuid-123",
    "userEmail": "test@example.com",
    "tier": "pro"
  }'
```

2. **Simulate Webhook** (for testing):
```bash
curl -X POST https://juvt4m81ld.execute-api.us-east-1.amazonaws.com/prod/payments/phonepe-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "checkout.order.completed",
    "payload": {
      "merchantOrderId": "MP-test-uuid-123-1732356000-abc123",
      "state": "COMPLETED",
      "amount": 29900
    }
  }'
```

3. **Verify Tier Update**:
```bash
aws dynamodb get-item \
  --table-name marketplace-users \
  --key '{"userId": {"S": "test-uuid-123"}}' \
  --query 'Item.subscriptionTier.S'
```

---

## Monitoring

### CloudWatch Metrics
- Payment initiation success rate
- Webhook processing time
- Tier update success rate
- Email delivery rate

### CloudWatch Logs
- `/aws/lambda/PhonePePaymentFunction`
- `/aws/lambda/PhonePeWebhookFunction`
- `/aws/lambda/PaymentReconciliationFunction`

### Alarms
- Payment failures > 5% in 5 minutes
- Webhook processing errors
- Tier update failures

---

## Troubleshooting

### User Not Getting Pro Access

**Check**:
1. Transaction status in `marketplace-payment-transactions`
2. User tier in `marketplace-users`
3. Entitlement access_tier in `marketplace-user-solution-entitlements`
4. Both UUID-based AND email-based entitlement records

**Fix**:
```bash
# Manually update tier
aws dynamodb update-item \
  --table-name marketplace-users \
  --key '{"userId": {"S": "uuid-123"}}' \
  --update-expression "SET subscriptionTier = :tier" \
  --expression-attribute-values '{":tier": {"S": "pro"}}'

# Update entitlement
aws dynamodb update-item \
  --table-name marketplace-user-solution-entitlements \
  --key '{"pk": {"S": "user#uuid-123"}, "sk": {"S": "solution#aws-solution-finder"}}' \
  --update-expression "SET access_tier = :tier, tier = :tier" \
  --expression-attribute-values '{":tier": {"S": "pro"}}'
```

### Webhook Not Received

**Check**:
1. PhonePe webhook configuration
2. API Gateway logs
3. Lambda execution logs

**Manual Reconciliation**:
```bash
curl -X POST https://juvt4m81ld.execute-api.us-east-1.amazonaws.com/prod/payments/reconciliation \
  -H "Authorization: Bearer <cognito-token>" \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "txn_MP-uuid-123-1732356000-abc123"}'
```

---

## Future Enhancements

1. **Subscription Model**: Monthly/yearly recurring payments
2. **Multiple Tiers**: Basic, Pro, Enterprise
3. **Refunds**: Automated refund processing
4. **Invoicing**: Generate PDF invoices
5. **Payment Analytics**: Revenue dashboard
6. **Multiple Gateways**: Razorpay, Stripe as alternatives

---

**Last Updated**: 2025-11-23  
**Version**: 1.0  
**Maintained By**: CloudNetsle Team
