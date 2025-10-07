#!/usr/bin/env pwsh

Write-Host "🧹 COMPLETE MARKETPLACE CLEANUP" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "This will delete ALL marketplace resources and stacks" -ForegroundColor Yellow
Write-Host ""

# Step 1: Run VPC cleanup first
Write-Host "STEP 1: Cleaning VPC Resources" -ForegroundColor Magenta
Write-Host "==============================" -ForegroundColor Magenta
& ./force-cleanup-vpc-resources.ps1

Write-Host "`n`nSTEP 2: Deleting CloudFormation Stacks" -ForegroundColor Magenta
Write-Host "=======================================" -ForegroundColor Magenta

# List of all marketplace stacks
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

Write-Host "Initiating stack deletions..." -ForegroundColor Yellow
foreach ($stack in $stacksToDelete) {
    Write-Host "   Deleting: $stack" -ForegroundColor Cyan
    aws cloudformation delete-stack --stack-name $stack 2>$null
    Start-Sleep -Seconds 2
}

Write-Host "`n⏳ Waiting for stacks to delete (checking every 30 seconds)..." -ForegroundColor Yellow

$maxWaitMinutes = 20
$waitCount = 0
$maxWaitCount = $maxWaitMinutes * 2

while ($waitCount -lt $maxWaitCount) {
    Start-Sleep -Seconds 30
    $waitCount++
    
    $remainingStacks = @()
    foreach ($stack in $stacksToDelete) {
        $status = aws cloudformation describe-stacks --stack-name $stack --query "Stacks[0].StackStatus" --output text 2>$null
        if ($LASTEXITCODE -eq 0) {
            $remainingStacks += $stack
            Write-Host "   ⏳ $stack : $status" -ForegroundColor Gray
            
            # If stuck in DELETE_FAILED, try to force delete resources
            if ($status -eq "DELETE_FAILED") {
                Write-Host "      🔧 Stack stuck, attempting resource cleanup..." -ForegroundColor Yellow
                
                # Get failed resources
                $resources = aws cloudformation list-stack-resources --stack-name $stack --query "StackResourceSummaries[?ResourceStatus=='DELETE_FAILED'].{Type:ResourceType, Id:PhysicalResourceId}" --output json 2>$null | ConvertFrom-Json
                
                foreach ($resource in $resources) {
                    Write-Host "         Manually deleting: $($resource.Type) - $($resource.Id)" -ForegroundColor Cyan
                    
                    switch -Wildcard ($resource.Type) {
                        "*::EC2::SecurityGroup" {
                            aws ec2 delete-security-group --group-id $resource.Id 2>$null
                        }
                        "*::EC2::Subnet" {
                            aws ec2 delete-subnet --subnet-id $resource.Id 2>$null
                        }
                        "*::EC2::VPC" {
                            aws ec2 delete-vpc --vpc-id $resource.Id 2>$null
                        }
                        "*::DynamoDB::Table" {
                            aws dynamodb delete-table --table-name $resource.Id 2>$null
                        }
                        "*::S3::Bucket" {
                            aws s3 rm s3://$($resource.Id) --recursive 2>$null
                            aws s3 rb s3://$($resource.Id) --force 2>$null
                        }
                        "*::Cognito::UserPool" {
                            aws cognito-idp delete-user-pool --user-pool-id $resource.Id 2>$null
                        }
                    }
                }
                
                # Retry stack deletion
                Write-Host "         Retrying stack deletion..." -ForegroundColor Cyan
                aws cloudformation delete-stack --stack-name $stack 2>$null
            }
        }
    }
    
    if ($remainingStacks.Count -eq 0) {
        Write-Host "`n✅ All stacks deleted!" -ForegroundColor Green
        break
    }
    
    $stacksToDelete = $remainingStacks
    
    Write-Host "   Remaining: $($remainingStacks.Count) stacks" -ForegroundColor Gray
}

Write-Host "`n`nSTEP 3: Cleaning Orphaned Resources" -ForegroundColor Magenta
Write-Host "====================================" -ForegroundColor Magenta

