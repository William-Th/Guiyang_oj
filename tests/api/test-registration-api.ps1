# Test Assessment Registration API
$BaseUrl = "http://localhost:3001/api"

Write-Host "=== Testing Assessment Registration API ===" -ForegroundColor Cyan

# Step 1: Login as student
Write-Host "`n[1] Logging in as student..." -ForegroundColor Yellow
$loginBody = @{
    username = "13800138003"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginResponse.token
Write-Host "Login successful! User: $($loginResponse.user.realName)" -ForegroundColor Green

# Step 2: Get my registrations
Write-Host "`n[2] Getting my registrations..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $registrations = Invoke-RestMethod -Uri "$BaseUrl/assessments/my-registrations" -Method Get -Headers $headers
    Write-Host "My registrations count: $($registrations.data.Count)" -ForegroundColor Green
    if ($registrations.data.Count -gt 0) {
        $registrations.data | ForEach-Object {
            Write-Host "  - Activity: $($_.activity_title), Status: $($_.status)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Step 3: Get available assessments
Write-Host "`n[3] Getting available assessments..." -ForegroundColor Yellow
try {
    $assessments = Invoke-RestMethod -Uri "$BaseUrl/activities/assessments" -Method Get -Headers $headers
    Write-Host "Available assessments: $($assessments.assessments.Count)" -ForegroundColor Green
    if ($assessments.assessments.Count -gt 0) {
        $assessments.assessments | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - [$($_.id)] $($_.title) - Level: $($_.ability_level)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
