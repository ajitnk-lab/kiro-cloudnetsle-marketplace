#!/usr/bin/env node

// Manual GST environment update script
// This script updates the environment variables for GST functionality
// since CloudFormation validation is preventing proper deployment

const fs = require('fs');
const path = require('path');

// GST-related resources that exist but aren't in CloudFormation outputs
const gstResources = {
  CompanySettingsTableName: 'marketplace-company-settings-1764183053',
  InvoiceBucketName: 'marketplace-invoices-1764183053'
};

console.log('🔧 Updating GST environment variables...');

// Update lambda-env.json
const lambdaEnvPath = path.join(__dirname, 'lambda-env.json');
if (fs.existsSync(lambdaEnvPath)) {
  const lambdaEnv = JSON.parse(fs.readFileSync(lambdaEnvPath, 'utf8'));
  
  // Add GST environment variables
  lambdaEnv.COMPANY_SETTINGS_TABLE = gstResources.CompanySettingsTableName;
  lambdaEnv.INVOICE_BUCKET = gstResources.InvoiceBucketName;
  
  fs.writeFileSync(lambdaEnvPath, JSON.stringify(lambdaEnv, null, 2));
  console.log('✅ Updated lambda-env.json with GST variables');
} else {
  console.log('⚠️  lambda-env.json not found');
}

// Update frontend environment
const frontendEnvPath = path.join(__dirname, 'packages/frontend/.env.local');
if (fs.existsSync(frontendEnvPath)) {
  let envContent = fs.readFileSync(frontendEnvPath, 'utf8');
  
  // Add GST environment variables if not present
  if (!envContent.includes('REACT_APP_COMPANY_SETTINGS_TABLE')) {
    envContent += `\nREACT_APP_COMPANY_SETTINGS_TABLE=${gstResources.CompanySettingsTableName}`;
  }
  if (!envContent.includes('REACT_APP_INVOICE_BUCKET')) {
    envContent += `\nREACT_APP_INVOICE_BUCKET=${gstResources.InvoiceBucketName}`;
  }
  
  fs.writeFileSync(frontendEnvPath, envContent);
  console.log('✅ Updated frontend .env.local with GST variables');
} else {
  console.log('⚠️  Frontend .env.local not found');
}

console.log('\n📋 GST Resources Summary:');
console.log(`Company Settings Table: ${gstResources.CompanySettingsTableName}`);
console.log(`Invoice Bucket: ${gstResources.InvoiceBucketName}`);
console.log('\n✨ GST environment update complete!');
console.log('\nNote: These resources exist but are not in CloudFormation outputs due to validation issues.');
console.log('The GST functionality should work with these manual environment variables.');
