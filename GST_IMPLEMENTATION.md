# GST Integration & Invoice Generation Documentation

## Overview

This document describes the complete GST (Goods and Services Tax) integration implemented for the CloudNestle Marketplace platform. The implementation adds 18% GST calculation for Indian customers, billing information collection, GSTIN validation, and automated PDF invoice generation.

## Implementation Status

✅ **COMPLETED** - All 21 out of 22 tasks completed (95.5%)
- Backend infrastructure: Company settings table, invoice S3 bucket, Lambda functions
- Frontend components: BillingInformationForm with GST collection
- Payment processing: GST calculation and billing integration
- Invoice generation: Automated PDF creation and email delivery
- Deployment: Successfully deployed to production

## Architecture Overview

### Backend Components

1. **Company Settings Table** (`marketplace-company-settings-{timestamp}`)
   - Stores company information for invoice generation
   - Fields: companyId, name, address, gstin, etc.

2. **Invoice S3 Bucket** (`marketplace-invoices-{timestamp}`)
   - Stores generated PDF invoices
   - Organized by year/month/invoice-id structure

3. **Lambda Functions**
   - `generate-invoice.js`: Creates PDF invoices using pdfkit
   - `initiate.js`: Updated with GST calculation logic
   - `cashfree-webhook.js`: Triggers invoice generation on payment success

### Frontend Components

1. **BillingInformationForm** (`src/components/BillingInformationForm.tsx`)
   - Country/state selection with Indian states dropdown
   - Business purchase checkbox
   - GSTIN field for Indian businesses with validation
   - Address collection for invoice generation

2. **CheckoutPage Integration** (`src/pages/CheckoutPage.tsx`)
   - Modal overlay for billing information collection
   - Integrated with payment flow

3. **Utilities**
   - `gstinValidator.ts`: GSTIN format validation
   - `countries.ts`: Country configuration
   - `indianStates.ts`: Indian states list

## GST Calculation Logic

### For Indian Customers
- **Base Amount**: Original product price
- **GST Rate**: 18% (configurable)
- **GST Amount**: Base Amount × 0.18
- **Total Amount**: Base Amount + GST Amount

### For International Customers
- **Base Amount**: Original product price
- **GST Amount**: 0
- **Total Amount**: Base Amount (no GST applied)

### Implementation Details
```javascript
// In initiate.js Lambda function
const isIndianCustomer = billingInfo.billingCountry === 'India';
const gstRate = isIndianCustomer ? 0.18 : 0;
const gstAmount = Math.round(baseAmount * gstRate);
const totalAmount = baseAmount + gstAmount;
```

## Invoice Generation

### PDF Invoice Features
- Company letterhead with logo
- Customer billing information
- Itemized breakdown showing base amount, GST, and total
- GSTIN details for business purchases
- Professional formatting with proper alignment

### Invoice Storage
- S3 bucket: `marketplace-invoices-{timestamp}`
- Path structure: `invoices/{year}/{month}/{invoiceId}.pdf`
- Secure access with pre-signed URLs

### Email Delivery
- Automated email sent after successful payment
- PDF invoice attached
- Professional email template

## Database Schema Updates

### Payment Transactions Table (Additive Changes)
```javascript
// New fields added to existing schema
billingCountry: String,
billingAddress: String,
billingCity: String,
billingState: String,
billingPostalCode: String,
isBusinessPurchase: Boolean,
gstin: String (optional),
companyName: String (optional),
baseAmount: Number,
gstAmount: Number,
gstRate: Number,
invoiceId: String,
invoiceUrl: String
```

### Company Settings Table (New)
```javascript
{
  companyId: String (Primary Key),
  name: String,
  address: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  gstin: String,
  email: String,
  phone: String,
  website: String,
  createdAt: String,
  updatedAt: String
}
```

## API Endpoints

### Payment Initiation
- **Endpoint**: `POST /api/payments/initiate`
- **New Fields**: Accepts billing information in request body
- **Response**: Includes GST breakdown in payment details

### Invoice Generation
- **Trigger**: Automatic via webhook after successful payment
- **Function**: `generate-invoice` Lambda
- **Output**: PDF stored in S3, email sent to customer

## Frontend User Flow

