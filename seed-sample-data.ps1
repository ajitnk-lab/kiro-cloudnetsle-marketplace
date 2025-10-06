# Seed Sample Data Script for Marketplace Platform
Write-Host "🌱 Seeding Sample Data for Marketplace Platform..." -ForegroundColor Green

# Set AWS region
$env:AWS_DEFAULT_REGION = "us-east-1"

# Get table names from CloudFormation stack
Write-Host "📋 Getting table names from CloudFormation..." -ForegroundColor Cyan

try {
    $solutionsTable = aws dynamodb list-tables --query "TableNames[?contains(@, 'solutions')]" --output text
    $usersTable = aws dynamodb list-tables --query "TableNames[?contains(@, 'users')]" --output text
    
    Write-Host "Solutions Table: $solutionsTable" -ForegroundColor Yellow
    Write-Host "Users Table: $usersTable" -ForegroundColor Yellow
    
    # Set environment variables for the script
    $env:SOLUTIONS_TABLE = $solutionsTable
    $env:USERS_TABLE = $usersTable
    
    # Run the seeding script
    Write-Host "🚀 Running data seeding script..." -ForegroundColor Cyan
    
    Set-Location packages/infrastructure
    node scripts/seed-sample-data.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Sample data seeding completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎯 You can now test the following:" -ForegroundColor Magenta
        Write-Host "  • Browse catalog: https://dddzq9ul1ygr3.cloudfront.net/catalog" -ForegroundColor White
        Write-Host "  • Search solutions by category, name, or tags" -ForegroundColor White
        Write-Host "  • View solution details (once detail page is implemented)" -ForegroundColor White
        Write-Host "  • Test filtering and sorting functionality" -ForegroundColor White
        Write-Host ""
        Write-Host "📊 Sample data includes:" -ForegroundColor Cyan
        Write-Host "  • 6 diverse software solutions" -ForegroundColor White
        Write-Host "  • Multiple categories (Business, Developer Tools, Analytics, etc.)" -ForegroundColor White
        Write-Host "  • Both subscription and one-time pricing models" -ForegroundColor White
        Write-Host "  • 3 sample partner companies" -ForegroundColor White
    } else {
        Write-Host "❌ Sample data seeding failed!" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error during seeding process: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location ../..
}