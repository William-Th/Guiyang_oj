$BASE_URL = "http://localhost:3001/api"

Write-Host "============================================================"
Write-Host "Question Bank Redesign - Quick API Test"
Write-Host "============================================================"

# Test 1: Login as teacher
Write-Host "`n[TEST 1] Login as teacher..."
$loginData = @{
    username = "teacher01"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
        -Method Post `
        -Body $loginData `
        -ContentType "application/json"

    $teacherToken = $loginResponse.token
    Write-Host "✅ Teacher login successful" -ForegroundColor Green
    Write-Host "   Token: $($teacherToken.Substring(0, 50))..."
} catch {
    Write-Host "❌ Teacher login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Create draft
Write-Host "`n[TEST 2] Create a draft question..."
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$draftData = @{
    type = "single_choice"
    subject = "数学"
    grade = "三年级"
    content = "TEST-$timestamp 3 + 5 = ?"
    options = '["6","7","8","9"]'
    correct_answer = "8"
    difficulty = "easy"
    level = "K1"
    points = 5
    explanation = "基础测试"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $teacherToken"
        "Content-Type" = "application/json"
    }

    $createResponse = Invoke-RestMethod -Uri "$BASE_URL/question-drafts" `
        -Method Post `
        -Headers $headers `
        -Body $draftData

    $draftId = $createResponse.data.id
    Write-Host "✅ Draft created successfully, ID: $draftId" -ForegroundColor Green
    Write-Host "   Content: $($createResponse.data.content)"
} catch {
    Write-Host "❌ Create draft failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)"
    exit 1
}

# Test 3: Get my drafts
Write-Host "`n[TEST 3] Get my drafts list..."
try {
    $headers = @{
        "Authorization" = "Bearer $teacherToken"
    }

    $draftsResponse = Invoke-RestMethod -Uri "$BASE_URL/question-drafts?limit=10" `
        -Method Get `
        -Headers $headers

    Write-Host "✅ Got drafts list, total: $($draftsResponse.meta.total)" -ForegroundColor Green
    Write-Host "   Retrieved: $($draftsResponse.data.Count) drafts"
} catch {
    Write-Host "❌ Get drafts failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get draft details
Write-Host "`n[TEST 4] Get draft details..."
try {
    $headers = @{
        "Authorization" = "Bearer $teacherToken"
    }

    $detailResponse = Invoke-RestMethod -Uri "$BASE_URL/question-drafts/$draftId" `
        -Method Get `
        -Headers $headers

    Write-Host "✅ Got draft details" -ForegroundColor Green
    Write-Host "   ID: $($detailResponse.data.id)"
    Write-Host "   Publish count: $($detailResponse.data.publish_count)"
} catch {
    Write-Host "❌ Get draft details failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Publish to school scope
Write-Host "`n[TEST 5] Publish draft to school scope..."
$publishData = @{
    scope = "practice_school_1"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $teacherToken"
        "Content-Type" = "application/json"
    }

    $publishResponse = Invoke-RestMethod -Uri "$BASE_URL/question-drafts/$draftId/publish" `
        -Method Post `
        -Headers $headers `
        -Body $publishData

    Write-Host "✅ Published successfully" -ForegroundColor Green
    Write-Host "   Publication ID: $($publishResponse.data.id)"
    Write-Host "   Status: $($publishResponse.data.status)"
    Write-Host "   Scope: $($publishResponse.data.scope)"
} catch {
    Write-Host "⚠️  Publish result: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# Test 6: Get publications
Write-Host "`n[TEST 6] Get publication records..."
try {
    $headers = @{
        "Authorization" = "Bearer $teacherToken"
    }

    $pubsResponse = Invoke-RestMethod -Uri "$BASE_URL/question-drafts/$draftId/publications" `
        -Method Get `
        -Headers $headers

    Write-Host "✅ Got publication records, count: $($pubsResponse.meta.count)" -ForegroundColor Green
    if ($pubsResponse.data.Count -gt 0) {
        Write-Host "   Scopes:" ($pubsResponse.data | ForEach-Object { $_.scope }) -join ", "
    }
} catch {
    Write-Host "❌ Get publications failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Login as admin and test district filtering
Write-Host "`n[TEST 7] Login as admin for district filter test..."
$adminLoginData = @{
    username = "admin"
    password = "password123"
} | ConvertTo-Json

try {
    $adminLoginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
        -Method Post `
        -Body $adminLoginData `
        -ContentType "application/json"

    $adminToken = $adminLoginResponse.token
    Write-Host "✅ Admin login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Admin login failed" -ForegroundColor Red
}

# Test 8: Query district questions with filter (admin)
Write-Host "`n[TEST 8] Query district questions (admin with district filter)..."
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }

    $uri = $BASE_URL + "/question-bank/bank" + "?scope=practice_district" + "&district_code=YY" + "&limit=5"
    $bankResponse = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers

    Write-Host "✅ Got question bank (district filtered)" -ForegroundColor Green
    Write-Host "   Total: $($bankResponse.meta.total)"
    Write-Host "   District filter: $($bankResponse.meta.district_code_filter)"
    Write-Host "   Retrieved: $($bankResponse.data.Count) questions"
} catch {
    Write-Host "⚠️  Query question bank: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n============================================================"
Write-Host "API Tests Completed"
Write-Host "============================================================"
