# Marketplace Enhancements - Implementation TODO

**Created**: 2025-11-23  
**Status**: Ready for Implementation  
**Estimated Time**: 18-24 hours (2-3 days)

---

## **Implementation Sequence**

### **Phase 1: System Partner Foundation (Enhancement 5)** ⏱️ 2-3 hours
- [ ] Create `selfpartner@cloudnestle.com` in Cognito
- [ ] Add CloudNetsle to `marketplace-users` table
- [ ] Create partner application for CloudNetsle
- [ ] Add schema fields: `vendorId`, `commission_rate`, `isSystemPartner`
- [ ] Update AWS Solution Finder with CloudNetsle userId
- [ ] Delete orphan partnerId from solutions table
- [ ] Test: Verify CloudNetsle user exists and solution ownership

### **Phase 2: Dynamic Pricing (Enhancement 2)** ⏱️ 2-3 hours
- [ ] Verify `pricing.proTier.amount` structure in solutions table
- [ ] Update payment initiation to fetch price from DB
- [ ] Update frontend to display price from `/catalog/{solutionId}`
- [ ] Test: Payment fetches correct price
- [ ] Test: Frontend displays price correctly

### **Phase 3: Backend Payment Overhaul (Enhancement 3 + 1)** ⏱️ 8-10 hours

#### **Enhancement 3: Multi-Gateway Support**
- [ ] Create `marketplace-payment-gateways` DynamoDB table
- [ ] Create `marketplace-platform-config` DynamoDB table
- [ ] Add Cashfree credentials to Secrets Manager
- [ ] Create Cashfree payment handler (`cashfree-payment.js`)
- [ ] Create Cashfree webhook handler (`cashfree-webhook.js`)
- [ ] Update transaction schema (add `paymentGateway`, `gatewayOrderId`, `gateway_data`)
- [ ] Create gateway selection logic
- [ ] Delete old test transactions
- [ ] Seed payment gateways table (PhonePe + Cashfree)
- [ ] Seed platform config table (default gateway)

#### **Enhancement 1: Solution-Agnostic Payment**
- [ ] Rename endpoint to `/payments/initiate`
- [ ] Add `solutionId` to request body
- [ ] Fetch solution from DB (for price + vendor)
- [ ] Update payment initiation to use selected gateway
- [ ] Store `solutionId` in transaction
- [ ] Update webhook to use `transaction.solutionId` (not hardcoded)
- [ ] Update email templates (fetch solution name dynamically)
- [ ] Update email subject: "Your {SolutionName} Pro subscription is active"
- [ ] Add backward compatibility (default to aws-solution-finder)
- [ ] Test: PhonePe payment flow
- [ ] Test: Cashfree payment flow
- [ ] Test: Solution-agnostic payment
- [ ] Test: Webhook updates correct solution
- [ ] Test: Email has correct solution name

### **Phase 4: Checkout Page (Enhancement 4)** ⏱️ 6-8 hours
- [ ] Create `/checkout` page component
- [ ] Add route: `/checkout?solution={solutionId}`
- [ ] Fetch solution details from `/catalog/{solutionId}`
- [ ] Fetch active payment gateways from DB
- [ ] Build order summary section
- [ ] Build payment gateway selector (radio buttons)
- [ ] Build billing address form (Name, Phone, Address, City, State, Pincode, Country)
- [ ] Add state dropdown
- [ ] Add country dropdown
- [ ] Add phone validation (10 digits India, international others)
- [ ] Add pincode validation (6 digits India, vary by country)
- [ ] Add terms & conditions checkbox (required)
- [ ] Add refund policy link
- [ ] Add form validation
- [ ] Add loading spinner
- [ ] Add error handling (solution not found → redirect to catalog)
- [ ] Disable button if invalid/incomplete
- [ ] Update `marketplace-users` table schema (add `billing_address` field)
- [ ] Save billing address to user profile
- [ ] Pre-fill billing address if exists
- [ ] Integrate with `/payments/initiate` API
- [ ] Test: Complete checkout flow
- [ ] Test: Billing address save/pre-fill
- [ ] Test: Gateway selection
- [ ] Test: Form validation
- [ ] Test: End-to-end payment

---

## **Detailed Requirements**

### **Enhancement 1: Solution-Agnostic Payment**

