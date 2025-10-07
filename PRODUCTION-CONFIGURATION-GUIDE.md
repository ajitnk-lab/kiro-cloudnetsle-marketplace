# 🔧 PRODUCTION CONFIGURATION GUIDE

## 🎯 IMMEDIATE PRODUCTION SETUP

### 1. Configure Production Payment Gateway (Instamojo)

#### Current Test Configuration
```javascript
// In Lambda environment variables (TEST MODE)
INSTAMOJO_API_KEY: 'test_api_key'
INSTAMOJO_AUTH_TOKEN: 'test_auth_token'
INSTAMOJO_ENDPOINT: 'https://test.instamojo.com/api/1.1/'
```

#### Production Configuration Steps

1. **Get Production Credentials from Instamojo:**
   - Login to your Instamojo account
   - Go to API & Plugins section
   - Generate production API Key and Auth Token
   - Note down the production endpoint: `https://www.instamojo.com/api/1.1/`

2. **Update Lambda Environment Variables:**
   ```bash
   # Update Payment Function
   aws lambda update-function-configuration \
     --function-name "MP-1759832846408-ApiStackPaymentFunction-XXXXX" \
     --environment Variables='{
       "INSTAMOJO_API_KEY":"your_production_api_key",
       "INSTAMOJO_AUTH_TOKEN":"your_production_auth_token",
       "INSTAMOJO_ENDPOINT":"https://www.instamojo.com/api/1.1/",
       "USERS_TABLE":"marketplace-users-1759832846643",
       "SOLUTIONS_TABLE":"marketplace-solutions-1759832846643",
       "TRANSACTIONS_TABLE":"marketplace-transactions-1759832846643",
       "USER_SOLUTIONS_TABLE":"marketplace-user-solutions-1759832846643",
       "FRONTEND_URL":"http://marketplace-frontend-20251007172501.s3-website-us-east-1.amazonaws.com",
       "FROM_EMAIL":"ajitnk2006+noreply@gmail.com"
     }'
   ```

3. **Test Payment Integration:**
   ```bash
   # Test payment creation with small amount
   curl -X POST https://ug63mrbfol.execute-api.us-east-1.amazonaws.com/prod/payments/create \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_USER_TOKEN" \
     -d '{
       "solutionId": "sol-001",
       "amount": 1
     }'
   ```

### 2. Fix User Registration API

#### Debug Registration Issue
```bash
# Test registration with proper format
curl -X POST https://ug63mrbfol.execute-api.us-east-1.amazonaws.com/prod/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestUser123!",
    "name": "Test User",
    "company": "Test Company"
  }'
```

#### Check Lambda Logs
```bash
# View registration function logs
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/MP-1759832846408-ApiStackRegisterFunction-XXXXX" \
  --order-by LastEventTime --descending --max-items 1

# Get recent log events
aws logs get-log-events \
  --log-group-name "/aws/lambda/MP-1759832846408-ApiStackRegisterFunction-XXXXX" \
  --log-stream-name "LATEST_STREAM_NAME"
```

### 3. Enable HTTPS for Frontend (Optional but Recommended)

#### Create CloudFront Distribution
```bash
# Create CloudFront distribution for HTTPS
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "marketplace-frontend-'$(date +%s)'",
    "Comment": "Marketplace Frontend HTTPS",
    "DefaultRootObject": "index.html",
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "S3-marketplace-frontend",
        "DomainName": "marketplace-frontend-20251007172501.s3-website-us-east-1.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-marketplace-frontend",
      "ViewerProtocolPolicy": "redirect-to-https",
      "MinTTL": 0,
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {"Forward": "none"}
      }
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
  }'
```

### 4. Configure Custom Domain (Optional)

#### Steps for Custom Domain
1. **Purchase Domain** (e.g., yourmarketplace.com)
2. **Create Route 53 Hosted Zone**
3. **Add CNAME Records:**
   - `www.yourmarketplace.com` → CloudFront distribution
   - `api.yourmarketplace.com` → API Gateway custom domain

#### Route 53 Configuration
```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name yourmarketplace.com \
  --caller-reference marketplace-$(date +%s)

# Add CNAME record for frontend
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.yourmarketplace.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "YOUR_CLOUDFRONT_DOMAIN"}]
      }
    }]
  }'
```

---

## 🔒 SECURITY HARDENING

### 1. API Security
- [ ] Enable API Gateway throttling
- [ ] Add request validation
- [ ] Implement rate limiting per user
- [ ] Add CORS restrictions

