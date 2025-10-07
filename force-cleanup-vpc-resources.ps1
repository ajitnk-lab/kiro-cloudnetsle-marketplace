#!/usr/bin/env pwsh

Write-Host "🔧 FORCE CLEANUP - VPC Resources" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Function to get all VPCs created by marketplace stacks
function Get-MarketplaceVPCs {
    Write-Host "`n🔍 Finding Marketplace VPCs..." -ForegroundColor Yellow
    
    $vpcs = aws ec2 describe-vpcs --filters "Name=tag:Project,Values=MarketplacePlatform" --query "Vpcs[].VpcId" --output json | ConvertFrom-Json
    
    if (-not $vpcs) {
        # Try finding by name pattern
        $vpcs = aws ec2 describe-vpcs --query "Vpcs[?contains(Tags[?Key=='Name'].Value | [0], 'Marketplace')].VpcId" --output json | ConvertFrom-Json
    }
    
    return $vpcs
}

# Function to delete all resources in a VPC
function Remove-VPCResources {
    param($vpcId)
    
    Write-Host "`n🗑️  Cleaning VPC: $vpcId" -ForegroundColor Yellow
    
    # 1. Delete NAT Gateways first (they take time)
    Write-Host "   Deleting NAT Gateways..." -ForegroundColor Cyan
    $natGateways = aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpcId" "Name=state,Values=available" --query "NatGateways[].NatGatewayId" --output json | ConvertFrom-Json
    foreach ($natGw in $natGateways) {
        Write-Host "      Deleting NAT Gateway: $natGw" -ForegroundColor Gray
        aws ec2 delete-nat-gateway --nat-gateway-id $natGw 2>$null
    }
    
    if ($natGateways -and $natGateways.Count -gt 0) {
        Write-Host "      Waiting for NAT Gateways to delete (60 seconds)..." -ForegroundColor Gray
        Start-Sleep -Seconds 60
    }
    
    # 2. Release Elastic IPs
    Write-Host "   Releasing Elastic IPs..." -ForegroundColor Cyan
    $eips = aws ec2 describe-addresses --filters "Name=domain,Values=vpc" --query "Addresses[?NetworkInterfaceId==null].AllocationId" --output json | ConvertFrom-Json
    foreach ($eip in $eips) {
        Write-Host "      Releasing EIP: $eip" -ForegroundColor Gray
        aws ec2 release-address --allocation-id $eip 2>$null
    }
    
    # 3. Delete Network Interfaces
    Write-Host "   Deleting Network Interfaces..." -ForegroundColor Cyan
    $enis = aws ec2 describe-network-interfaces --filters "Name=vpc-id,Values=$vpcId" --query "NetworkInterfaces[].NetworkInterfaceId" --output json | ConvertFrom-Json
    foreach ($eni in $enis) {
        Write-Host "      Detaching and deleting ENI: $eni" -ForegroundColor Gray
        # Try to detach first
        $attachment = aws ec2 describe-network-interfaces --network-interface-ids $eni --query "NetworkInterfaces[0].Attachment.AttachmentId" --output text 2>$null
        if ($attachment -and $attachment -ne "None") {
            aws ec2 detach-network-interface --attachment-id $attachment --force 2>$null
            Start-Sleep -Seconds 5
        }
        aws ec2 delete-network-interface --network-interface-id $eni 2>$null
    }
    
    # 4. Delete RDS instances in this VPC
    Write-Host "   Checking for RDS instances..." -ForegroundColor Cyan
    $rdsInstances = aws rds describe-db-instances --query "DBInstances[?DBSubnetGroup.VpcId=='$vpcId'].DBInstanceIdentifier" --output json 2>$null | ConvertFrom-Json
    foreach ($rds in $rdsInstances) {
        Write-Host "      Deleting RDS instance: $rds" -ForegroundColor Gray
        aws rds delete-db-instance --db-instance-identifier $rds --skip-final-snapshot --delete-automated-backups 2>$null
    }
    
    if ($rdsInstances -and $rdsInstances.Count -gt 0) {
        Write-Host "      Waiting for RDS deletion (30 seconds)..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    }
    
    # 5. Delete Security Groups (except default)
    Write-Host "   Deleting Security Groups..." -ForegroundColor Cyan
    $securityGroups = aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output json | ConvertFrom-Json
    
    # First pass - remove all ingress/egress rules
    foreach ($sg in $securityGroups) {
        Write-Host "      Removing rules from SG: $sg" -ForegroundColor Gray
        aws ec2 revoke-security-group-ingress --group-id $sg --ip-permissions "$(aws ec2 describe-security-groups --group-ids $sg --query 'SecurityGroups[0].IpPermissions' --output json)" 2>$null
        aws ec2 revoke-security-group-egress --group-id $sg --ip-permissions "$(aws ec2 describe-security-groups --group-ids $sg --query 'SecurityGroups[0].IpPermissionsEgress' --output json)" 2>$null
    }
    
    # Second pass - delete security groups
    foreach ($sg in $securityGroups) {
        Write-Host "      Deleting SG: $sg" -ForegroundColor Gray
        aws ec2 delete-security-group --group-id $sg 2>$null
    }
    
    # 6. Delete Subnets
    Write-Host "   Deleting Subnets..." -ForegroundColor Cyan
    $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[].SubnetId" --output json | ConvertFrom-Json
    foreach ($subnet in $subnets) {
        Write-Host "      Deleting Subnet: $subnet" -ForegroundColor Gray
        aws ec2 delete-subnet --subnet-id $subnet 2>$null
    }
    
    # 7. Detach and delete Internet Gateways
    Write-Host "   Deleting Internet Gateways..." -ForegroundColor Cyan
    $igws = aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpcId" --query "InternetGateways[].InternetGatewayId" --output json | ConvertFrom-Json
    foreach ($igw in $igws) {
        Write-Host "      Detaching and deleting IGW: $igw" -ForegroundColor Gray
        aws ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $vpcId 2>$null
        aws ec2 delete-internet-gateway --internet-gateway-id $igw 2>$null
    }
    
    # 8. Delete Route Tables (except main)
    Write-Host "   Deleting Route Tables..." -ForegroundColor Cyan
    $routeTables = aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpcId" --query "RouteTables[?Associations[0].Main==\`false\`].RouteTableId" --output json | ConvertFrom-Json
    foreach ($rt in $routeTables) {
        Write-Host "      Deleting Route Table: $rt" -ForegroundColor Gray
        aws ec2 delete-route-table --route-table-id $rt 2>$null
    }
    
    # 9. Finally, delete the VPC
    Write-Host "   Deleting VPC: $vpcId" -ForegroundColor Cyan
    aws ec2 delete-vpc --vpc-id $vpcId 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ VPC $vpcId deleted successfully" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  VPC $vpcId may still have dependencies" -ForegroundColor Yellow
    }
}

# Main execution
$vpcs = Get-MarketplaceVPCs

if ($vpcs -and $vpcs.Count -gt 0) {
    Write-Host "Found $($vpcs.Count) Marketplace VPC(s)" -ForegroundColor Yellow
    foreach ($vpc in $vpcs) {
        Remove-VPCResources -vpcId $vpc
    }
} else {
    Write-Host "✅ No Marketplace VPCs found" -ForegroundColor Green
}

Write-Host "`n✅ VPC cleanup complete!" -ForegroundColor Green
