# Seed sample data for testing
$API_BASE = "https://169pcvt64k.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "Seeding sample data for Marketplace..." -ForegroundColor Green

# Sample solutions data
$solutions = @(
    @{
        name = "CRM Pro"
        description = "Advanced Customer Relationship Management system with AI-powered insights"
        category = "Business Software"
        pricing = @{
            model = "subscription"
            amount = 99
            billingCycle = "month"
        }
        tags = @("CRM", "Sales", "AI", "Analytics")
        assets = @{
            images = @("https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=CRM+Pro")
            documents = @()
        }
        partnerId = "partner-001"
        status = "active"
    },
    @{
        name = "Inventory Master"
        description = "Complete inventory management solution for small to medium businesses"
        category = "Business Software"
        pricing = @{
            model = "upfront"
            amount = 299
        }
        tags = @("Inventory", "Management", "SMB")
        assets = @{
            images = @("https://via.placeholder.com/400x300/059669/FFFFFF?text=Inventory+Master")
            documents = @()
        }
        partnerId = "partner-002"
        status = "active"
    },
    @{
        name = "DevOps Toolkit"
        description = "Comprehensive DevOps automation and monitoring platform"
        category = "Developer Tools"
        pricing = @{
            model = "subscription"
            amount = 149
            billingCycle = "month"
        }
        tags = @("DevOps", "Automation", "Monitoring", "CI/CD")
        assets = @{
            images = @("https://via.placeholder.com/400x300/DC2626/FFFFFF?text=DevOps+Toolkit")
            documents = @()
        }
        partnerId = "partner-003"
        status = "active"
    },
    @{
        name = "Analytics Dashboard"
        description = "Real-time business analytics and reporting dashboard"
        category = "Analytics"
        pricing = @{
            model = "subscription"
            amount = 79
            billingCycle = "month"
        }
        tags = @("Analytics", "Dashboard", "Reporting", "Real-time")
        assets = @{
            images = @("https://via.placeholder.com/400x300/7C3AED/FFFFFF?text=Analytics+Dashboard")
            documents = @()
        }
        partnerId = "partner-004"
        status = "active"
    }
)

Write-Host "Adding sample solutions..." -ForegroundColor Cyan

foreach ($solution in $solutions) {
    try {
        $body = $solution | ConvertTo-Json -Depth 10
        Write-Host "Adding solution: $($solution.name)" -ForegroundColor Yellow
        
        # Note: This might fail due to authentication requirements
        # We'll need to implement proper authentication flow
        $response = Invoke-RestMethod -Uri "$API_BASE/solutions" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "✅ Added: $($solution.name)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to add $($solution.name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n📝 Note: If solutions failed to add due to authentication, you can add them through the UI after registering as a partner." -ForegroundColor Yellow
Write-Host "🌐 Visit: https://dddzq9ul1ygr3.cloudfront.net" -ForegroundColor Magenta