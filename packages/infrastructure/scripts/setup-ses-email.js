const { SESClient, VerifyEmailIdentityCommand, GetIdentityVerificationAttributesCommand, ListIdentitiesCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({});

// Email configuration
const EMAIL_CONFIG = {
  fromEmail: process.env.FROM_EMAIL || 'ajitnk2006+noreply@gmail.com',
  adminEmail: process.env.ADMIN_EMAIL || 'ajitnk2006+admin@gmail.com',
  replyToEmail: process.env.REPLY_TO_EMAIL || 'ajitnk2006+support@gmail.com'
};

async function setupSESEmails() {
  try {
    console.log('🔧 Setting up AWS SES email verification...');
    console.log('📧 Email Configuration:');
    console.log(`   From Email: ${EMAIL_CONFIG.fromEmail}`);
    console.log(`   Admin Email: ${EMAIL_CONFIG.adminEmail}`);
    console.log(`   Reply-To Email: ${EMAIL_CONFIG.replyToEmail}`);
    console.log('');

    // Get list of all unique emails
    const uniqueEmails = [...new Set([
      EMAIL_CONFIG.fromEmail,
      EMAIL_CONFIG.adminEmail,
      EMAIL_CONFIG.replyToEmail
    ])];

    console.log(`📋 Processing ${uniqueEmails.length} unique email addresses...`);
    console.log('');

    // Check current verification status
    console.log('🔍 Checking current verification status...');
    
    try {
      const statusResponse = await sesClient.send(new GetIdentityVerificationAttributesCommand({
        Identities: uniqueEmails
      }));

      const verificationAttributes = statusResponse.VerificationAttributes || {};
      
      for (const email of uniqueEmails) {
        const status = verificationAttributes[email];
        if (status) {
          console.log(`   ${email}: ${status.VerificationStatus}`);
        } else {
          console.log(`   ${email}: Not found (needs verification)`);
        }
      }
      console.log('');
    } catch (error) {
      console.log('   Could not check status (will proceed with verification)');
      console.log('');
    }

    // Send verification emails for each unique email
    const verificationResults = [];
    
    for (const email of uniqueEmails) {
      try {
        console.log(`📤 Sending verification email to: ${email}`);
        
        await sesClient.send(new VerifyEmailIdentityCommand({
          EmailAddress: email
        }));
        
        console.log(`   ✅ Verification email sent successfully`);
        verificationResults.push({ email, status: 'sent', error: null });
        
      } catch (error) {
        if (error.name === 'AlreadyExistsException') {
          console.log(`   ⚠️  Email already exists in SES (verification may be pending)`);
          verificationResults.push({ email, status: 'exists', error: null });
        } else {
          console.log(`   ❌ Failed to send verification email: ${error.message}`);
          verificationResults.push({ email, status: 'failed', error: error.message });
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('');
    console.log('📊 Verification Summary:');
    console.log('========================');
    
    let successCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    
    for (const result of verificationResults) {
      if (result.status === 'sent') {
        console.log(`✅ ${result.email} - Verification email sent`);
        successCount++;
      } else if (result.status === 'exists') {
        console.log(`⚠️  ${result.email} - Already in SES (check email for verification link)`);
        pendingCount++;
      } else {
        console.log(`❌ ${result.email} - Failed: ${result.error}`);
        failedCount++;
      }
    }

    console.log('');
    console.log('📈 Results:');
    console.log(`   ✅ Successfully sent: ${successCount}`);
    console.log(`   ⚠️  Already exists: ${pendingCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log('');

    if (successCount > 0 || pendingCount > 0) {
      console.log('🎯 NEXT STEPS:');
      console.log('==============');
      console.log('1. 📧 Check your email inbox(es) for AWS SES verification emails');
      console.log('2. 🔗 Click the verification link(s) in each email');
      console.log('3. ✅ Emails will be verified and ready to use');
      console.log('4. 🚀 Your marketplace can now send emails!');
      console.log('');
      console.log('📝 Email Types:');
      console.log(`   • Partner notifications: ${EMAIL_CONFIG.fromEmail}`);
      console.log(`   • Admin alerts: ${EMAIL_CONFIG.adminEmail}`);
      console.log(`   • User replies: ${EMAIL_CONFIG.replyToEmail}`);
      console.log('');
      console.log('⏰ Verification usually takes 1-2 minutes after clicking the link.');
      console.log('');
    }

    if (failedCount > 0) {
      console.log('⚠️  TROUBLESHOOTING:');
      console.log('===================');
      console.log('• Ensure AWS credentials have SES permissions');
      console.log('• Check if SES is available in your AWS region');
      console.log('• Verify email addresses are valid');
      console.log('• Try running the script again if there were network issues');
      console.log('');
    }

    console.log('✅ SES email setup completed!');
    
    return {
      success: successCount + pendingCount > 0,
      results: verificationResults,
      summary: { successCount, pendingCount, failedCount }
    };

  } catch (error) {
    console.error('❌ Error setting up SES emails:', error);
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('• Check AWS credentials: aws sts get-caller-identity');
    console.log('• Verify SES service is available in your region');
    console.log('• Ensure IAM permissions include SES actions');
    console.log('');
    throw error;
  }
}

// Function to check verification status
async function checkVerificationStatus() {
  try {
    console.log('🔍 Checking email verification status...');
    
    const uniqueEmails = [...new Set([
      EMAIL_CONFIG.fromEmail,
      EMAIL_CONFIG.adminEmail,
      EMAIL_CONFIG.replyToEmail
    ])];

    const statusResponse = await sesClient.send(new GetIdentityVerificationAttributesCommand({
      Identities: uniqueEmails
    }));

    const verificationAttributes = statusResponse.VerificationAttributes || {};
    
    console.log('📊 Current Status:');
    console.log('==================');
    
    let verifiedCount = 0;
    let pendingCount = 0;
    
    for (const email of uniqueEmails) {
      const status = verificationAttributes[email];
      if (status) {
        if (status.VerificationStatus === 'Success') {
          console.log(`✅ ${email} - VERIFIED`);
          verifiedCount++;
        } else {
          console.log(`⏳ ${email} - ${status.VerificationStatus}`);
          pendingCount++;
        }
      } else {
        console.log(`❌ ${email} - NOT FOUND (needs verification)`);
        pendingCount++;
      }
    }
    
    console.log('');
    console.log(`📈 Summary: ${verifiedCount} verified, ${pendingCount} pending`);
    
    if (verifiedCount === uniqueEmails.length) {
      console.log('🎉 All emails are verified! Your marketplace is ready to send emails.');
    } else {
      console.log('⚠️  Some emails still need verification. Check your email inbox.');
    }
    
    return { verifiedCount, pendingCount, total: uniqueEmails.length };
    
  } catch (error) {
    console.error('❌ Error checking verification status:', error);
    throw error;
  }
}

// Run based on command line argument
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check') {
    checkVerificationStatus()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    setupSESEmails()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { setupSESEmails, checkVerificationStatus, EMAIL_CONFIG };