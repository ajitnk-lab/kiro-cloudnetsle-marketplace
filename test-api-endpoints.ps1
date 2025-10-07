#!/usr/bin/env pwsh

Write-Host "🧪 API ENDPOINT TESTING" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

$API_BASE = "https://ug63mrbfol.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "🔗 API Base URL: $API_BASE" -ForegroundColor Yellow
Write-Host ""

# Test 1: Catalog endpoint (public)
Write-Host "Test 1: GET /catalog (Public endpoint)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/catalog" -Method GET -TimeoutSec 30
    Write-Host "✅ Catalog endpoint working" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Catalog endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Categories endpoint (public)
Write-Host "Test 2: GET /catalog/categories (Public endpoint)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/catalog/categories" -Method GET -TimeoutSec 30
    Write-Host "✅ Categories endpoint working" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Categories endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Search endpoint (public)
Write-Host "Test 3: GET /catalog/search (Public endpoint)" -ForegroundColor Magenta
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/catalog/search?q=test" -Method GET -TimeoutSec 30
    Write-Host "✅ Search endpoint working" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Search endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: User registration (public)
Write-Host "Test 4: POST /auth/register (Public endpoint)" -ForegroundColor Magenta
$testUser = @{
    email = "test-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "TestPass123!"
    name = "Test User"
    role = "customer"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/auth/register" -Method POST -Body $testUser -ContentType "application/json" -TimeoutSec 30
    Write-Host "✅ Registration endpoint working" -ForegroundColor Green
    Write-Host "   Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Registration endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorBody)
        $errorText = $reader.ReadToEnd()
        Write-Host "   Error details: $errorText" -ForegroundColor Gray
    }
}
Write-Host ""

# Test 5: API Gateway health
Write-Host "Test 5: API Gateway Health Check" -ForegroundColor Magenta
try {
    $response = Invoke-WebRequest -Uri $API_BASE -Method GET -TimeoutSec 10
    Write-Host "✅ API Gateway responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ API Gateway health check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "🏁 API Testing Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If tests pass: Run seed-sample-data.ps1" -ForegroundColor White
Write-Host "2. If tests fail: Check Lambda function logs in CloudWatch" -ForegroundColor White
Write-Host "3. Deploy frontend after seeding data" -ForegroundColor White