# Clean DynamoDB tables
Write-Host "`n🗑️  DynamoDB Tables..." -ForegroundColor Yellow
$tables = aws dynamodb list-tables --query "TableNames[?starts_with(@, 'marketplace-')]" --output json | ConvertFrom-Json
if ($tables -and $tables.Count -gt 0) {
    foreach ($table in $tables) {
        Write-Host "   Deleting: $table" -ForegroundColor Cyan
        aws dynamodb delete-table --table-name $table 2>$null
    }
    Write-Host "   ✅ Deleted $($tables.Count) tables" -ForegroundColor Green
} else {
    Write-Host "   ✅ No orphaned tables" -ForegroundColor Green
}

# Clean S3 buckets
Write-Host "`n🗑️  S3 Buckets..." -ForegroundColor Yellow
$buckets = aws s3api list-buckets --query "Buckets[?starts_with(Name, 'marketplace-')].Name" --output json | ConvertFrom-Json
if ($buckets -and $buckets.Count -gt 0) {
    foreach ($bucket in $buckets) {
        Write-Host "   Emptying and deleting: $bucket" -ForegroundColor Cyan
        aws s3 rm s3://$bucket --recursive 2>$null
        aws s3 rb s3://$bucket --force 2>$null
    }
    Write-Host "   ✅ Deleted $($buckets.Count) buckets" -ForegroundColor Green
} else {
    Write-Host "   ✅ No orphaned buckets" -ForegroundColor Green
}

# Clean Cognito User Pools
Write-Host "`n🗑️  Cognito User Pools..." -ForegroundColor Yellow
$userPools = aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?starts_with(Name, 'marketplace-')].Id" --output json | ConvertFrom-Json
if ($userPools -and $userPools.Count -gt 0) {
    foreach ($poolId in $userPools) {
        Write-Host "   Deleting: $poolId" -ForegroundColor Cyan
        aws cognito-idp delete-user-pool --user-pool-id $poolId 2>$null
    }
    Write-Host "   ✅ Deleted $($userPools.Count) user pools" -ForegroundColor Green
} else {
    Write-Host "   ✅ No orphaned user pools" -ForegroundColor Green
}

# Clean Lambda functions
Write-Host "`n🗑️  Lambda Functions..." -ForegroundColor Yellow
$functions = aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'MP-') || contains(FunctionName, 'Marketplace')].FunctionName" --output json | ConvertFrom-Json
if ($functions -and $functions.Count -gt 0) {
    foreach ($func in $functions) {
        Write-Host "   Deleting: $func" -ForegroundColor Cyan
        aws lambda delete-function --function-name $func 2>$null
    }
    Write-Host "   ✅ Deleted $($functions.Count) functions" -ForegroundColor Green
} else {
    Write-Host "   ✅ No orphaned functions" -ForegroundColor Green
}

# Clean API Gateways
Write-Host "`n🗑️  API Gateways..." -ForegroundColor Yellow
$apis = aws apigateway get-rest-apis --query "items[?contains(name, 'Marketplace')].id" --output json | ConvertFrom-Json
if ($apis -and $apis.Count -gt 0) {
    foreach ($api in $apis) {
        Write-Host "   Deleting: $api" -ForegroundColor Cyan
        aws apigateway delete-rest-api --rest-api-id $api 2>$null
    }
    Write-Host "   ✅ Deleted $($apis.Count) APIs" -ForegroundColor Green
} else {
    Write-Host "   ✅ No orphaned APIs" -ForegroundColor Green
}

Write-Host "`n`n" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green

Write-Host "`n📊 Final Status:" -ForegroundColor Cyan
aws cloudformation list-stacks --query "StackSummaries[?(starts_with(StackName, 'MP-') || starts_with(StackName, 'Marketplace')) && StackStatus!='DELETE_COMPLETE'].{Name:StackName, Status:StackStatus}" --output table

Write-Host "`n🎯 System is clean and ready for fresh deployment!" -ForegroundColor Green
Write-Host "   Next step: npm run deploy" -ForegroundColor White
