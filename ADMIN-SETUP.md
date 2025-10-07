# 🔐 Admin System Setup & Management

## **Overview**

The marketplace platform has a comprehensive admin system for managing partners, solutions, and platform operations. This guide explains how to set up and use the admin interface.

---

## **🚀 Quick Setup**

### **1. Create Admin User**

Run the admin creation script:

```powershell
# From project root directory
./create-admin.ps1
```

**OR manually:**

```bash
cd packages/infrastructure
export USER_POOL_ID="your-user-pool-id"
export USER_TABLE_NAME="marketplace-users-your-account-id"
node scripts/create-admin-user.js
```

### **2. Default Admin Credentials**

```
Email: admin@marketplace.com
Password: Admin123!@#
Role: admin
```

**⚠️ IMPORTANT: Change the password after first login!**

---

## **🔗 Admin Dashboard Access**

### **Login URL**
```
https://dddzq9ul1ygr3.cloudfront.net/admin/dashboard
```

### **Navigation**
- Login with admin credentials
- Navigate to `/admin/dashboard`
- Access all admin features from the dashboard

---

## **📋 Admin Capabilities**

### **1. Partner Application Management**
- **View Applications**: See all pending partner applications
- **Approve/Reject**: One-click approval or rejection with reasons
- **Application Details**: Review business information, tax details, bank info
- **Email Notifications**: Automatic emails sent to applicants

### **2. Solution Moderation**
- **Moderation Queue**: View all pending solutions
- **Approve Solutions**: Make solutions live on the marketplace
- **Reject Solutions**: Reject with feedback for improvement
- **Search & Filter**: Find solutions by status, category, partner
- **Solution Preview**: View solution details before approval

### **3. Platform Analytics**
- **Revenue Overview**: Total platform revenue and commissions
- **User Statistics**: Total users, partners, solutions
- **Growth Metrics**: Monthly trends and performance indicators
- **Recent Activity**: Platform activity feed

### **4. User Management** *(Coming Soon)*
- **User Accounts**: Manage customer and partner accounts
- **Account Status**: Activate/deactivate users
- **Role Management**: Change user roles and permissions

---

## **🔄 Partner Approval Workflow**

### **Step 1: Partner Registration**
1. User registers with role "partner"
2. Partner fills out application form
3. Application status: `pending`
4. Admin receives notification

### **Step 2: Admin Review**
1. Admin logs into dashboard
2. Views pending applications
3. Reviews business details, documents
4. Makes approval decision

### **Step 3: Approval Process**
```javascript
// Approve Application
status: 'approved'
→ User role updated to 'partner'
→ Email notification sent
→ Partner can create solutions

// Reject Application  
status: 'rejected'
→ User remains 'customer'
→ Rejection reason sent via email
→ Can reapply later
```

---

## **🛡️ Solution Moderation Workflow**

### **Step 1: Solution Submission**
1. Partner creates solution
2. Solution status: `pending`
3. Appears in admin moderation queue

### **Step 2: Admin Moderation**
1. Admin reviews solution details
2. Checks images, description, pricing
3. Verifies compliance with guidelines

### **Step 3: Moderation Decision**
```javascript
// Approve Solution
status: 'active'
→ Solution appears in marketplace
→ Available for purchase
→ Partner notified

// Reject Solution
status: 'rejected'
→ Solution hidden from marketplace
→ Feedback sent to partner
→ Partner can edit and resubmit
```

---

## **⚙️ Admin Permissions**

### **Current Admin Capabilities**
- ✅ View all partner applications
- ✅ Approve/reject partner applications
- ✅ View all solutions (including pending)
- ✅ Moderate solutions (approve/reject)
- ✅ Access platform analytics
- ✅ View user statistics
- ✅ Platform configuration access

### **Planned Admin Features**
- 🔄 User account management
- 🔄 Commission rate configuration
- 🔄 Platform settings management
- 🔄 Advanced reporting and exports
- 🔄 Bulk operations for solutions/users

---

## **🧪 Testing Admin Features**

### **Test Partner Approval**
1. Register new user as "partner"
2. Fill out partner application
3. Login as admin
4. Go to `/admin/dashboard`
5. Navigate to "Partner Management" tab
6. Approve/reject the application
7. Verify email notifications

### **Test Solution Moderation**
1. Login as approved partner
2. Create a new solution
3. Login as admin
4. Go to "Solution Moderation" tab
5. Review and approve/reject solution
6. Verify solution appears in marketplace

---

## **🔧 Troubleshooting**

### **Admin User Not Working**
```bash
# Re-run admin creation script
./create-admin.ps1

# Check Cognito User Pool
aws cognito-idp admin-get-user \
  --user-pool-id YOUR_POOL_ID \
  --username admin@marketplace.com

# Check DynamoDB record
aws dynamodb get-item \
  --table-name marketplace-users-ACCOUNT-ID \
  --key '{"userId":{"S":"admin-user-id"}}'
```

### **Access Denied Errors**
- Verify user has `role: 'admin'` in DynamoDB
- Check Cognito custom attributes
- Ensure JWT token includes admin role
- Clear browser cache and re-login

### **Missing Admin Dashboard**
- Verify deployment includes admin routes
- Check frontend build includes AdminDashboardPage
- Ensure API endpoints are deployed

---

## **🔒 Security Considerations**

### **Password Security**
- Change default password immediately
- Use strong, unique passwords
- Consider implementing 2FA (future enhancement)

### **Access Control**
- Admin role has full platform access
- Regularly audit admin activities
- Monitor admin login attempts
- Implement session timeouts

### **Data Protection**
- Admin can access all user data
- Follow data privacy regulations
- Implement audit logging (future enhancement)
- Regular security reviews

---

## **📞 Support**

### **Admin Issues**
- Check deployment logs for errors
- Verify AWS permissions and resources
- Review Cognito and DynamoDB configurations

### **Feature Requests**
- Additional admin capabilities can be added
- Custom reporting and analytics
- Advanced user management features
- Bulk operations and data exports

---

**The admin system provides comprehensive platform management capabilities with a professional interface for all administrative tasks!** 🎉