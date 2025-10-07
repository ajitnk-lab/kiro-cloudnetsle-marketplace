#!/usr/bin/env pwsh

Write-Host "🔧 VPC Resource Cleanup - Handling DELETE_FAILED Resources" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# List of problematic security groups and subnets
$securityGroups = @(
    "sg-012608e84aa533d04",
    "sg-0e739a50ba2f6c764",
    "sg-04a6b064d07c7233a"
)

$subnets = @(
    "subnet-0839d01931fdd136e",
    "subnet-020b71bf8f92eb358",
    "subnet-019ace33157f6acdf"
)

# Function to find and delete ENIs attached to security group
function Remove-SecurityGroupDependencies {
    param($sgId)
    
    Write-Host "`n🔍 Checking dependencies for Security Group: $sgId" -ForegroundColor Yellow
    
    # Find network interfaces using this security group
    $enis = aws ec2 describe-network-interfaces --filters "Name=group-id,Values=$sgId" --query "NetworkInterfaces[].NetworkInterfaceId" --output json | ConvertFrom-Json
    
    if ($enis -and $enis.Count -gt 0) {
        Write-Host "   Found $($enis.Count) network interface(s) attached" -ForegroundColor Yellow
        foreach ($eni in $enis) {
            Write-Host "      Detaching and deleting ENI: $eni" -ForegroundColor Cyan
            
            # Check if ENI is attached to an instance
            $attachment = aws ec2 describe-network-interfaces --network-interface-ids $eni --query "NetworkInterfaces[0].Attachment.AttachmentId" --output text 2>$null
            
            if ($attachment -and $attachment -ne "None") {
                Write-Host "         Detaching from instance..." -ForegroundColor Gray
                aws ec2 detach-network-interface --attachment-id $attachment --force 2>$null
                Start-Sleep -Seconds 5
            }
            
            # Delete the ENI
            Write-Host "         Deleting ENI..." -ForegroundColor Gray
            aws ec2 delete-network-interface --network-interface-id $eni 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "         ✅ Deleted ENI: $eni" -ForegroundColor Green
            } else {
                Write-Host "         ⚠️  Could not delete ENI: $eni" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ✅ No network interfaces attached" -ForegroundColor Green
    }
    
    # Check for Lambda functions using this security group
    Write-Host "   Checking for Lambda functions..." -ForegroundColor Gray
    $lambdas = aws lambda list-functions --query "Functions[?VpcConfig.SecurityGroupIds && contains(VpcConfig.SecurityGroupIds, '$sgId')].FunctionName" --output json 2>$null | ConvertFrom-Json
    
    if ($lambdas -and $lambdas.Count -gt 0) {
        Write-Host "   ⚠️  Found Lambda functions using this security group:" -ForegroundColor Yellow
        $lambdas | ForEach-Object { Write-Host "      - $_" -ForegroundColor White }
        Write-Host "   These will be removed when the stack is deleted" -ForegroundColor Gray
    }
}

# Function to find and delete resources in subnet
function Remove-SubnetDependencies {
    param($subnetId)
    
    Write-Host "`n🔍 Checking dependencies for Subnet: $subnetId" -ForegroundColor Yellow
    
    # Find network interfaces in this subnet
    $enis = aws ec2 describe-network-interfaces --filters "Name=subnet-id,Values=$subnetId" --query "NetworkInterfaces[].NetworkInterfaceId" --output json | ConvertFrom-Json
    
    if ($enis -and $enis.Count -gt 0) {
        Write-Host "   Found $($enis.Count) network interface(s) in subnet" -ForegroundColor Yellow
        foreach ($eni in $enis) {
            Write-Host "      Deleting ENI: $eni" -ForegroundColor Cyan
            
            # Check if ENI is attached
            $attachment = aws ec2 describe-network-interfaces --network-interface-ids $eni --query "NetworkInterfaces[0].Attachment.AttachmentId" --output text 2>$null
            
            if ($attachment -and $attachment -ne "None") {
                Write-Host "         Detaching..." -ForegroundColor Gray
                aws ec2 detach-network-interface --attachment-id $attachment --force 2>$null
                Start-Sleep -Seconds 5
            }
            
            aws ec2 delete-network-interface --network-interface-id $eni 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "         ✅ Deleted ENI: $eni" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "   ✅ No network interfaces in subnet" -ForegroundColor Green
    }
    
    # Check for NAT Gateways
    $natGateways = aws ec2 describe-nat-gateways --filter "Name=subnet-id,Values=$subnetId" "Name=state,Values=available,pending" --query "NatGateways[].NatGatewayId" --output json | ConvertFrom-Json
    
    if ($natGateways -and $natGateways.Count -gt 0) {
        Write-Host "   Found NAT Gateway(s) in subnet" -ForegroundColor Yellow
        foreach ($natGw in $natGateways) {
            Write-Host "      Deleting NAT Gateway: $natGw" -ForegroundColor Cyan
            aws ec2 delete-nat-gateway --nat-gateway-id $natGw 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "      ✅ NAT Gateway deletion initiated: $natGw" -ForegroundColor Green
            }
        }
        Write-Host "   ⏳ Waiting 30 seconds for NAT Gateway deletion..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    }
}

# Clean up Security Groups
Write-Host "`n🗑️  Processing Security Groups..." -ForegroundColor Cyan
foreach ($sg in $securityGroups) {
    Remove-SecurityGroupDependencies -sgId $sg
    
    # Try to delete the security group
    Write-Host "   Attempting to delete Security Group: $sg" -ForegroundColor Cyan
    aws ec2 delete-security-group --group-id $sg 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Deleted Security Group: $sg" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Security Group still has dependencies or will be deleted with stack: $sg" -ForegroundColor Yellow
    }
}

# Clean up Subnets
Write-Host "`n🗑️  Processing Subnets..." -ForegroundColor Cyan
foreach ($subnet in $subnets) {
    Remove-SubnetDependencies -subnetId $subnet
    
    # Try to delete the subnet
    Write-Host "   Attempting to delete Subnet: $subnet" -ForegroundColor Cyan
    aws ec2 delete-subnet --subnet-id $subnet 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Deleted Subnet: $subnet" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Subnet still has dependencies or will be deleted with stack: $subnet" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ VPC Resource cleanup complete!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Wait 2-3 minutes for AWS to process deletions" -ForegroundColor White
Write-Host "   2. Retry stack deletion: ./cleanup-all-stacks.ps1" -ForegroundColor White
Write-Host "   3. Or manually delete stacks from AWS Console" -ForegroundColor White