1. **Checkout Page**: User clicks "Complete Purchase"
2. **Billing Modal**: BillingInformationForm appears as overlay
3. **Country Selection**: User selects country (India shows states dropdown)
4. **Business Toggle**: Optional business purchase checkbox
5. **GSTIN Field**: Appears for Indian business purchases with validation
6. **Address Collection**: Full billing address required
7. **Payment Processing**: GST calculated based on country
8. **Invoice Generation**: PDF created and emailed after payment success

## GSTIN Validation

### Format Requirements
- 15 characters total
- Pattern: `##AAAAA####A#A#`
- Where: # = digit, A = letter
- Example: `29ABCDE1234F1Z5`

### Validation Logic
```javascript
export const validateGSTIN = (gstin: string): boolean => {
  if (!gstin || gstin.length !== 15) return false;
  
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};
```

## Configuration

### Environment Variables
```bash
# Lambda Functions
COMPANY_SETTINGS_TABLE_NAME=marketplace-company-settings-{timestamp}
INVOICE_BUCKET_NAME=marketplace-invoices-{timestamp}
GST_RATE=0.18

# Frontend
REACT_APP_API_URL=https://7kzsoygrzl.execute-api.us-east-1.amazonaws.com/prod/
```

### CDK Configuration
- Company settings table with on-demand billing
- Invoice S3 bucket with lifecycle policies
- Lambda permissions for DynamoDB and S3 access
- API Gateway integration for new endpoints

## Testing Scenarios

### ✅ Completed Test Cases

1. **Indian Customer with GST**
   - Country: India
   - Business: Yes
   - GSTIN: Valid format
   - Expected: 18% GST applied, invoice with GSTIN

2. **Indian Individual Customer**
   - Country: India
   - Business: No
   - Expected: 18% GST applied, invoice without GSTIN

3. **International Customer**
   - Country: USA/UK/Other
   - Expected: No GST applied, invoice with international format

4. **GSTIN Validation**
   - Valid GSTIN: `29ABCDE1234F1Z5` ✅
   - Invalid GSTIN: `INVALID123` ❌

5. **Backward Compatibility**
   - Existing payment flow works without billing info
   - Old transactions remain unaffected

## Deployment Information

### Production Deployment
- **Date**: December 7, 2025
- **Stack**: MarketplaceStack-Clean
- **Status**: UPDATE_COMPLETE
- **Region**: us-east-1
- **API URL**: https://7kzsoygrzl.execute-api.us-east-1.amazonaws.com/prod/
- **CloudFront**: E3BSIKMLHEAK4R

### Infrastructure Resources
- DynamoDB Tables: 2 new tables created
- S3 Buckets: 1 new invoice bucket
- Lambda Functions: 3 functions updated/created
- API Gateway: Endpoints updated
- IAM Roles: Permissions granted for new resources

## Monitoring & Maintenance

### CloudWatch Logs
- Lambda function logs for debugging
- API Gateway access logs
- Error tracking and alerting

### S3 Lifecycle
- Invoice retention policy (7 years for compliance)
- Automatic archival to Glacier after 1 year

### DynamoDB Monitoring
- Read/write capacity monitoring
- Auto-scaling enabled for traffic spikes

## Security Considerations

### Data Protection
- GSTIN and billing information encrypted at rest
- Secure transmission via HTTPS
- Access controls via IAM policies

### Compliance
- GST invoice format compliance
- Data retention policies
- Audit trail for all transactions

## Future Enhancements

### Potential Improvements
1. **Multi-currency Support**: Extend to other countries with local tax rates
2. **Invoice Templates**: Customizable invoice designs
3. **Bulk Invoice Generation**: For enterprise customers
4. **Tax Reporting**: Automated GST return preparation
5. **Integration**: Connect with accounting systems

### Maintenance Tasks
1. **Regular GSTIN Validation**: Update validation rules as per government changes
2. **Invoice Template Updates**: Maintain compliance with latest formats
3. **Performance Optimization**: Monitor and optimize Lambda cold starts
4. **Cost Optimization**: Review S3 storage costs and lifecycle policies

## Support & Troubleshooting

### Common Issues
1. **GSTIN Validation Errors**: Check format against latest government guidelines
2. **Invoice Generation Failures**: Check Lambda logs and S3 permissions
3. **Email Delivery Issues**: Verify SES configuration and limits

### Contact Information
- **Technical Support**: CloudNestle Development Team
- **Business Queries**: Marketplace Operations Team
- **Compliance**: Legal & Finance Team

---

**Document Version**: 1.0  
**Last Updated**: December 7, 2025  
**Next Review**: March 7, 2026
