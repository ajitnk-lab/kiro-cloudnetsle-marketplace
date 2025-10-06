# Test script for Marketplace API endpoints
$API_BASE = "https://169pcvt64k.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "Testing Marketplace API Endpoints..." -ForegroundColor Green
Write-Host "API Base URL: $API_BASE" -ForegroundColor Yellow

# Test 1: Health check (if available)
Write-Host "`n1. Testing Health Check..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Health check passed" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get Solutions (Catalog)
Write-Host "`n2. Testing Get Solutions..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/solutions" -Method GET -ErrorAction Stop
    Write-Host "✅ Get solutions passed" -ForegroundColor Green
    Write-Host "Found $($response.solutions.Count) solutions" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Get solutions failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Get Categories
Write-Host "`n3. Testing Get Categories..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/categories" -Method GET -ErrorAction Stop
    Write-Host "✅ Get categories passed" -ForegroundColor Green
    Write-Host "Found $($response.Count) categories" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Get categories failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test Registration endpoint (without actually registering)
Write-Host "`n4. Testing Registration Endpoint Structure..." -ForegroundColor Cyan
try {
    # This should fail with validation error, but confirms endpoint exists
    $body = @{} | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$API_BASE/auth/register" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Registration endpoint exists (validation error expected)" -ForegroundColor Green
    } else {
        Write-Host "❌ Registration endpoint error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🌐 Frontend URL: https://dddzq9ul1ygr3.cloudfront.net" -ForegroundColor Magenta
Write-Host "📝 You can now test the UI by visiting the above URL" -ForegroundColor Yellow