### 2. Database Security
- [ ] Enable DynamoDB encryption at rest
- [ ] Configure backup and point-in-time recovery
- [ ] Set up access logging
- [ ] Implement least-privilege IAM policies

### 3. Frontend Security
- [ ] Add Content Security Policy headers
- [ ] Enable HTTPS-only cookies
- [ ] Implement XSS protection
- [ ] Add CSRF protection

---

## 📊 MONITORING SETUP

### 1. CloudWatch Alarms
```bash
# API Gateway 4xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name "API-4xx-Errors" \
  --alarm-description "High 4xx error rate" \
  --metric-name 4XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# Lambda function errors
aws cloudwatch put-metric-alarm \
  --alarm-name "Lambda-Errors" \
  --alarm-description "Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### 2. Dashboard Creation
```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "Marketplace-Platform" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/ApiGateway", "Count", "ApiName", "MarketplaceApi"],
            ["AWS/Lambda", "Invocations", "FunctionName", "CatalogFunction"]
          ],
          "period": 300,
          "stat": "Sum",
          "region": "us-east-1",
          "title": "API Usage"
        }
      }
    ]
  }'
```

---

## 🚀 PERFORMANCE OPTIMIZATION

### 1. API Gateway Caching
```bash
# Enable caching on catalog endpoints
aws apigateway put-method \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_RESOURCE_ID \
  --http-method GET \
  --request-parameters method.request.querystring.category=false \
  --caching-enabled \
  --cache-ttl 300
```

### 2. DynamoDB Optimization
- [ ] Configure auto-scaling for tables
- [ ] Add Global Secondary Indexes for common queries
- [ ] Enable DynamoDB Accelerator (DAX) for read-heavy workloads
- [ ] Optimize partition key distribution

### 3. Lambda Optimization
- [ ] Increase memory allocation for better performance
- [ ] Enable provisioned concurrency for critical functions
- [ ] Optimize cold start times
- [ ] Implement connection pooling

---

## 📧 EMAIL NOTIFICATIONS SETUP

### 1. Configure SES
```bash
# Verify email addresses
aws ses verify-email-identity --email-address noreply@yourmarketplace.com
aws ses verify-email-identity --email-address support@yourmarketplace.com

# Create email templates
aws ses create-template \
  --template '{
    "TemplateName": "WelcomeEmail",
    "Subject": "Welcome to {{marketplace_name}}",
    "HtmlPart": "<h1>Welcome {{user_name}}!</h1><p>Thank you for joining our marketplace.</p>",
    "TextPart": "Welcome {{user_name}}! Thank you for joining our marketplace."
  }'
```

### 2. Update Lambda Functions
- Add SES permissions to Lambda execution role
- Update email templates in Lambda functions
- Configure email sending for key events:
  - User registration
  - Partner application approval
  - Solution purchase confirmation
  - Payment success/failure

---

## 🎯 PRODUCTION CHECKLIST

### Pre-Launch Checklist
- [ ] Production payment gateway configured
- [ ] User registration API fixed and tested
- [ ] HTTPS enabled for frontend
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerting set up
- [ ] Email notifications configured
- [ ] Security hardening completed
- [ ] Performance optimization applied
- [ ] Backup and disaster recovery plan
- [ ] Load testing completed

### Launch Day Checklist
- [ ] All systems status green
- [ ] Payment processing tested with real transactions
- [ ] User registration and login working
- [ ] Admin dashboard functional
- [ ] Partner onboarding process tested
- [ ] Customer support channels ready
- [ ] Marketing materials prepared
- [ ] Analytics tracking configured

### Post-Launch Monitoring
- [ ] Monitor API response times
- [ ] Track user registration rates
- [ ] Monitor payment success rates
- [ ] Watch for error rates and alerts
- [ ] Review user feedback and issues
- [ ] Monitor infrastructure costs
- [ ] Track business metrics

---

## 📞 SUPPORT CONTACTS

### Technical Support
- **AWS Support:** Your AWS support plan
- **Instamojo Support:** support@instamojo.com
- **Domain Registrar:** Your domain provider support

### Emergency Procedures
1. **API Down:** Check CloudWatch logs, restart Lambda functions
2. **Database Issues:** Check DynamoDB metrics, scale capacity
3. **Payment Failures:** Verify Instamojo credentials and status
4. **Frontend Issues:** Check S3 bucket and CloudFront status

**🎯 Your marketplace platform is ready for production!** 🚀