# PayU Webhook Fix - Summary

## Problem
PayU payment webhooks were failing with "Missing txnid, returning 400" error, preventing Pro tier upgrades from being applied to user accounts after successful payments.

## Root Cause
The deployed PayU webhook Lambda function was checking for a field named `txnid`, but PayU sends the transaction ID as `merchantTransactionId` instead.

## Investigation
1. Analyzed CloudWatch logs for PayU webhook Lambda: `/aws/lambda/MarketplaceStack-v3-DataStackPayUWebhookFunction9C-vhu0ZeC0OYAZ`
2. Found error pattern: "Missing txnid, returning 400"
3. Downloaded deployed Lambda code from S3 and found it already had the fix (fallback to `merchantTransactionId`)
4. Discovered the deployed code was an older version that didn't have the fallback logic

## Solution
Updated the PayU webhook Lambda function with the correct code that handles both field names:

```javascript
const { txnid, merchantTransactionId, ...otherFields } = data
const transactionId = txnid || merchantTransactionId

if (!transactionId) {
  console.log('Missing transaction ID, returning 400')
  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'Missing transaction ID' })
  }
}
```

## Fix Applied
- **Date**: 2026-01-22 06:26:55 UTC
- **Method**: Direct Lambda code update using AWS CLI
- **Function**: `MarketplaceStack-v3-DataStackPayUWebhookFunction9C-vhu0ZeC0OYAZ`
- **File**: `/persistent/vscode-workspace/kiro-cloudnetsle-marketplace/packages/infrastructure/lambda/payments/payu-webhook.js`
- **Status**: Successfully deployed

## Verification Steps
1. Monitor CloudWatch logs for new PayU webhook calls
2. Check that webhooks no longer return 400 errors
3. Verify that successful payments create entitlements in DynamoDB
4. Test with a real PayU payment to confirm end-to-end flow

## Affected User
- **Email**: `ajitnk2006+22012026-1@gmail.com`
- **User ID**: `b4b87408-f061-70d3-c8f3-f042fdbbc8b3`
- **Action Needed**: Manually create Pro entitlement or trigger reprocessing of completed payment

## Next Steps
1. Test webhook with a new PayU payment
2. For the affected user, either:
   - Manually create the entitlement in DynamoDB
   - Have them make a new payment (which will now work)
   - Trigger reprocessing of their original payment if transaction record exists

## Files Modified
- `/persistent/vscode-workspace/kiro-cloudnetsle-marketplace/packages/infrastructure/lambda/payments/payu-webhook.js` (copied from deployed Lambda)

## Notes
- The fix was already in the codebase but wasn't deployed
- Future deployments using `deploy-full.sh` will include this fix
- Consider adding integration tests for payment webhooks to catch such issues earlier
