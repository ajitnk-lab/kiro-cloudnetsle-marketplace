#!/usr/bin/env pwsh

# Check AWS SES Email Verification Status
# Verifies if all marketplace emails are properly verified

Write-Host "🔍 AWS SES Email Verification Status" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "packages/infrastructure")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Email configuration
$fromEmail = "ajitnk2006+noreply@gmail.com"
$adminEmail = "ajitnk2006+admin@gmail.com"
$replyToEmail = "ajitnk2006+support@gmail.com"

Write-Host "📧 Checking verification status for:" -ForegroundColor Yellow
Write-Host "   • $fromEmail" -ForegroundColor White
Write-Host "   • $adminEmail" -ForegroundColor White
Write-Host "   • $replyToEmail" -ForegroundColor White
Write-Host ""

# Set environment variables
$env:FROM_EMAIL = $fromEmail
$env:ADMIN_EMAIL = $adminEmail
$env:REPLY_TO_EMAIL = $replyToEmail

try {
    Set-Location "packages/infrastructure"
    
    # Run the status check
    node scripts/setup-ses-email.js check
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "📋 STATUS CHECK COMPLETED!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔧 TROUBLESHOOTING:" -ForegroundColor Cyan
        Write-Host "===================" -ForegroundColor Cyan
        Write-Host "If emails are not verified:" -ForegroundColor White
        Write-Host "1. Check your spam/junk folders" -ForegroundColor White
        Write-Host "2. Re-run: ./setup-ses-emails.ps1" -ForegroundColor White
        Write-Host "3. Wait a few minutes and check again" -ForegroundColor White
        Write-Host "4. Ensure you clicked ALL verification links" -ForegroundColor White
        Write-Host ""
        Write-Host "🎯 WHEN ALL VERIFIED:" -ForegroundColor Cyan
        Write-Host "• Your marketplace can send emails" -ForegroundColor White
        Write-Host "• Partner notifications will work" -ForegroundColor White
        Write-Host "• Payment confirmations will be sent" -ForegroundColor White
        Write-Host "• Admin alerts will be delivered" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "❌ Status check failed" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location "../.."
}

Write-Host "✅ Status check completed!" -ForegroundColor Green