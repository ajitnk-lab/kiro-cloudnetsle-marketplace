# 📧 AWS SES Email Setup Guide

## **What is AWS SES Email Verification?**

**AWS SES (Simple Email Service)** is Amazon's email sending service. Your marketplace uses it to send:
- 📧 Partner application notifications
- 💳 Payment confirmations  
- 🔔 Admin alerts
- ✅ User verification emails

**Email verification** is required by AWS to prevent spam and ensure you own the email addresses you're sending from.

---

## **🤖 100% AUTOMATED SETUP**

**Yes! This can be completely automated** - no manual AWS console work needed!

### **Quick Setup (Recommended)**

```powershell
# 1. Setup SES emails (sends verification emails)
./setup-ses-emails.ps1

# 2. Check your email and click verification links

# 3. Check verification status
./check-ses-status.ps1
```

---

## **📧 Email Configuration**

### **Your Marketplace Emails:**
```
From Email:    ajitnk2006+noreply@gmail.com    (sends notifications)
Admin Email:   ajitnk2006+admin@gmail.com      (receives admin alerts)
Reply-To:      ajitnk2006+support@gmail.com    (user replies go here)
```

### **Why These Emails?**
- **Gmail Plus Addressing**: Uses your existing Gmail with `+tags`
- **Organized**: Different purposes use different addresses
- **Professional**: Clean separation of email types
- **Easy Management**: All go to your main Gmail inbox

---

## **🚀 Step-by-Step Setup Process**

### **Step 1: Run Setup Script**
```powershell
./setup-ses-emails.ps1
```

**What this does:**
- ✅ Checks AWS credentials
- ✅ Configures SES email identities
- ✅ Sends verification emails to your Gmail
- ✅ Sets up email tracking and monitoring

### **Step 2: Check Your Email**
1. **Open Gmail**: Check your inbox for `ajitnk2006@gmail.com`
2. **Look for AWS emails**: Subject "Amazon SES Address Verification Request"
3. **You'll get 3 emails** (one for each email address)
4. **Click verification links** in each email
5. **See confirmation**: "Congratulations! You have successfully verified..."

### **Step 3: Verify Setup**
```powershell
./check-ses-status.ps1
```

**Expected output:**
```
✅ ajitnk2006+noreply@gmail.com - VERIFIED
✅ ajitnk2006+admin@gmail.com - VERIFIED  
✅ ajitnk2006+support@gmail.com - VERIFIED

🎉 All emails are verified! Your marketplace is ready to send emails.
```

---

## **📋 What Happens After Verification**

### **✅ Marketplace Email Capabilities:**
- **Partner Notifications**: New applications, approvals, rejections
- **Payment Confirmations**: Purchase receipts and transaction details
- **Admin Alerts**: New partner applications, solution submissions
- **User Communications**: Welcome emails, password resets

### **📧 Email Flow Examples:**

**Partner Application:**
```
1. Partner submits application
2. Admin gets email: "New Partner Application - Review Required"
3. Admin approves/rejects
4. Partner gets email: "Application Approved!" or "Application Rejected"
```

**Solution Purchase:**
```
1. Customer buys solution
2. Customer gets email: "Payment Confirmation - Solution Name"
3. Partner gets email: "New Sale - Commission Earned"
```

---

## **🔧 Troubleshooting**

### **Verification Emails Not Received?**
```powershell
# Check spam/junk folders
# Re-run setup script
./setup-ses-emails.ps1

# Wait 5 minutes and try again
./check-ses-status.ps1
```

### **AWS Credentials Issues?**
```bash
# Check AWS configuration
aws sts get-caller-identity

# If not configured, run:
aws configure
```

### **SES Not Available in Region?**
```bash
# Check current region
aws configure get region

# SES is available in most regions, but verify:
aws ses describe-configuration-sets --region us-east-1
```

### **Permission Errors?**
Your AWS user needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:VerifyEmailIdentity",
        "ses:GetIdentityVerificationAttributes",
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## **🔒 Security & Best Practices**

### **Email Security:**
- ✅ **Verified Domains**: Only verified emails can send
- ✅ **Bounce Handling**: Automatic bounce and complaint tracking
- ✅ **Rate Limiting**: AWS prevents spam with sending limits
- ✅ **Encryption**: All emails sent over TLS

### **Gmail Plus Addressing:**
- ✅ **All emails go to one inbox**: Your main Gmail
- ✅ **Easy filtering**: Create Gmail filters by `+tag`
- ✅ **Professional appearance**: Recipients see clean addresses
- ✅ **No extra accounts needed**: Uses your existing Gmail

### **Monitoring:**
- ✅ **CloudWatch Metrics**: Email delivery, bounces, complaints
- ✅ **Event Tracking**: Success/failure notifications
- ✅ **Configuration Sets**: Organized email tracking

---

## **📊 Advanced Configuration**

### **Custom Email Addresses (Optional)**
If you want to use different emails, update these files:
```typescript
// packages/infrastructure/lib/marketplace-infrastructure-stack.ts
const emailStack = new EmailStack(this, 'EmailStack', {
  fromEmail: 'your-custom@domain.com',
  adminEmail: 'admin@domain.com', 
  replyToEmail: 'support@domain.com'
})
```

### **Production Domain (Future)**
For production, you can:
1. **Buy a domain**: `marketplace-domain.com`
2. **Verify domain**: Instead of individual emails
3. **Professional emails**: `noreply@marketplace-domain.com`
4. **Custom branding**: Your own domain in emails

---

## **🧪 Testing Email Functionality**

### **Test Partner Application Email:**
1. Register as partner
2. Submit application  
3. Check admin email for notification
4. Login as admin and approve
5. Check partner email for approval notification

### **Test Payment Confirmation:**
1. Purchase a solution
2. Check customer email for payment confirmation
3. Verify email contains transaction details

### **Test Admin Alerts:**
1. New partner application triggers admin email
2. New solution submission triggers admin email
3. Payment disputes trigger admin email

---

## **📞 Support**

### **Common Issues:**
- **Emails in spam**: Check spam/junk folders
- **Verification timeout**: Links expire after 24 hours
- **Multiple Gmail accounts**: Ensure you're checking the right inbox
- **Region issues**: SES must be in same region as your deployment

### **Getting Help:**
- **AWS SES Documentation**: https://docs.aws.amazon.com/ses/
- **Gmail Plus Addressing**: https://support.google.com/mail/answer/12096
- **Marketplace Support**: Check deployment logs for email errors

---

## **✅ Success Checklist**

- [ ] Run `./setup-ses-emails.ps1`
- [ ] Check Gmail inbox for 3 verification emails
- [ ] Click verification links in all 3 emails
- [ ] Run `./check-ses-status.ps1` 
- [ ] See "All emails are verified!" message
- [ ] Test partner application email flow
- [ ] Test payment confirmation emails
- [ ] Verify admin alert emails work

**Once complete, your marketplace has professional email capabilities!** 🎉

---

## **🔄 Integration with Marketplace**

### **Automatic Integration:**
The email system is **automatically integrated** with:
- ✅ Partner application workflow
- ✅ Payment processing system  
- ✅ Admin notification system
- ✅ User registration process

### **No Code Changes Needed:**
Once emails are verified, the marketplace will automatically:
- Send partner application notifications
- Send payment confirmations
- Send admin alerts
- Handle email bounces and complaints

**Your marketplace is now ready for production email communication!** 📧