**Endpoint**: `POST /payments/initiate` (renamed from `/payments/upgrade-to-pro`)

**Request Body**:
```json
{
  "userId": "uuid-123",
  "userEmail": "user@example.com",
  "solutionId": "aws-solution-finder",
  "tier": "pro",
  "paymentGateway": "phonepe"
}
```

**Changes**:
- Fetch solution from DB to get price
- Use `solutionId` in transaction
- Webhook uses `transaction.solutionId` (not hardcoded)
- Email templates fetch solution name dynamically
- Email subject: "Your {SolutionName} Pro subscription is active"
- Backward compatibility: Default to "aws-solution-finder" if missing

---

### **Enhancement 2: Dynamic Pricing**

**Schema**: Keep `pricing.proTier.amount` structure

**Changes**:
- Payment lambda fetches `solution.pricing.proTier.amount` from DB
- Frontend displays price from `/catalog/{solutionId}` endpoint
- No caching (fetch every time)
- Currency: INR only

---

### **Enhancement 3: Multi-Gateway Support**

**New Tables**:

#### **marketplace-payment-gateways**:
```json
{
  "gateway_id": "phonepe",
  "name": "PhonePe",
  "display_name": "PhonePe",
  "logo_url": "https://...",
  "status": "active",
  "credentials_secret": "marketplace/phonepe/credentials",
  "api_config": {
    "api_url": "https://api.phonepe.com",
    "api_version": "v1"
  },
  "supported_payment_methods": ["UPI", "Card", "NetBanking"],
  "priority": 1
}
```

#### **marketplace-platform-config**:
```json
{
  "config_key": "default_payment_gateway",
  "config_value": "phonepe"
}
```

**Cashfree Credentials** (Secrets Manager: `marketplace/cashfree/credentials`):
```json
{
  "appId": "CASHFREE_APP_ID",
  "secretKey": "CASHFREE_SECRET_KEY",
  "apiVersion": "2025-01-01",
  "apiUrl": "https://api.cashfree.com/pg"
}
```
**Note**: Actual credentials stored in AWS Secrets Manager

**Transaction Schema** (Updated):
```json
{
  "transactionId": "txn_...",
  "solutionId": "aws-solution-finder",
  "paymentGateway": "phonepe",
  "gatewayOrderId": "PP_ORDER_123",
  "gateway_data": {
    "order_id": "PP_ORDER_123",
    "transaction_id": "PP_TXN_123",
    "status": "COMPLETED",
    "raw_webhook": {...}
  }
}
```

---

### **Enhancement 4: Dedicated Checkout Page**

**Route**: `/checkout?solution={solutionId}`

**Sections**:
1. Order Summary (solution name, features, price)
2. Payment Gateway Selector (radio buttons, show only active)
3. Billing Address Form (detailed fields)
4. Terms & Conditions (required checkbox, link to `/terms`)
5. Proceed to Payment button

**Billing Address Fields**:
- Name (required)
- Phone (required, 10 digits India, international others)
- Address Line 1 (required)
- Address Line 2 (optional)
- City (required)
- State (required, dropdown)
- Pincode (required, 6 digits India, vary by country)
- Country (required, dropdown)

**Validation**:
- All fields required except Address Line 2
- Phone: 10 digits for India, international format for others
- Pincode: 6 digits for India, vary by country
- Terms checkbox must be checked

**Behavior**:
- Save billing address to user profile
- Pre-fill if address exists
- Show loading spinner while fetching
- Redirect to `/catalog` if solution not found
- Disable button if invalid/incomplete

---

### **Enhancement 5: CloudNetsle System Partner**

**Cognito User**:
- Email: `selfpartner@cloudnestle.com`
- Role: `partner` (can login)

**marketplace-users**:
```json
{
  "userId": "cloudnestle-system-uuid",
  "email": "selfpartner@cloudnestle.com",
  "role": "partner",
  "partnerStatus": "approved",
  "isSystemPartner": true,
  "businessName": "CloudNetsle",
  "businessType": "platform",
  "paymentAccounts": {
    "phonepe": "dummy-placeholder",
    "cashfree": "dummy-placeholder"
  }
}
```

**marketplace-partner-applications**:
```json
{
  "applicationId": "system-partner-app",
  "userId": "cloudnestle-system-uuid",
  "businessName": "CloudNetsle",
  "businessType": "platform",
  "status": "approved",
  "approvedBy": "system",
  "approvedAt": "2025-11-23T10:00:00Z"
}
```

