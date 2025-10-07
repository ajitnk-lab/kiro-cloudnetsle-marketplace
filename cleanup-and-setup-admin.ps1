#!/usr/bin/env pwsh

# Cleanup Old Admin and Setup New Admin Script
# This script removes old admin configurations and sets up the new admin

Write-Host "🧹 Cleanup and Setup New Admin User" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "packages/infrastructure")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Get AWS outputs for environment variables
Write-Host "📋 Getting AWS deployment information..." -ForegroundColor Yellow

try {
    # Get CDK outputs
    $cdkOutputs = cdk output --app "packages/infrastructure/bin/marketplace-app.js" --json 2>$null | ConvertFrom-Json
    
    if (-not $cdkOutputs) {
        Write-Host "❌ Error: Could not get CDK outputs. Make sure the infrastructure is deployed." -ForegroundColor Red
        Write-Host "   Run: npm run deploy" -ForegroundColor Yellow
        exit 1
    }
    
    # Extract required values
    $userPoolId = $cdkOutputs.MarketplaceInfrastructureStack.UserPoolId
    $accountId = (aws sts get-caller-identity --query Account --output text)
    $userTableName = "marketplace-users-$accountId"
    
    if (-not $userPoolId) {
        Write-Host "❌ Error: Could not find User Pool ID in CDK outputs" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Found User Pool ID: $userPoolId" -ForegroundColor Green
    Write-Host "✅ Using User Table: $userTableName" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error getting AWS information: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 1: Remove old admin user from Cognito (if exists)
Write-Host "🗑️  Removing old admin user from Cognito..." -ForegroundColor Yellow

try {
    aws cognito-idp admin-delete-user --user-pool-id $userPoolId --username "admin@marketplace.com" 2>$null
    Write-Host "✅ Old admin user removed from Cognito" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Old admin user not found in Cognito (this is fine)" -ForegroundColor Yellow
}

# Step 2: Remove old admin user from DynamoDB (if exists)
Write-Host "🗑️  Removing old admin user from DynamoDB..." -ForegroundColor Yellow

try {
    # First, find the old admin user by email
    $scanResult = aws dynamodb scan --table-name $userTableName --filter-expression "email = :email" --expression-attribute-values '{":email":{"S":"admin@marketplace.com"}}' --output json 2>$null | ConvertFrom-Json
    
    if ($scanResult.Items -and $scanResult.Items.Count -gt 0) {
        $oldUserId = $scanResult.Items[0].userId.S
        aws dynamodb delete-item --table-name $userTableName --key "{`"userId`":{`"S`":`"$oldUserId`"}}" 2>$null
        Write-Host "✅ Old admin user removed from DynamoDB" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Old admin user not found in DynamoDB (this is fine)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not remove old admin user from DynamoDB (this is fine)" -ForegroundColor Yellow
}

# Step 3: Create new admin user
Write-Host "🚀 Creating new admin user..." -ForegroundColor Yellow

try {
    $env:USER_POOL_ID = $userPoolId
    $env:USER_TABLE_NAME = $userTableName
    
    # Run the admin creation script
    Set-Location "packages/infrastructure"
    node scripts/create-admin-user.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 SUCCESS! New admin user created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 NEW ADMIN LOGIN DETAILS:" -ForegroundColor Cyan
        Write-Host "   Email: ajitnk2006+admin@gmail.com" -ForegroundColor White
        Write-Host "   Password: Admin123!@#" -ForegroundColor White
        Write-Host "   Role: admin" -ForegroundColor White
        Write-Host ""
        Write-Host "🔗 ADMIN DASHBOARD:" -ForegroundColor Cyan
        Write-Host "   URL: https://dddzq9ul1ygr3.cloudfront.net/admin/dashboard" -ForegroundColor White
        Write-Host ""
        Write-Host "📧 EMAIL NOTIFICATIONS:" -ForegroundColor Cyan
        Write-Host "   Admin notifications will be sent to: ajitnk2006+admin@gmail.com" -ForegroundColor White
        Write-Host "   System emails will be sent from: ajitnk2006+noreply@gmail.com" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  IMPORTANT NOTES:" -ForegroundColor Yellow
        Write-Host "   1. Change the default password after first login" -ForegroundColor White
        Write-Host "   2. Partner applications will trigger email notifications" -ForegroundColor White
        Write-Host "   3. Solution submissions will appear in admin dashboard" -ForegroundColor White
        Write-Host "   4. All old admin configurations have been removed" -ForegroundColor White
        Write-Host ""
        Write-Host "🧪 TESTING WORKFLOW:" -ForegroundColor Cyan
        Write-Host "   1. Register as partner → Submit application" -ForegroundColor White
        Write-Host "   2. Check ajitnk2006+admin@gmail.com for notification email" -ForegroundColor White
        Write-Host "   3. Login as admin → Approve partner application" -ForegroundColor White
        Write-Host "   4. Partner creates solution → Admin moderates" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Failed to create new admin user" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location "../.."
}

Write-Host "✅ Cleanup and admin setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 SUMMARY OF CHANGES:" -ForegroundColor Cyan
Write-Host "   ❌ Removed: admin@marketplace.com" -ForegroundColor Red
Write-Host "   ✅ Added: ajitnk2006+admin@gmail.com" -ForegroundColor Green
Write-Host "   📧 Admin notifications: ajitnk2006+admin@gmail.com" -ForegroundColor White
Write-Host "   📧 System emails: ajitnk2006+noreply@gmail.com" -ForegroundColor White