#!/usr/bin/env pwsh

Write-Host "🤖 AUTOMATED BLOCKER RESOLUTION" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "This script will automatically find and fix ALL blockers" -ForegroundColor Yellow
Write-Host ""

function Fix-AllRDSInstances {
    Write-Host "Step 1: Finding and deleting ALL RDS instances..." -ForegroundColor Magenta
    
    $allRDS = aws rds describe-db-instances --query "DBInstances[].{ID:DBInstanceIdentifier, Status:DBInstanceStatus, Protected:DeletionProtection}" --output json | ConvertFrom-Json
    
    if ($allRDS -and $allRDS.Count -gt 0) {
        Write-Host "Found $($allRDS.Count) RDS instance(s)" -ForegroundColor Yellow
        
        foreach ($rds in $allRDS) {
            Write-Host "  Processing: $($rds.ID) [$($rds.Status)]" -ForegroundColor Cyan
            
            if ($rds.Protected -eq $true) {
                Write-Host "    Disabling deletion protection..." -ForegroundColor Gray
                aws rds modify-db-instance --db-instance-identifier $rds.ID --no-deletion-protection --apply-immediately 2>$null | Out-Null
                Start-Sleep -Seconds 5
            }
            
            if ($rds.Status -ne "deleting") {
                Write-Host "    Deleting RDS instance..." -ForegroundColor Gray
                aws rds delete-db-instance --db-instance-identifier $rds.ID --skip-final-snapshot --delete-automated-backups 2>$null | Out-Null
                Write-Host "    ✓ Delete initiated" -ForegroundColor Green
            } else {
                Write-Host "    Already deleting" -ForegroundColor Gray
            }
        }
        
        Write-Host "  Waiting 60 seconds for RDS deletions to progress..." -ForegroundColor Gray
        Start-Sleep -Seconds 60
    } else {
        Write-Host "  ✓ No RDS instances found" -ForegroundColor Green
    }
}

function Fix-AllNetworkInterfaces {
    Write-Host "`nStep 2: Cleaning up Network Interfaces..." -ForegroundColor Magenta
    
    $enis = aws ec2 describe-network-interfaces --filters "Name=status,Values=available" --query "NetworkInterfaces[?contains(Description, 'RDS')].NetworkInterfaceId" --output json | ConvertFrom-Json
    
    if ($enis -and $enis.Count -gt 0) {
        Write-Host "Found $($enis.Count) orphaned ENI(s)" -ForegroundColor Yellow
        foreach ($eni in $enis) {
            Write-Host "  Deleting ENI: $eni" -ForegroundColor Cyan
            aws ec2 delete-network-interface --network-interface-id $eni 2>$null
        }
    } else {
        Write-Host "  ✓ No orphaned ENIs" -ForegroundColor Green
    }
}

function Fix-AllSecurityGroups {
    Write-Host "`nStep 3: Cleaning up Security Groups..." -ForegroundColor Magenta
    
    # Get all marketplace VPCs
    $vpcs = aws ec2 describe-vpcs --filters "Name=tag:Project,Values=MarketplacePlatform" --query "Vpcs[].VpcId" --output json | ConvertFrom-Json
    
    if (-not $vpcs) {
        $vpcs = @()
    }
    
    foreach ($vpc in $vpcs) {
        Write-Host "  Processing VPC: $vpc" -ForegroundColor Cyan
        
        $sgs = aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpc" --query "SecurityGroups[?GroupName!='default'].GroupId" --output json | ConvertFrom-Json
        
        if ($sgs -and $sgs.Count -gt 0) {
            # First remove all rules
            foreach ($sg in $sgs) {
                Write-Host "    Removing rules from SG: $sg" -ForegroundColor Gray
                aws ec2 revoke-security-group-ingress --group-id $sg --ip-permissions "$(aws ec2 describe-security-groups --group-ids $sg --query 'SecurityGroups[0].IpPermissions' --output json 2>$null)" 2>$null | Out-Null
                aws ec2 revoke-security-group-egress --group-id $sg --ip-permissions "$(aws ec2 describe-security-groups --group-ids $sg --query 'SecurityGroups[0].IpPermissionsEgress' --output json 2>$null)" 2>$null | Out-Null
            }
            
            Start-Sleep -Seconds 5
            
            # Then delete
            foreach ($sg in $sgs) {
                Write-Host "    Deleting SG: $sg" -ForegroundColor Gray
                aws ec2 delete-security-group --group-id $sg 2>$null
            }
        }
    }
    
    Write-Host "  ✓ Security groups cleaned" -ForegroundColor Green
}

function Retry-StackDeletions {
    Write-Host "`nStep 4: Retrying stack deletions..." -ForegroundColor Magenta
    
    $stacks = aws cloudformation list-stacks --query "StackSummaries[?(starts_with(StackName, 'MP-') || starts_with(StackName, 'Marketplace')) && (StackStatus=='DELETE_FAILED' || StackStatus=='DELETE_IN_PROGRESS')].StackName" --output json | ConvertFrom-Json
    
    if ($stacks -and $stacks.Count -gt 0) {
        Write-Host "Found $($stacks.Count) stack(s) to retry" -ForegroundColor Yellow
        foreach ($stack in $stacks) {
            Write-Host "  Retrying: $stack" -ForegroundColor Cyan
            aws cloudformation delete-stack --stack-name $stack 2>$null
        }
    } else {
        Write-Host "  ✓ No stacks need retry" -ForegroundColor Green
    }
}

function Monitor-Progress {
    Write-Host "`nStep 5: Monitoring deletion progress..." -ForegroundColor Magenta
    
    $maxWait = 20  # 10 minutes
    $count = 0
    
    while ($count -lt $maxWait) {
        $count++
        
        $remainingStacks = aws cloudformation list-stacks --query "StackSummaries[?(starts_with(StackName, 'MP-') || starts_with(StackName, 'Marketplace')) && StackStatus!='DELETE_COMPLETE'].{Name:StackName, Status:StackStatus}" --output json | ConvertFrom-Json
        
        $remainingRDS = aws rds describe-db-instances --query "DBInstances[].DBInstanceIdentifier" --output json 2>$null | ConvertFrom-Json
        
        if ((-not $remainingStacks -or $remainingStacks.Count -eq 0) -and (-not $remainingRDS -or $remainingRDS.Count -eq 0)) {
            Write-Host "`n✅ ALL RESOURCES DELETED!" -ForegroundColor Green
            return $true
        }
        
        Write-Host "  Check $count/20: $($remainingStacks.Count) stacks, $($remainingRDS.Count) RDS remaining..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    }
    
    Write-Host "`n⚠️  Still have resources after 10 minutes" -ForegroundColor Yellow
    return $false
}

# Execute all steps
Fix-AllRDSInstances
Fix-AllNetworkInterfaces
Fix-AllSecurityGroups
Retry-StackDeletions
$success = Monitor-Progress

Write-Host "`n================================" -ForegroundColor Cyan
if ($success) {
    Write-Host "✅ CLEANUP COMPLETE!" -ForegroundColor Green
} else {
    Write-Host "⚠️  CLEANUP INCOMPLETE - Manual intervention may be needed" -ForegroundColor Yellow
}
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nFinal Status:" -ForegroundColor Cyan
aws cloudformation list-stacks --query "StackSummaries[?(starts_with(StackName, 'MP-') || starts_with(StackName, 'Marketplace')) && StackStatus!='DELETE_COMPLETE'].{Name:StackName, Status:StackStatus}" --output table
