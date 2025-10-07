#!/usr/bin/env pwsh

Write-Host "🧹 COMPLETE CLEANUP - Removing ALL Marketplace Stacks and Resources" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# List of all marketplace stacks to delete
$stacksToDelete = @(
    "MP-1759828592217",
    "MP-1759827819585",
    "MP-1759827606317",
    "MP-1759826708507",
    "MP-1759826337227",
    "MP-1759826204167",
    "MarketplaceStack-2025-10-07T08-35-32",
    "MarketplaceStack",
    "MarketplaceInfrastructureStack"
)

Write-Host "`n📋 Stacks to delete:" -ForegroundColor Yellow
$stacksToDelete | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }

# Function to force delete a stack
function Force-DeleteStack {
    param($stackName)
    
    Write-Host "`n🗑️  Attempting to delete stack: $stackName" -ForegroundColor Yellow
    
    try {
        # First, try to get stack resources
        $resources = aws cloudformation list-stack-resources --stack-name $stackName --query "StackResourceSummaries[?ResourceStatus=='DELETE_FAILED' || ResourceStatus=='UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS'].{Type:ResourceType, Id:PhysicalResourceId, Status:ResourceStatus}" --output json 2>$null | ConvertFrom-Json
        
        if ($resources) {
            Write-Host "   Found problematic resources:" -ForegroundColor Yellow
            foreach ($resource in $resources) {
                Write-Host "      - $($resource.Type): $($resource.Id) [$($resource.Status)]" -ForegroundColor Gray
                
                # Try to manually delete specific resource types
                switch -Wildcard ($resource.Type) {
                    "*::DynamoDB::Table" {
                        Write-Host "      Deleting DynamoDB table: $($resource.Id)" -ForegroundColor Cyan
                        aws dynamodb delete-table --table-name $resource.Id 2>$null
                    }
                    "*::S3::Bucket" {
                        Write-Host "      Emptying and deleting S3 bucket: $($resource.Id)" -ForegroundColor Cyan
                        aws s3 rm s3://$($resource.Id) --recursive 2>$null
                        aws s3 rb s3://$($resource.Id) --force 2>$null
                    }
                    "*::Cognito::UserPool" {
                        Write-Host "      Deleting Cognito User Pool: $($resource.Id)" -ForegroundColor Cyan
                        aws cognito-idp delete-user-pool --user-pool-id $resource.Id 2>$null
                    }
                    "*::SES::EmailIdentity" {
                        Write-Host "      Deleting SES Email Identity: $($resource.Id)" -ForegroundColor Cyan
                        aws sesv2 delete-email-identity --email-identity $resource.Id 2>$null
                    }
                }
            }
        }
        
        # Now try to delete the stack
        Write-Host "   Deleting stack..." -ForegroundColor Cyan
        aws cloudformation delete-stack --stack-name $stackName 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Delete initiated for $stackName" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ⚠️  Could not initiate delete for $stackName" -ForegroundColor Yellow
            return $false
        }
        
    } catch {
        Write-Host "   ❌ Error processing $stackName : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Delete all stacks
$deletedStacks = @()
foreach ($stack in $stacksToDelete) {
    if (Force-DeleteStack -stackName $stack) {
        $deletedStacks += $stack
    }
    Start-Sleep -Seconds 2
}

if ($deletedStacks.Count -gt 0) {
    Write-Host "`n⏳ Waiting for stack deletions to complete..." -ForegroundColor Yellow
    Write-Host "   This may take several minutes. Checking every 30 seconds..." -ForegroundColor Gray
    
    $maxWaitMinutes = 15
    $waitCount = 0
    $maxWaitCount = $maxWaitMinutes * 2  # 30 second intervals
    
    while ($waitCount -lt $maxWaitCount) {
        Start-Sleep -Seconds 30
        $waitCount++
        
        $remainingStacks = @()
        foreach ($stack in $deletedStacks) {
            $status = aws cloudformation describe-stacks --stack-name $stack --query "Stacks[0].StackStatus" --output text 2>$null
            if ($LASTEXITCODE -eq 0 -and $status -ne "DELETE_COMPLETE") {
                $remainingStacks += $stack
                Write-Host "   ⏳ $stack : $status" -ForegroundColor Gray
            }
        }
        
        if ($remainingStacks.Count -eq 0) {
            Write-Host "`n✅ All stacks deleted successfully!" -ForegroundColor Green
            break
        }
        
        $deletedStacks = $remainingStacks
        
        if ($waitCount -ge $maxWaitCount) {
            Write-Host "`n⚠️  Timeout waiting for deletions. Some stacks may still be deleting." -ForegroundColor Yellow
            Write-Host "   Remaining stacks:" -ForegroundColor Yellow
            $remainingStacks | ForEach-Object { Write-Host "      - $_" -ForegroundColor White }
        }
    }
}

# Clean up orphaned DynamoDB tables
Write-Host "`n🗑️  Checking for orphaned DynamoDB tables..." -ForegroundColor Yellow
$tables = aws dynamodb list-tables --query "TableNames[?starts_with(@, 'marketplace-')]" --output json | ConvertFrom-Json

if ($tables -and $tables.Count -gt 0) {
    Write-Host "   Found $($tables.Count) marketplace tables:" -ForegroundColor Yellow
    foreach ($table in $tables) {
        Write-Host "      Deleting: $table" -ForegroundColor Cyan
        aws dynamodb delete-table --table-name $table 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "      ✅ Deleted $table" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   ✅ No orphaned DynamoDB tables found" -ForegroundColor Green
}

# Clean up orphaned S3 buckets
Write-Host "`n🗑️  Checking for orphaned S3 buckets..." -ForegroundColor Yellow
$buckets = aws s3api list-buckets --query "Buckets[?starts_with(Name, 'marketplace-assets-')].Name" --output json | ConvertFrom-Json

if ($buckets -and $buckets.Count -gt 0) {
    Write-Host "   Found $($buckets.Count) marketplace buckets:" -ForegroundColor Yellow
    foreach ($bucket in $buckets) {
        Write-Host "      Emptying and deleting: $bucket" -ForegroundColor Cyan
        aws s3 rm s3://$bucket --recursive 2>$null
        aws s3 rb s3://$bucket --force 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "      ✅ Deleted $bucket" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   ✅ No orphaned S3 buckets found" -ForegroundColor Green
}

# Clean up orphaned Cognito User Pools
Write-Host "`n🗑️  Checking for orphaned Cognito User Pools..." -ForegroundColor Yellow
$userPools = aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?starts_with(Name, 'marketplace-')].Id" --output json | ConvertFrom-Json

if ($userPools -and $userPools.Count -gt 0) {
    Write-Host "   Found $($userPools.Count) marketplace user pools:" -ForegroundColor Yellow
    foreach ($poolId in $userPools) {
        Write-Host "      Deleting: $poolId" -ForegroundColor Cyan
        aws cognito-idp delete-user-pool --user-pool-id $poolId 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "      ✅ Deleted $poolId" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   ✅ No orphaned Cognito User Pools found" -ForegroundColor Green
}

Write-Host "`n✅ CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "`n📊 Final Status Check:" -ForegroundColor Cyan
aws cloudformation list-stacks --query "StackSummaries[?starts_with(StackName, 'MP-') || starts_with(StackName, 'Marketplace')].{Name:StackName, Status:StackStatus}" --output table

Write-Host "`n🎯 Ready for clean deployment!" -ForegroundColor Green
Write-Host "   Run: npm run deploy" -ForegroundColor White
