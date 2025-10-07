# Add Sample Solutions Script
Write-Host "🌱 ADDING SAMPLE SOLUTIONS TO DYNAMODB" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$solutionsTable = "marketplace-solutions-1759832846643"

# Sample solutions data
$solutions = @(
    @{
        solutionId = "sol-001"
        partnerId = "partner-001"
        partnerName = "TechSolutions Inc"
        name = "CRM Pro Suite"
        description = "Complete customer relationship management solution with advanced analytics and automation features."
        category = "Business Software"
        tags = @("CRM", "Sales", "Analytics", "Automation")
        pricing = @{
            model = "subscription"
            amount = 99
            currency = "INR"
            billingCycle = "month"
        }
        assets = @{
            images = @("https://example.com/crm-screenshot1.jpg")
            documents = @()
        }
        features = @("Lead Management", "Sales Pipeline", "Customer Analytics", "Email Integration")
        requirements = "Windows 10+, 4GB RAM, Internet connection"
        supportInfo = "24/7 email support, online documentation"
        status = "approved"
        createdAt = "2025-10-07T10:00:00Z"
        updatedAt = "2025-10-07T10:00:00Z"
    },
    @{
        solutionId = "sol-002"
        partnerId = "partner-002"
        partnerName = "BusinessFlow Solutions"
        name = "Inventory Master"
        description = "Advanced inventory management system with real-time tracking and automated reordering."
        category = "Business Software"
        tags = @("Inventory", "Tracking", "Automation", "Reports")
        pricing = @{
            model = "upfront"
            amount = 299
            currency = "INR"
        }
        assets = @{
            images = @("https://example.com/inventory-screenshot1.jpg")
            documents = @()
        }
        features = @("Real-time Tracking", "Automated Reordering", "Multi-location Support", "Barcode Scanning")
        requirements = "Any modern web browser, Internet connection"
        supportInfo = "Email support, video tutorials"
        status = "approved"
        createdAt = "2025-10-07T10:15:00Z"
        updatedAt = "2025-10-07T10:15:00Z"
    },
    @{
        solutionId = "sol-003"
        partnerId = "partner-003"
        partnerName = "CloudOps Technologies"
        name = "DevOps Toolkit Pro"
        description = "Comprehensive DevOps automation platform with CI/CD pipelines and monitoring."
        category = "Development Tools"
        tags = @("DevOps", "CI/CD", "Automation", "Monitoring")
        pricing = @{
            model = "subscription"
            amount = 199
            currency = "INR"
            billingCycle = "month"
        }
        assets = @{
            images = @("https://example.com/devops-screenshot1.jpg")
            documents = @()
        }
        features = @("CI/CD Pipelines", "Container Management", "Performance Monitoring", "Automated Testing")
        requirements = "Docker, Kubernetes knowledge recommended"
        supportInfo = "Slack support, comprehensive documentation"
        status = "approved"
        createdAt = "2025-10-07T10:30:00Z"
        updatedAt = "2025-10-07T10:30:00Z"
    }
)

Write-Host "Adding solutions to DynamoDB..." -ForegroundColor Yellow

foreach ($solution in $solutions) {
    try {
        $jsonData = $solution | ConvertTo-Json -Depth 10 -Compress
        
        # Create the DynamoDB item format
        $item = @{}
        foreach ($key in $solution.Keys) {
            $value = $solution[$key]
            if ($value -is [string]) {
                $item[$key] = @{ S = $value }
            } elseif ($value -is [int] -or $value -is [double]) {
                $item[$key] = @{ N = $value.ToString() }
            } elseif ($value -is [array]) {
                $item[$key] = @{ SS = $value }
            } elseif ($value -is [hashtable]) {
                $item[$key] = @{ S = ($value | ConvertTo-Json -Compress) }
            }
        }
        
        $itemJson = $item | ConvertTo-Json -Depth 10 -Compress
        
        Write-Host "Adding solution: $($solution.name)..." -ForegroundColor Gray
        
        aws dynamodb put-item --table-name $solutionsTable --item $itemJson
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Added: $($solution.name)" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to add: $($solution.name)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ Error adding $($solution.name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🧪 Testing catalog API..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "https://ug63mrbfol.execute-api.us-east-1.amazonaws.com/prod/catalog" -Method GET
    Write-Host "✅ Catalog now has $($response.count) solutions!" -ForegroundColor Green
    
    if ($response.solutions) {
        Write-Host "📋 Solutions added:" -ForegroundColor Cyan
        foreach ($sol in $response.solutions) {
            Write-Host "  - $($sol.name) ($($sol.category)) - ₹$($sol.pricing.amount)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "❌ API test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Sample solutions setup complete!" -ForegroundColor Green