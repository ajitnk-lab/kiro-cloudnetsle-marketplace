#!/usr/bin/env pwsh

Write-Host "🔍 MONITORING CLEANUP PROGRESS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$rdsToMonitor = @(
    "mp-1759826337227-datastackmarketplacedatabase93032-tatuss7adpbv"
)

$stacksToMonitor = @(
    "MP-1759826337227",
    "MarketplaceInfrastructureStack"
)

$maxChecks = 60  # 30 minutes (30 second intervals)
$checkCount = 0

while ($checkCount -lt $maxChecks) {
    $checkCount++
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$timestamp] Check #$checkCount" -ForegroundColor Gray
    Write-Host "─────────────────────────────" -ForegroundColor Gray
    
    # Check RDS instances
    $rdsStillExists = $false
    foreach ($rds in $rdsToMonitor) {
        $status = aws rds describe-db-instances --db-instance-identifier $rds --query "DBInstances[0].DBInstanceStatus" --output text 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  RDS: $rds = $status" -ForegroundColor Yellow
            $rdsStillExists = $true
        } else {
            Write-Host "  RDS: $rds = DELETED ✓" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    
    # Check CloudFormation stacks
    $stacksStillDeleting = 0
    foreach ($stack in $stacksToMonitor) {
        $status = aws cloudformation describe-stacks --stack-name $stack --query "Stacks[0].StackStatus" --output text 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Stack: $stack = $status" -ForegroundColor Yellow
            $stacksStillDeleting++
        } else {
            Write-Host "  Stack: $stack = DELETED ✓" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    
    # Check if we're done
    if (-not $rdsStillExists -and $stacksStillDeleting -eq 0) {
        Write-Host "✅ ALL RESOURCES DELETED!" -ForegroundColor Green
        break
    }
    
    # Wait before next check
    if ($checkCount -lt $maxChecks) {
        Write-Host "  Waiting 30 seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
        Write-Host ""
    }
}

if ($checkCount -ge $maxChecks) {
    Write-Host "⚠️  Timeout reached after 30 minutes" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Final Status Check:" -ForegroundColor Cyan
aws cloudformation list-stacks --query "StackSummaries[?(starts_with(StackName, 'MP-') || starts_with(StackName, 'Marketplace')) && StackStatus!='DELETE_COMPLETE'].{Name:StackName, Status:StackStatus}" --output table
