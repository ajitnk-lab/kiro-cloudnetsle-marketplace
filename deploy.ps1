# PowerShell deployment script for Windows

Write-Host "🚀 Deploying Marketplace Platform..." -ForegroundColor Green

# Deploy backend infrastructure
Write-Host "📦 Deploying backend infrastructure..." -ForegroundColor Yellow
Set-Location packages/infrastructure
npm install
npm run deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
    exit 1
}

# Build and deploy frontend
Write-Host "🎨 Building and deploying frontend..." -ForegroundColor Yellow
Set-Location ../frontend
npm install
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend built successfully!" -ForegroundColor Green
    
    # Deploy to S3
    Write-Host "📤 Uploading to S3..." -ForegroundColor Yellow
    npm run deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
        
        # Invalidate CloudFront cache
        Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Yellow
        npm run invalidate
        
        Write-Host "🎉 Deployment complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Deployment Summary:" -ForegroundColor Cyan
        Write-Host "Backend API: Check AWS CloudFormation outputs" -ForegroundColor White
        Write-Host "Frontend URL: Check AWS CloudFormation outputs" -ForegroundColor White
        Write-Host ""
        Write-Host "🧪 Testing Instructions:" -ForegroundColor Cyan
        Write-Host "1. Visit the Frontend URL from CloudFormation outputs" -ForegroundColor White
        Write-Host "2. Test user registration and login" -ForegroundColor White
        Write-Host "3. Test partner application workflow" -ForegroundColor White
        Write-Host "4. Test solution catalog functionality" -ForegroundColor White
    } else {
        Write-Host "❌ Frontend deployment failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}