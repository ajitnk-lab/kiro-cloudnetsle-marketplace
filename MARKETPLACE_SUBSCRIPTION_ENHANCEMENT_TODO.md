# Marketplace Checkout & Subscription Enhancement

## Overview
Implement 3 major features to enhance the marketplace platform:
1. **Checkout UI/UX Enhancement** - Trust signals, compliance badges, mandatory terms
2. **Pro Subscription Model** - Convert one-time pro to monthly subscription with auto-downgrade
3. **User Profile Updates** - Display subscription status, expiry warnings, renewal CTAs

## Implementation Checklist

### Phase 1: Backend Analysis & Structure
- [ ] Examine current backend Lambda functions and API structure
- [ ] Locate validate-solution-token API implementation in marketplace backend
- [ ] Find payment success handler Lambda function
- [ ] Check current user profile API endpoint implementation

### Phase 2: Database & API Changes
- [ ] Add pro_expires_at field to DynamoDB entitlements table schema
- [ ] Update validate-solution-token API to check pro_expires_at for auto-downgrade
- [ ] Modify payment success handler to set 30-day expiry after successful payment
- [ ] Create migration script to set pro_expires_at for existing pro users
- [ ] Update user profile API to return pro_expires_at field

### Phase 3: Frontend Enhancements
- [ ] Enhance ProfilePage.tsx with subscription status section
- [ ] Add expiry date display for pro users in profile
- [ ] Add current plan display for registered users in profile
- [ ] Implement expiry warning logic (3 days before expiry)
- [ ] Add renewal CTA button in profile page
- [ ] Update checkout page terminology from 'Upgrade to Pro' to 'Pro Monthly Subscription'
- [ ] Update FAISS app upgrade button text to 'Subscribe to Pro Monthly'

### Phase 4: Testing & Deployment
- [ ] Test validate-solution-token API with new expiry logic
- [ ] Test payment flow with new expiry field
- [ ] Test profile page subscription status display
- [ ] Deploy all changes using deploy-full.sh script
- [ ] Verify FAISS integration still works with new subscription model
- [ ] Test complete user flow: register → subscribe → use → renewal

## Key Implementation Notes

### Subscription Logic
- **Pro Duration**: 30 days from payment date
- **Auto-downgrade**: Immediate when pro_expires_at passes
- **Renewal**: Only after expiry (no early renewal)
- **Existing Users**: Set expiry to 30 days from today

### UI Changes
- Checkout: "Pro Monthly Subscription (₹299/month)"
- Profile: Show expiry dates and renewal options
- FAISS: "Subscribe to Pro Monthly" button

### Safety Guidelines
- Preserve all existing functionality
- Make minimal, incremental changes
- Test each component before moving to next
- Use deploy-full.sh for consistent deployment

## Files to Modify

### Backend
- Lambda functions for validate-solution-token API
- Payment success handler Lambda
- User profile API Lambda
- DynamoDB table schema (entitlements)

### Frontend
- `/packages/frontend/src/pages/CheckoutPage.tsx` ✅ (Already enhanced)
- `/packages/frontend/src/pages/ProfilePage.tsx`
- Terms agreement and subscription terminology

### FAISS Integration
- Update upgrade button text in FAISS UI

## Success Criteria
1. Users can subscribe to monthly pro plans
2. Subscriptions auto-downgrade after 30 days
3. Profile page shows clear subscription status
4. Renewal flow works seamlessly
5. All existing functionality preserved
6. FAISS integration continues working

---
**Created**: November 30, 2025
**Todo List ID**: 1764495886082
**Status**: Ready for Implementation