**marketplace-solutions** (Update AWS Solution Finder):
```json
{
  "solutionId": "aws-solution-finder",
  "partnerId": "cloudnestle-system-uuid",
  "vendorId": "cloudnestle-system-uuid",
  "commission_rate": 0,
  "createdBy": "cloudnestle-system-uuid"
}
```

---

## **Testing Checklist**

### **Phase 1 Tests**:
- [ ] CloudNetsle user exists in Cognito
- [ ] CloudNetsle user in marketplace-users table
- [ ] Partner application exists
- [ ] AWS Solution Finder has correct vendorId
- [ ] Can login as selfpartner@cloudnestle.com

### **Phase 2 Tests**:
- [ ] Payment fetches price from DB
- [ ] Frontend displays correct price
- [ ] Price matches solutions table

### **Phase 3 Tests**:
- [ ] PhonePe payment flow works
- [ ] Cashfree payment flow works
- [ ] Gateway selection works
- [ ] Transaction stores correct gateway
- [ ] Webhook updates correct solution
- [ ] Email has correct solution name
- [ ] Both UUID and email entitlements updated

### **Phase 4 Tests**:
- [ ] Checkout page loads
- [ ] Solution details displayed
- [ ] Active gateways displayed
- [ ] Billing address form works
- [ ] Validation works
- [ ] Address saves to profile
- [ ] Address pre-fills correctly
- [ ] Terms checkbox required
- [ ] Button disabled when invalid
- [ ] Payment initiation works
- [ ] End-to-end payment successful

---

## **Rollback Plan**

### **Phase 3 Rollback**:
- Keep old payment handler as backup
- Feature flag for new payment system
- Can revert to old endpoint if needed

### **Phase 4 Rollback**:
- Checkout page is new (no rollback needed)
- Can keep old solution detail page flow

---

## **Files to Modify**

### **Backend**:
- `packages/infrastructure/lib/data-stack.ts` (new tables)
- `packages/infrastructure/lib/api-stack.ts` (new endpoints)
- `packages/infrastructure/lambda/payments/initiate-payment.js` (NEW)
- `packages/infrastructure/lambda/payments/phonepe-payment.js` (UPDATE)
- `packages/infrastructure/lambda/payments/phonepe-webhook.js` (UPDATE)
- `packages/infrastructure/lambda/payments/cashfree-payment.js` (NEW)
- `packages/infrastructure/lambda/payments/cashfree-webhook.js` (NEW)

### **Frontend**:
- `packages/frontend/src/pages/CheckoutPage.tsx` (NEW)
- `packages/frontend/src/pages/SolutionDetailPage.tsx` (UPDATE - navigation)
- `packages/frontend/src/services/payment.ts` (NEW)

### **Database**:
- `marketplace-payment-gateways` (NEW TABLE)
- `marketplace-platform-config` (NEW TABLE)
- `marketplace-users` (ADD billing_address field)
- `marketplace-solutions` (ADD vendorId, commission_rate fields)
- `marketplace-payment-transactions` (UPDATE schema)

---

## **Deployment Steps**

1. **Deploy Backend** (Phase 1-3):
   ```bash
   cd /home/ubuntu/workspace/7nov-marketing/marketplace-project
   ./deploy-full.sh
   ```

2. **Seed Data**:
   - Add Cashfree credentials to Secrets Manager
   - Seed payment gateways table
   - Seed platform config table
   - Create CloudNetsle Cognito user
   - Update AWS Solution Finder

3. **Deploy Frontend** (Phase 4):
   ```bash
   cd /home/ubuntu/workspace/7nov-marketing/marketplace-project
   ./deploy-full.sh
   ```

4. **Test End-to-End**:
   - Complete payment flow with PhonePe
   - Complete payment flow with Cashfree
   - Verify entitlements updated
   - Verify emails sent

---

## **Notes**

- App is not live yet, safe to delete old test transactions
- No migration needed for old transactions
- Cashfree production credentials provided
- PhonePe credentials already in Secrets Manager
- All enhancements designed for multi-solution support
- Commission split payment deferred (dummy IDs for now)

---

**Status**: Ready to start Phase 1 🚀
