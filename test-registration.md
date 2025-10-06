# Registration Testing Guide

## 🧪 Testing the Fixed Registration Flow

### What Was Fixed:
- ✅ **Cognito Integration**: Now uses AWS Cognito SDK instead of direct API calls
- ✅ **UserId Generation**: Cognito automatically generates userId
- ✅ **Proper Attributes**: Maps name to givenName/familyName for Cognito
- ✅ **Custom Attributes**: Stores role and company in Cognito custom attributes
- ✅ **Profile Creation**: Creates user profile in DynamoDB after Cognito registration

### Test Steps:

1. **Visit the Registration Page**
   - Go to: https://dddzq9ul1ygr3.cloudfront.net/register
   - The form should load without the "userId required" error

2. **Fill Out Registration Form**
   - **Account Type**: Select "Customer" or "Partner"
   - **Full Name**: Enter your name (e.g., "John Doe")
   - **Email**: Enter a valid email address
   - **Password**: Must meet requirements:
     - At least 8 characters
     - 1 uppercase letter
     - 1 lowercase letter  
     - 1 number
     - 1 special character
   - **Company**: (Only for Partner accounts)
   - **Terms**: Check the agreement box

3. **Submit Registration**
   - Click "Create account"
   - Should show "Creating account..." loading state
   - On success: Should redirect to homepage or show success message
   - On error: Should show specific error message

### Expected Behavior:

#### ✅ **Success Case:**
- Cognito creates user account
- Email verification sent to user
- User profile created in DynamoDB
- User redirected to homepage or verification page

#### ⚠️ **Expected Errors:**
- **Email already exists**: "An account with the given email already exists"
- **Weak password**: Specific password requirement messages
- **Invalid email**: "Please enter a valid email address"
- **Network issues**: "Registration failed" with retry option

### Verification Steps:

1. **Check Cognito User Pool**
   ```bash
   aws cognito-idp list-users --user-pool-id us-east-1_8mn2piFO9
   ```

2. **Check DynamoDB User Table**
   ```bash
   aws dynamodb scan --table-name [USER_TABLE_NAME] --limit 5
   ```

3. **Check CloudWatch Logs**
   - Lambda function logs for registration
   - Any error messages or successful executions

### Troubleshooting:

#### If registration still fails:
1. **Check browser console** for JavaScript errors
2. **Check network tab** for failed API calls
3. **Verify Cognito configuration** in AWS Console
4. **Check Lambda function logs** in CloudWatch

#### Common Issues:
- **CORS errors**: Check API Gateway CORS configuration
- **Cognito errors**: Verify user pool settings and custom attributes
- **Lambda errors**: Check environment variables and permissions

### Next Steps After Successful Registration:
1. **Email Verification**: User should receive verification email
2. **Login Testing**: Test login with registered credentials
3. **Profile Access**: Test accessing protected routes
4. **Social Login**: Test Google/GitHub OAuth (if configured)

---

## 🎯 **Test Results Template**

**Date**: ___________  
**Tester**: ___________

### Registration Form:
- [ ] Form loads without errors
- [ ] All fields present and functional
- [ ] Password strength indicator works
- [ ] Account type selection works
- [ ] Terms checkbox validation works

### Registration Process:
- [ ] Customer registration successful
- [ ] Partner registration successful  
- [ ] Email validation works
- [ ] Password validation works
- [ ] Error handling appropriate

### Backend Integration:
- [ ] Cognito user created
- [ ] DynamoDB profile created
- [ ] Email verification sent
- [ ] No console errors

**Overall Status**: [ ] Pass [ ] Fail [ ] Partial

**Issues Found**:
1. ___________
2. ___________

**Notes**: ___________