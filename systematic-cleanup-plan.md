# Systematic Cleanup Plan

## Problem Analysis
SecurityGroup `sg-0e739a50ba2f6c764` cannot be deleted because:
- Network Interface `eni-097b6cb3ffa61ecf6` is attached and "in-use"
- This ENI is blocking the SecurityGroup deletion
- SecurityGroup is blocking the Subnet deletion
- Subnet is blocking the VPC deletion
- VPC resources are blocking the CloudFormation stack deletion

## Dependency Chain (Bottom to Top)
```
CloudFormation Stack (MarketplaceStack)
    └── VPC (vpc-0b996aeb2043e6c52)
        └── Subnet (subnet-020b71bf8f92eb358)
            └── SecurityGroup (sg-0e739a50ba2f6c764)
                └── Network Interface (eni-097b6cb3ffa61ecf6) ← START HERE
```

## Step-by-Step Strategy

### Step 1: Identify what owns the Network Interface
- Check if it's attached to RDS, Lambda, or other service
- Find the attachment details

### Step 2: Detach/Delete the Network Interface owner
- If RDS: Delete the RDS instance
- If Lambda: Delete the Lambda function
- If standalone: Force detach and delete

### Step 3: Delete the Network Interface
- Once detached, delete the ENI

### Step 4: Delete the SecurityGroup
- Should now succeed without dependencies

### Step 5: Delete the Subnet
- Should now succeed without dependencies

### Step 6: Let CloudFormation complete
- Stack deletion should proceed automatically

## Expected Timeline
- Each step: 2-5 minutes
- Total: 15-30 minutes maximum
