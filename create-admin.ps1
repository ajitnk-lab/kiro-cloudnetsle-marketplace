#!/usr/bin/env pwsh

# Create Admin User Script for Marketplace Platform
# This script creates an admin user for accessing the admin dashboard

Write-Host "🔧 Marketplace Admin User Creation" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

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
    $userTableName = "marketplace-users-$((aws sts get-caller-identity --query Account --output text))"
    
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

# Set environment variables and run the script
Write-Host "🚀 Creating admin user..." -ForegroundColor Yellow

try {
    $env:USER_POOL_ID = $userPoolId
    $env:USER_TABLE_NAME = $userTableName
    
    # Run the admin creation script
    Set-Location "packages/infrastructure"
    node scripts/create-admin-user.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 SUCCESS! Admin user created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 ADMIN LOGIN DETAILS:" -ForegroundColor Cyan
        Write-Host "   Email: ajitnk2006+admin@gmail.com" -ForegroundColor White
        Write-Host "   Password: Admin123!@#" -ForegroundColor White
        Write-Host "   Role: admin" -ForegroundColor White
        Write-Host ""
        Write-Host "🔗 ADMIN DASHBOARD:" -ForegroundColor Cyan
        Write-Host "   URL: https://dddzq9ul1ygr3.cloudfront.net/admin/dashboard" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  SECURITY REMINDER:" -ForegroundColor Yellow
        Write-Host "   1. Login with the above credentials" -ForegroundColor White
        Write-Host "   2. Change the default password immediately" -ForegroundColor White
        Write-Host "   3. The admin can approve partner applications" -ForegroundColor White
        Write-Host "   4. The admin can moderate solutions" -ForegroundColor White
        Write-Host ""
        Write-Host "🧪 TESTING WORKFLOW:" -ForegroundColor Cyan
        Write-Host "   1. Register as partner → Submit application" -ForegroundColor White
        Write-Host "   2. Login as admin → Approve partner application" -ForegroundColor White
        Write-Host "   3. Partner creates solution → Admin moderates" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Failed to create admin user" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location "../.."
}

Write-Host "✅ Admin setup complete!" -ForegroundColor Green