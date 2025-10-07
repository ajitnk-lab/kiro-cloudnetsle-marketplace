#!/usr/bin/env pwsh

# AWS SES Email Verification Setup Script
# Automatically sets up and verifies email addresses for the marketplace

Write-Host "📧 AWS SES Email Verification Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "packages/infrastructure")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Email configuration
$fromEmail = "ajitnk2006+noreply@gmail.com"
$adminEmail = "ajitnk2006+admin@gmail.com" 
$replyToEmail = "ajitnk2006+support@gmail.com"

Write-Host "📋 Email Configuration:" -ForegroundColor Yellow
Write-Host "   From Email: $fromEmail" -ForegroundColor White
Write-Host "   Admin Email: $adminEmail" -ForegroundColor White
Write-Host "   Reply-To Email: $replyToEmail" -ForegroundColor White
Write-Host ""

# Check AWS credentials
Write-Host "🔐 Checking AWS credentials..." -ForegroundColor Yellow
try {
    $awsIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "✅ AWS Account: $($awsIdentity.Account)" -ForegroundColor Green
    Write-Host "✅ AWS User: $($awsIdentity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: AWS credentials not configured" -ForegroundColor Red
    Write-Host "   Please run: aws configure" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Set environment variables
$env:FROM_EMAIL = $fromEmail
$env:ADMIN_EMAIL = $adminEmail
$env:REPLY_TO_EMAIL = $replyToEmail

# Run the SES setup script
Write-Host "🚀 Setting up SES email verification..." -ForegroundColor Yellow
Write-Host ""

try {
    Set-Location "packages/infrastructure"
    
    # Run the setup script
    node scripts/setup-ses-email.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 SES EMAIL SETUP COMPLETED!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📧 IMPORTANT - CHECK YOUR EMAIL:" -ForegroundColor Cyan
        Write-Host "=================================" -ForegroundColor Cyan
        Write-Host "1. Check the following email inboxes:" -ForegroundColor White
        Write-Host "   • $fromEmail" -ForegroundColor Yellow
        Write-Host "   • $adminEmail" -ForegroundColor Yellow  
        Write-Host "   • $replyToEmail" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "2. Look for emails from 'Amazon Web Services'" -ForegroundColor White
        Write-Host "   Subject: 'Amazon SES Address Verification Request'" -ForegroundColor White
        Write-Host ""
        Write-Host "3. Click the verification link in each email" -ForegroundColor White
        Write-Host ""
        Write-Host "4. You should see: 'Congratulations! You have successfully verified...'" -ForegroundColor White
        Write-Host ""
        Write-Host "⏰ This usually takes 1-2 minutes after clicking the links." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🔍 TO CHECK STATUS:" -ForegroundColor Cyan
        Write-Host "   Run: ./check-ses-status.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "🚀 AFTER VERIFICATION:" -ForegroundColor Cyan
        Write-Host "   Your marketplace will be able to send:" -ForegroundColor White
        Write-Host "   • Partner application notifications" -ForegroundColor White
        Write-Host "   • Payment confirmations" -ForegroundColor White
        Write-Host "   • Admin alerts" -ForegroundColor White
        Write-Host "   • User verification emails" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ SES setup failed" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location "../.."
}

Write-Host "✅ Setup script completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Check your email and click verification links" -ForegroundColor White
Write-Host "2. Run: ./check-ses-status.ps1 to verify completion" -ForegroundColor White
Write-Host "3. Test the marketplace email functionality" -ForegroundColor White